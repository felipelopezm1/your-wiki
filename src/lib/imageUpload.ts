import type { GalleryImage } from "@/types";

const FULL_MAX_PX = 960;
const THUMB_MAX_PX = 480;
/** Stay safely under Vercel's ~4.5 MB function payload limit */
export const MAX_SUBMISSION_BYTES = 3_500_000;

/** Blob storage is not configured on production — skip upload fetch entirely. */
const USE_BLOB_UPLOAD = false;

export function compressImage(
  file: File,
  maxSize = FULL_MAX_PX,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(
          new Error(
            "Could not load this photo. If it is HEIC/HEIF, try saving it as JPEG in Photos first.",
          ),
        );
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file: File): Promise<string> {
  if (!USE_BLOB_UPLOAD) {
    throw new Error("Upload not configured");
  }

  try {
    const safeName = `photo-${Date.now()}.jpg`;
    const res = await fetch(`/api/upload?filename=${encodeURIComponent(safeName)}`, {
      method: "POST",
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url as string;
  } catch {
    throw new Error("Upload failed");
  }
}

export function getImageAspect(file: File): Promise<"portrait" | "landscape"> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve("landscape");
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve("landscape");
      img.onload = () => resolve(img.height > img.width ? "portrait" : "landscape");
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function prepareAvatarUrl(file: File): Promise<string> {
  try {
    return await uploadImage(file);
  } catch {
    return compressImage(file, FULL_MAX_PX, 0.75);
  }
}

export async function prepareGalleryImage(file: File): Promise<GalleryImage> {
  const aspect = await getImageAspect(file);
  const thumbnailUrl = await compressImage(file, THUMB_MAX_PX, 0.68);
  try {
    return { url: await uploadImage(file), thumbnailUrl, aspect };
  } catch {
    const url = await compressImage(file, FULL_MAX_PX, 0.72);
    return { url, thumbnailUrl, aspect };
  }
}

export function estimateSubmissionBytes(payload: unknown): number {
  return new Blob([JSON.stringify(payload)]).size;
}

export function assertPayloadFits(payload: unknown): void {
  const bytes = estimateSubmissionBytes(payload);
  if (bytes > MAX_SUBMISSION_BYTES) {
    throw new Error(
      "Your photos are too large to send together. Try fewer images, or submit your message first without photos and edit it later to add them.",
    );
  }
}

export async function readApiError(res: Response, fallback: string): Promise<string> {
  if (res.status === 413) {
    return "Your photos are too large to send together. Try fewer images, or submit your message first without photos.";
  }
  try {
    const data = await res.json();
    if (data?.error && typeof data.error === "string") return data.error;
  } catch {
    // non-JSON error bodies (e.g. Vercel 413 plain text)
  }
  return fallback;
}

/** Safari/iOS throws opaque DOMExceptions — map them to something helpful. */
export function friendlySubmitError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";

  const msg = err.message.toLowerCase();
  if (
    msg.includes("did not match the expected pattern") ||
    msg.includes("network error") ||
    msg.includes("load failed")
  ) {
    return "Couldn't send from this browser — often caused by photos. Try submitting your message first without images, then edit to add photos.";
  }

  return err.message;
}

export async function submitJson(
  url: string,
  payload: unknown,
  method: "POST" | "PUT" = "POST",
): Promise<Response> {
  try {
    return await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(friendlySubmitError(err));
  }
}
