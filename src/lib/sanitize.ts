// Text cleaning used on every free-text field, on both the browser and the server.
// React already escapes text when it shows it, so this is a second layer:
// it removes invisible control characters and anything that looks like HTML.

const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u2028\\u2029\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]",
  "g",
);
const HTML_TAGS = /<\/?[a-zA-Z!][^>]*>/g;
const ANGLE_BRACKETS = /[<>]/g;

function base(value: string): string {
  return value.normalize("NFC").replace(CONTROL_CHARS, "").replace(HTML_TAGS, "").replace(ANGLE_BRACKETS, "");
}

/** For one-line fields (names, towns): trims and collapses all whitespace. */
export function cleanLine(value: unknown): string {
  if (typeof value !== "string") return "";
  return base(value).replace(/\s+/g, " ").trim();
}

/** For paragraphs (notes, descriptions): keeps line breaks, max 2 blank lines in a row. */
export function cleanMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return base(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * For the staff search box. Keeps only characters that are safe to put in a
 * database filter (letters, numbers, spaces, - . @ ' &), max 60 characters.
 */
export function cleanSearch(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} \-.@'&]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
