// ============================================
// Scribble Clone — Game History Model (Persistence)
// ============================================

import mongoose, { Schema, type Document } from "mongoose";

export interface IGameHistoryPlayer {
    userId: mongoose.Types.ObjectId;
    username: string;
    score: number;
    rank: number;
}

export interface IGameHistory extends Document {
    _id: mongoose.Types.ObjectId;
    roomId: string;
    gameType: string;
    players: IGameHistoryPlayer[];
    winner: {
        userId: mongoose.Types.ObjectId;
        username: string;
    };
    totalRounds: number;
    createdAt: Date;
}

const gameHistorySchema = new Schema<IGameHistory>(
    {
        roomId: {
            type: String,
            required: true,
            index: true,
        },
        gameType: {
            type: String,
            default: "doodle",
        },
        players: [
            {
                userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
                username: { type: String, required: true },
                score: { type: Number, required: true },
                rank: { type: Number, required: true },
            },
        ],
        winner: {
            userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
            username: { type: String, required: true },
        },
        totalRounds: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for querying a user's game history
gameHistorySchema.index({ "players.userId": 1 });
gameHistorySchema.index({ createdAt: -1 });

export const GameHistory = mongoose.model<IGameHistory>("GameHistory", gameHistorySchema);
