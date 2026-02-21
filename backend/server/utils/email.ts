// ============================================
// Scribble Clone — Email Utility (OTP emails)
// ============================================

import nodemailer from "nodemailer";
import { env } from "../config/env";
import type { OtpPurpose } from "../models/Otp";

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

const SUBJECT_MAP: Record<OtpPurpose, string> = {
    "email-verify": "Verify your email — Scribble",
    "forgot-password": "Reset your password — Scribble",
    "device-revoke": "Device revocation code — Scribble",
};

const DESCRIPTION_MAP: Record<OtpPurpose, string> = {
    "email-verify": "to verify your email address",
    "forgot-password": "to reset your password",
    "device-revoke": "to revoke a device session",
};

export async function sendOtpEmail(
    to: string,
    code: string,
    purpose: OtpPurpose
): Promise<void> {
    const subject = SUBJECT_MAP[purpose];
    const description = DESCRIPTION_MAP[purpose];

    const html = `
    <div style="font-family:'Outfit','Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;background:#0f0f1a;color:#e8e8f0;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <span style="font-size:32px;">🎨</span>
        <h1 style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#7c3aed,#06d6a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0 0 0;">Scribble</h1>
      </div>
      <p style="color:#a0a0b8;font-size:15px;line-height:1.6;margin-bottom:24px;">
        Use the following code ${description}. This code expires in <strong style="color:#e8e8f0;">10 minutes</strong>.
      </p>
      <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#a78bfa;font-family:monospace;">${code}</span>
      </div>
      <p style="color:#6c6c80;font-size:13px;line-height:1.5;">
        If you didn't request this code, you can safely ignore this email. Do not share this code with anyone.
      </p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;" />
      <p style="color:#6c6c80;font-size:12px;text-align:center;">
        &copy; ${new Date().getFullYear()} Scribble. Draw, Guess & Have Fun!
      </p>
    </div>
  `;

    await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
    });
}
