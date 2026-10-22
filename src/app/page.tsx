import Link from "next/link";

import { TrackForm } from "@/components/track-form";

// Home page: what this is, two big ways in, and a box to track a request.
export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <section aria-labelledby="intro-heading" className="max-w-2xl">
        <h1 id="intro-heading" className="text-3xl font-bold leading-tight tracking-tight text-brand-900 sm:text-5xl">
          Pumps, fire systems and water treatment. Ask once, then follow every step.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Send a quote or service request in a few minutes. You get a reference number straight away, and you can
          check its progress here any time instead of phoning.
        </p>
      </section>

      <section aria-label="Start a request" className="grid gap-4 md:grid-cols-2">
        <Link
          href="/quote"
          className="group flex flex-col justify-between rounded-lg bg-brand-700 p-6 text-white transition-colors hover:bg-brand-800 sm:p-8"
        >
          <span>
            <span className="block text-2xl font-bold">Request a quote</span>
            <span className="mt-2 block leading-relaxed text-brand-100">
              Planning a new borehole pump, solar pump, booster, firefighting or treatment system. Four short steps.
            </span>
          </span>
          <span className="mt-6 inline-block font-semibold underline decoration-teal-100/60 underline-offset-4 group-hover:decoration-white">
            Start a quote request
          </span>
        </Link>

        <Link
          href="/service"
          className="group flex flex-col justify-between rounded-lg border-2 border-teal-600 bg-white p-6 transition-colors hover:bg-teal-50 sm:p-8"
        >
          <span>
            <span className="block text-2xl font-bold text-teal-700">Request service</span>
            <span className="mt-2 block leading-relaxed text-muted">
              Something has stopped working, needs maintenance, or you need spare parts or advice. Add photos of the
              fault.
            </span>
          </span>
          <span className="mt-6 inline-block font-semibold text-teal-700 underline decoration-teal-500/50 underline-offset-4 group-hover:decoration-teal-700">
            Report a fault or book service
          </span>
        </Link>
      </section>

      <section aria-labelledby="track-heading" className="rounded-lg border border-line bg-white p-6 sm:p-8">
        <div className="md:grid md:grid-cols-[1fr_1.4fr] md:gap-10">
          <div>
            <h2 id="track-heading" className="text-xl font-bold text-brand-900">
              Track a request
            </h2>
            <p className="mt-2 leading-relaxed text-muted">
              Enter your reference number, like <span className="whitespace-nowrap">QT-1042</span> or{" "}
              <span className="whitespace-nowrap">SV-1042</span>, and the email or phone number you used.
            </p>
          </div>
          <div className="mt-5 md:mt-0">
            <TrackForm mode="handoff" />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-xl font-bold text-brand-900">
          What happens after you send a request
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["Received", "Your request reaches our team instantly, with any photos."],
            ["Assigned", "An engineer who knows your system picks it up."],
            ["Scheduled", "We book the visit, delivery or call with you."],
            ["Done", "The work is complete and your tracker shows it."],
          ].map(([title, text], i) => (
            <li key={title} className="border-l-4 border-teal-600 bg-white py-3 pl-4 pr-3">
              <p className="font-semibold">
                <span className="tabular text-teal-700">{i + 1}.</span> {title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Critical faults, where a system is down or there is a safety risk, go to the top of the queue.
        </p>
      </section>
    </div>
  );
}
