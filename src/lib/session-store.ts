// Short-lived hand-offs between pages, kept in this browser tab only
// (sessionStorage). Nothing personal ever goes into the page address.
// Every read and write is wrapped, because private browsing can block storage.

export type ConfirmationData = {
  reference: string;
  kind: "quote" | "service";
  summary: [string, string][];
  photosChosen?: number;
  photosSaved?: number;
};

const CONFIRM_PREFIX = "rbhub:confirm:";
const TRACK_KEY = "rbhub:track-contact";

function safeSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // storage unavailable: pages fall back to showing less detail
  }
}

function safeGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function saveConfirmation(data: ConfirmationData) {
  safeSet(CONFIRM_PREFIX + data.reference, JSON.stringify(data));
}

export function readConfirmation(reference: string): ConfirmationData | null {
  const raw = safeGet(CONFIRM_PREFIX + reference);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConfirmationData;
    return parsed.reference === reference && Array.isArray(parsed.summary) ? parsed : null;
  } catch {
    return null;
  }
}

/** Lets the home-page tracking box pass the email/phone to the track page. */
export function saveTrackContact(reference: string, contact: string) {
  safeSet(TRACK_KEY, JSON.stringify({ reference, contact }));
}

/** Reads the hand-off without removing it (safe to call more than once). */
export function peekTrackContact(reference: string): string | null {
  const raw = safeGet(TRACK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { reference?: string; contact?: string };
    return parsed.reference === reference && typeof parsed.contact === "string" ? parsed.contact : null;
  } catch {
    return null;
  }
}

export function clearTrackContact() {
  safeRemove(TRACK_KEY);
}
