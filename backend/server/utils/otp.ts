// ============================================
// Scribble Clone — OTP Generation & Verification
// ============================================

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Otp, type OtpPurpose } from "../models/Otp";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

export function generateOtpCode(): string {
    const num = crypto.randomInt(100000, 999999 + 1);
    return num.toString();
}

export async function createOtp(
    userId: string,
    purpose: OtpPurpose
): Promise<string> {
    // Invalidate previous OTPs for same user + purpose
    await Otp.updateMany(
        { userId, purpose, used: false },
        { used: true }
    );

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);

    await Otp.create({
        userId,
        codeHash,
        purpose,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    return code;
}

export async function verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    code: string
): Promise<boolean> {
    const otps = await Otp.find({
        userId,
        purpose,
        used: false,
        expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    for (const otp of otps) {
        const isMatch = await bcrypt.compare(code, otp.codeHash);
        if (isMatch) {
            otp.used = true;
            await otp.save();
            return true;
        }
    }

    return false;
}
