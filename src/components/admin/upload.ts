"use client";
import { signUpload } from "@/app/admin/(panel)/products/actions";

const MAX_BYTES = 15 * 1024 * 1024;
const OK_TYPES = /^(image\/(jpeg|png|webp|avif|gif)|video\/(mp4|webm|quicktime)|model\/gltf-binary|application\/octet-stream)$/;

/** Direct, signed upload to Cloudinary with progress. Returns the secure URL. */
export async function uploadFile(file: File, onProgress: (pct: number) => void, kind: "product" | "content" = "product"): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  if (!OK_TYPES.test(file.type || "application/octet-stream")) throw new Error(`${file.name}: use JPG, PNG, WebP, AVIF, MP4 or GLB.`);
  const signed = await signUpload(kind);
  if (!signed.ok) throw new Error(signed.error);
  const { cloud_name, ...fields } = signed as unknown as Record<string, string> & { ok: true };
  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(fields)) if (k !== "ok") form.append(k, String(v));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url);
        else reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status}).`));
      } catch { reject(new Error("Upload failed: unexpected response.")); }
    };
    xhr.onerror = () => reject(new Error("Upload failed: check your connection and try again."));
    xhr.send(form);
  });
}
