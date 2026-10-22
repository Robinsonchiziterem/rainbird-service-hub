// Prepares a photo in the browser before upload:
//  * shrinks it to at most 2048 px on the longest side,
//  * re-saves it as JPEG (this also converts iPhone HEIC photos where the
//    browser can read them, and strips location data stored in the photo),
//  * keeps it under the 5 MB limit.
// Runs only in the browser.

import { PHOTO_RULES } from "./constants";

const MAX_DIMENSION = 2048;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export class PhotoPrepError extends Error {}

export async function preparePhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImage(url);
    } catch {
      // The browser cannot read it. Upload as-is only if it is already allowed.
      if ((PHOTO_RULES.mimeTypes as readonly string[]).includes(file.type) && file.size <= PHOTO_RULES.maxBytes) {
        return file;
      }
      throw new PhotoPrepError(`“${file.name}” could not be opened. Try a JPG or PNG photo instead.`);
    }

    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    let scale = Math.min(1, MAX_DIMENSION / longest);

    for (const quality of [0.85, 0.75, 0.65]) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size > 0 && blob.size <= PHOTO_RULES.maxBytes) return blob;
      scale *= 0.8;
    }

    if ((PHOTO_RULES.mimeTypes as readonly string[]).includes(file.type) && file.size <= PHOTO_RULES.maxBytes) {
      return file;
    }
    throw new PhotoPrepError(`“${file.name}” is too large to upload. Try a smaller photo.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
