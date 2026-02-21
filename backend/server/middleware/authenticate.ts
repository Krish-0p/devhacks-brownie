// ============================================
// Scribble Clone — Express Authentication Middleware
// ============================================

import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens";
import { Session } from "../models/Session";

// Extend Express Request to include auth info
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            sessionId?: string;
        }
    }
}

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        // Verify JWT
        const payload = verifyAccessToken(token);

        // Verify session is still active (not revoked)
        const session = await Session.findById(payload.sid);

        if (!session || session.revoked) {
            res.status(401).json({ error: "Session expired or revoked" });
            return;
        }

        // Check session belongs to user
        if (session.userId.toString() !== payload.sub) {
            res.status(401).json({ error: "Invalid session" });
            return;
        }

        // Update last active time (fire and forget)
        session.lastActiveAt = new Date();
        session.save().catch(() => {});

        // Attach to request
        req.userId = payload.sub;
        req.sessionId = payload.sid;

        next();
    } catch (error: any) {
        if (error.name === "TokenExpiredError") {
            res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
            return;
        }
        res.status(401).json({ error: "Invalid token" });
    }
}
