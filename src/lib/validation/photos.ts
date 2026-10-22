import { PHOTO_RULES } from "@/lib/constants";

// Photo rules for service requests.
// The customer can pick any photo up to 25 MB. Before upload, the browser
// shrinks it to a JPEG of at most 2048 px (usually 300 KB to 1 MB), which
// saves mobile data. What is finally uploaded must be JPEG, PNG or WebP and
// at most 5 MB; storage rejects anything else.

export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

export type PhotoCheck = { ok: true } | { ok: false; message: string };

/** Checks a photo the customer picked, before we try to process it. */
export function checkPickedPhoto(file: { name: string; type: string; size: number }): PhotoCheck {
  const looksLikeImage =
    file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) {
    return { ok: false, message: `“${file.name}” is not a photo. Choose a JPG, PNG or WebP image.` };
  }
  if (file.size === 0) {
    return { ok: false, message: `“${file.name}” is empty.` };
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return { ok: false, message: `“${file.name}” is over 25 MB. Choose a smaller photo.` };
  }
  return { ok: true };
}

/** Checks the processed photo that will actually be uploaded. */
export function checkUploadBlob(blob: { type: string; size: number }): PhotoCheck {
  if (!(PHOTO_RULES.mimeTypes as readonly string[]).includes(blob.type)) {
    return { ok: false, message: "Only JPG, PNG or WebP photos can be uploaded." };
  }
  if (blob.size > PHOTO_RULES.maxBytes) {
    return { ok: false, message: "Each photo must be 5 MB or smaller." };
  }
  if (blob.size === 0) {
    return { ok: false, message: "That photo is empty." };
  }
  return { ok: true };
}

/** How many more photos fit, given how many are already chosen. */
export function remainingPhotoSlots(current: number): number {
  return Math.max(0, PHOTO_RULES.maxFiles - current);
}

const PATH_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([A-Za-z0-9_-]{1,80})\.(jpg|jpeg|png|webp)$/i;

/** Checks a storage path is "<this request id>/<safe name>.<image extension>". */
export function isValidPhotoPath(path: string, requestId: string): boolean {
  const match = PATH_PATTERN.exec(path);
  return Boolean(match && match[1]?.toLowerCase() === requestId.toLowerCase());
}

export function extensionForMime(mime: string): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
