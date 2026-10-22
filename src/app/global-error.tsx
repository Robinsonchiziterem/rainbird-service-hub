"use client";

// Last-resort error screen if even the main layout fails. Uses plain styles
// because the normal stylesheet may not have loaded.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-NG">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", color: "#13212e", maxWidth: "36rem" }}>
        <h1 style={{ fontSize: "1.75rem" }}>Rain Bird Service Hub is not available right now</h1>
        <p style={{ lineHeight: 1.6 }}>Something went wrong while loading the site. Please try again in a moment.</p>
        <button
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1.25rem",
            background: "#0f4a75",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
