// ============================================
// Scribble Clone — Device Info Extraction
// ============================================

import { UAParser } from "ua-parser-js";
import type { Request } from "express";

export interface DeviceInfo {
    browser: string;
    os: string;
    ip: string;
}

export function extractDevice(req: Request): DeviceInfo {
    const ua = req.headers["user-agent"] || "";
    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    return {
        browser: browser.name
            ? `${browser.name} ${browser.version || ""}`.trim()
            : "Unknown Browser",
        os: os.name
            ? `${os.name} ${os.version || ""}`.trim()
            : "Unknown OS",
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
            || req.socket.remoteAddress
            || "Unknown",
    };
}
