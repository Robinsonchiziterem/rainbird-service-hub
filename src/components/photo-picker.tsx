"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Spinner } from "@/components/ui";
import { PHOTO_RULES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { PhotoPrepError, preparePhoto } from "@/lib/image-prep";
import { checkPickedPhoto, checkUploadBlob, remainingPhotoSlots } from "@/lib/validation/photos";

export type PreparedPhoto = { key: string; name: string; blob: Blob; previewUrl: string };

/**
 * Lets the customer add up to 3 photos. Each one is checked and shrunk as
 * soon as it is picked, so problems show up straight away, not at submit.
 */
export function PhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: PreparedPhoto[];
  onChange: (photos: PreparedPhoto[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(0);

  // Free preview memory when photos are removed or the form closes.
  const latest = useRef(photos);
  latest.current = photos;
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const slots = remainingPhotoSlots(photos.length);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const newErrors: string[] = [];

    if (files.length > slots) {
      newErrors.push(
        `You can add ${PHOTO_RULES.maxFiles} photos in total. ${slots === 0 ? "Remove one first." : `Only the first ${slots} were added.`}`,
      );
    }

    const accepted = files.slice(0, slots).filter((file) => {
      const check = checkPickedPhoto(file);
      if (!check.ok) newErrors.push(check.message);
      return check.ok;
    });

    setPreparing(accepted.length);
    const prepared: PreparedPhoto[] = [];
    for (const file of accepted) {
      try {
        const blob = await preparePhoto(file);
        const check = checkUploadBlob(blob);
        if (!check.ok) {
          newErrors.push(`“${file.name}”: ${check.message}`);
          continue;
        }
        prepared.push({
          key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          blob,
          previewUrl: URL.createObjectURL(blob),
        });
      } catch (err) {
        newErrors.push(err instanceof PhotoPrepError ? err.message : `“${file.name}” could not be prepared.`);
      }
    }
    setPreparing(0);
    setErrors(newErrors);
    if (prepared.length > 0) onChange([...photos, ...prepared].slice(0, PHOTO_RULES.maxFiles));
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (key: string) => {
    const photo = photos.find((p) => p.key === key);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((p) => p.key !== key));
    setErrors([]);
  };

  return (
    <div>
      <p className="font-semibold text-ink" id={`${inputId}-label`}>
        Photos of the problem <span className="font-normal text-muted">(optional, up to 3)</span>
      </p>
      <p id={hintId} className="mt-0.5 text-sm text-muted">
        A clear photo of the equipment, nameplate or fault helps the engineer arrive with the right parts. Photos are
        resized before upload to save your data.
      </p>

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3" aria-label="Chosen photos">
          {photos.map((photo, index) => (
            <li key={photo.key} className="relative overflow-hidden rounded-md border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
              <img src={photo.previewUrl} alt={`Photo ${index + 1}: ${photo.name}`} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 py-1 text-xs text-muted">
                <span className="tabular">{formatBytes(photo.blob.size)}</span>
                <button
                  type="button"
                  onClick={() => remove(photo.key)}
                  disabled={disabled}
                  className="min-h-8 rounded px-1.5 font-semibold text-red-800 hover:underline"
                >
                  Remove<span className="sr-only"> photo {index + 1}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
          multiple
          className="peer sr-only"
          disabled={disabled || slots === 0 || preparing > 0}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={[hintId, errors.length ? errorId : ""].filter(Boolean).join(" ")}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-dashed px-4 py-2.5 font-semibold peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-500 peer-focus-visible:outline ${
            slots === 0 || disabled
              ? "cursor-not-allowed border-slate-300 text-muted"
              : "cursor-pointer border-brand-500 text-brand-700 hover:bg-brand-50"
          }`}
        >
          {preparing > 0 ? (
            <>
              <Spinner /> Preparing {preparing === 1 ? "photo" : `${preparing} photos`}
            </>
          ) : slots === 0 ? (
            "Photo limit reached"
          ) : photos.length === 0 ? (
            "Add photos"
          ) : (
            "Add another photo"
          )}
        </label>
      </div>

      {errors.length > 0 && (
        <ul id={errorId} role="alert" className="mt-2 space-y-1 text-sm font-medium text-red-800">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
