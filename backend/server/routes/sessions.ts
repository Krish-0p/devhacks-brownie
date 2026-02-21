// ============================================
// Scribble Clone — Session Management Routes
// ============================================

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import speakeasy from "speakeasy";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { authenticate } from "../middleware/authenticate";
import { createOtp, verifyOtp } from "../utils/otp";
import { sendOtpEmail } from "../utils/email";
import { decryptSecret } from "../utils/crypto";

// ───── /me router (mounted at /me) ─────

const meRouter = Router();
meRouter.use(authenticate);

// GET /me
meRouter.get("/", async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({ user: user.toJSON() });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /me/sessions
meRouter.get("/sessions", async (req: Request, res: Response) => {
    try {
        const sessions = await Session.find({
            userId: req.userId,
            revoked: false,
        })
            .sort({ lastActiveAt: -1 })
            .select("device createdAt lastActiveAt _id");

        const result = sessions.map((s) => ({
            id: s._id,
            device: s.device,
            createdAt: s.createdAt,
            lastActiveAt: s.lastActiveAt,
            isCurrent: s._id.toString() === req.sessionId,
        }));

        res.json({ sessions: result });
    } catch (error) {
        console.error("Get sessions error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ───── /sessions router (mounted at /sessions) ─────

const sessionsRouter = Router();
sessionsRouter.use(authenticate);

const revokeSchema = z.object({
    emailOtp: z.string().length(6).optional(),
    mfaCode: z.string().length(6).optional(),
}).refine(
    (data) => data.emailOtp || data.mfaCode,
    { message: "Either emailOtp or mfaCode is required" }
);

// POST /sessions/request-revoke-otp
sessionsRouter.post("/request-revoke-otp", async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const otpCode = await createOtp(user._id.toString(), "device-revoke");
        await sendOtpEmail(user.email, otpCode, "device-revoke");

        res.json({ message: "Verification code sent to your email" });
    } catch (error) {
        console.error("Request revoke OTP error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /sessions/:sessionId/revoke
sessionsRouter.post("/:sessionId/revoke", async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        if (sessionId === req.sessionId) {
            res.status(400).json({
                error: "Cannot revoke current session. Use /auth/logout instead",
            });
            return;
        }

        const parsed = revokeSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Verification required",
                details: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const { emailOtp, mfaCode } = parsed.data;

        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        let verified = false;

        if (emailOtp) {
            verified = await verifyOtp(user._id.toString(), "device-revoke", emailOtp);
        }

        if (!verified && mfaCode) {
            if (user.mfaEnabled && user.mfaSecret) {
                const decryptedSecret = decryptSecret(user.mfaSecret);
                verified = speakeasy.totp.verify({
                    secret: decryptedSecret,
                    encoding: "base32",
                    token: mfaCode,
                    window: 2,
                });
            }
        }

        if (!verified) {
            res.status(401).json({ error: "Invalid verification code" });
            return;
        }

        const session = await Session.findOneAndUpdate(
            {
                _id: sessionId,
                userId: req.userId,
                revoked: false,
            },
            { revoked: true },
            { new: true }
        );

        if (!session) {
            res.status(404).json({ error: "Session not found" });
            return;
        }

        res.json({
            message: "Session revoked successfully",
            sessionId: session._id,
        });
    } catch (error) {
        console.error("Revoke session error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export { meRouter, sessionsRouter };
