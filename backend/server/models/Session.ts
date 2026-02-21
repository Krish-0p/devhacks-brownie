// ============================================
// Scribble Clone — Session Model
// ============================================

import mongoose, { Schema, type Document } from "mongoose";

export interface ISession extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    device: {
        browser: string;
        os: string;
        ip: string;
    };
    refreshTokenHash: string;
    createdAt: Date;
    lastActiveAt: Date;
    revoked: boolean;
}

const sessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        device: {
            browser: { type: String, default: "Unknown" },
            os: { type: String, default: "Unknown" },
            ip: { type: String, default: "Unknown" },
        },
        refreshTokenHash: {
            type: String,
            required: true,
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
        revoked: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

sessionSchema.index({ userId: 1, revoked: 1 });

export const Session = mongoose.model<ISession>("Session", sessionSchema);
