import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { FOOTER_NOTE } from "@/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rain Bird Service Hub",
    template: "%s | Rain Bird Service Hub",
  },
  description:
    "Request a quote or service for pumps, firefighting and water treatment systems, and track it online. Concept prototype for the Blueprint hackathon.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f4a75",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-brand-700 focus:shadow"
        >
          Skip to main content
        </a>

        <header className="border-b-4 border-teal-600 bg-brand-800 text-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight sm:text-xl">
              Rain Bird Service Hub
            </Link>
            <nav aria-label="Main">
              <ul className="flex items-center gap-1 text-sm font-medium sm:gap-2">
                <li>
                  <Link href="/quote" className="inline-block rounded px-2 py-2 text-brand-100 hover:text-white hover:underline">
                    Get a quote
                  </Link>
                </li>
                <li>
                  <Link href="/service" className="inline-block rounded px-2 py-2 text-brand-100 hover:text-white hover:underline">
                    Request service
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="inline-block rounded px-2 py-2 text-brand-100 hover:text-white hover:underline">
                    Track
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none sm:py-12">
          {children}
        </main>

        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-xs leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>{FOOTER_NOTE}</p>
            <Link href="/staff" className="shrink-0 underline-offset-2 hover:text-brand-700 hover:underline">
              Staff login
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
