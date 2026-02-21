// ============================================
// Scribble Clone — JWT & Refresh Token Utilities
// ============================================

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";

// ------- Access Token (short-lived, 15 min) -------

interface AccessTokenPayload {
    sub: string; // userId
    sid: string; // sessionId
}

export function signAccessToken(userId: string, sessionId: string): string {
    return jwt.sign({ sub: userId, sid: sessionId }, env.JWT_SECRET, {
        expiresIn: "15m",
    });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

// ------- Temporary MFA Token (5 min) -------

interface TempMfaPayload {
    sub: string;
    purpose: "mfa";
}

export function signTempMfaToken(userId: string): string {
    return jwt.sign({ sub: userId, purpose: "mfa" }, env.JWT_SECRET, {
        expiresIn: "5m",
    });
}

export function verifyTempMfaToken(token: string): TempMfaPayload {
    const payload = jwt.verify(token, env.JWT_SECRET) as TempMfaPayload;
    if (payload.purpose !== "mfa") {
        throw new Error("Invalid token purpose");
    }
    return payload;
}

// ------- Refresh Token (random, stored hashed in DB) -------

export function generateRefreshToken(): string {
    return crypto.randomBytes(64).toString("hex");
}

export function hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}
