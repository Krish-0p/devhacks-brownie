// ============================================
// Scribble Clone — OTP Model
// ============================================

import mongoose, { Schema, type Document } from "mongoose";

export type OtpPurpose = "email-verify" | "forgot-password" | "device-revoke";

export interface IOtp extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    codeHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
    used: boolean;
}

const otpSchema = new Schema<IOtp>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        codeHash: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: ["email-verify", "forgot-password", "device-revoke"],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 },
        },
        used: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

otpSchema.index({ userId: 1, purpose: 1, used: 1 });

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
