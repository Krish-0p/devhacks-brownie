// ============================================
// Scribble Clone — MFA Routes
// ============================================

import { Router, type Request, type Response } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { z } from "zod";
import { User } from "../models/User";
import { encryptSecret, decryptSecret } from "../utils/crypto";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// All MFA routes require authentication
router.use(authenticate);

const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be 6 digits"),
});

// ───── POST /mfa/enable ─────

router.post("/enable", async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        if (user.mfaEnabled) {
            res.status(400).json({ error: "MFA is already enabled" });
            return;
        }

        const secret = speakeasy.generateSecret({
            name: user.email,
            issuer: "Scribble Game",
            length: 20,
        });

        user.mfaTempSecret = encryptSecret(secret.base32);
        await user.save();

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

        res.json({
            qrCode: qrCodeUrl,
            manualEntry: secret.base32,
            message: "Scan the QR code with your authenticator app, then verify with an OTP",
        });
    } catch (error) {
        console.error("MFA enable error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ───── POST /mfa/verify-enable ─────

router.post("/verify-enable", async (req: Request, res: Response) => {
    try {
        const parsed = otpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const { otp } = parsed.data;

        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        if (user.mfaEnabled) {
            res.status(400).json({ error: "MFA is already enabled" });
            return;
        }

        if (!user.mfaTempSecret) {
            res.status(400).json({ error: "No pending MFA setup. Call /mfa/enable first" });
            return;
        }

        const tempSecret = decryptSecret(user.mfaTempSecret);
        const isValid = speakeasy.totp.verify({
            secret: tempSecret,
            encoding: "base32",
            token: otp,
            window: 2,
        });

        if (!isValid) {
            res.status(401).json({ error: "Invalid OTP. Try again" });
            return;
        }

        user.mfaSecret = user.mfaTempSecret;
        user.mfaTempSecret = null;
        user.mfaEnabled = true;
        await user.save();

        res.json({
            message: "MFA enabled successfully",
            mfaEnabled: true,
        });
    } catch (error) {
        console.error("MFA verify-enable error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ───── POST /mfa/disable ─────

router.post("/disable", async (req: Request, res: Response) => {
    try {
        const parsed = otpSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const { otp } = parsed.data;

        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        if (!user.mfaEnabled || !user.mfaSecret) {
            res.status(400).json({ error: "MFA is not enabled" });
            return;
        }

        const secret = decryptSecret(user.mfaSecret);
        const isValid = speakeasy.totp.verify({
            secret: secret,
            encoding: "base32",
            token: otp,
            window: 2,
        });

        if (!isValid) {
            res.status(401).json({ error: "Invalid OTP" });
            return;
        }

        user.mfaEnabled = false;
        user.mfaSecret = null;
        user.mfaTempSecret = null;
        await user.save();

        res.json({
            message: "MFA disabled successfully",
            mfaEnabled: false,
        });
    } catch (error) {
        console.error("MFA disable error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
