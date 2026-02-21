// ============================================
// One-time Migration: Add username to existing users
// Run with: bun run server/migrate-usernames.ts
// ============================================

import mongoose from "mongoose";
import { env } from "./config/env";
import { User } from "./models/User";

async function migrate() {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const usersWithoutUsername = await User.find({
        $or: [{ username: null }, { username: { $exists: false } }, { username: "" }],
    });

    console.log(`Found ${usersWithoutUsername.length} user(s) without a username`);

    const taken = new Set<string>();
    // Pre-load all existing usernames
    const allUsers = await User.find({ username: { $exists: true, $ne: null, $ne: "" } }).select("username").lean();
    for (const u of allUsers) {
        if (u.username) taken.add(u.username.toLowerCase());
    }

    for (const user of usersWithoutUsername) {
        // Derive base username from email prefix
        let base = user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/_{2,}/g, "_")
            .replace(/^_|_$/g, "")
            .slice(0, 17); // leave room for suffix

        if (base.length < 3) base = base.padEnd(3, "_");

        let candidate = base;
        let suffix = 1;
        while (taken.has(candidate)) {
            candidate = `${base}${suffix}`;
            suffix++;
        }

        taken.add(candidate);
        user.username = candidate;
        await user.save();
        console.log(`  ${user.email} → @${candidate}`);
    }

    console.log("✅ Migration complete");
    await mongoose.disconnect();
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
