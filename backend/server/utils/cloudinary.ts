// ============================================
// Scribble Clone — Cloudinary Avatar Upload
// ============================================

import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

interface UploadResult {
    url: string;
    publicId: string;
}

export async function uploadAvatar(
    fileBuffer: Buffer,
    userId: string
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "scribble-avatars",
                public_id: `avatar_${userId}`,
                overwrite: true,
                resource_type: "image",
                transformation: [
                    {
                        width: 256,
                        height: 256,
                        crop: "fill",
                        gravity: "face",
                    },
                ],
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error("Upload failed"));
                    return;
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );
        uploadStream.end(fileBuffer);
    });
}

export async function deleteAvatar(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
