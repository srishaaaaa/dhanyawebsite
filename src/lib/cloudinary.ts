import "server-only";
import { createHash } from "node:crypto";

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/** Signs upload params per Cloudinary's spec. The API secret never leaves the server. */
export function signUploadParams(params: Record<string, string | number>) {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + process.env.CLOUDINARY_API_SECRET).digest("hex");
  return { ...params, signature, api_key: process.env.CLOUDINARY_API_KEY!, cloud_name: process.env.CLOUDINARY_CLOUD_NAME! };
}
