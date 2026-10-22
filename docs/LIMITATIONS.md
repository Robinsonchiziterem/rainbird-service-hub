# Known limitations

This is a hackathon prototype. Here is what it does not do, stated plainly.

## By design (agreed scope)

1. **Customers get no real messages.** Customer email and WhatsApp updates are written to the `notifications_log` table and shown on the staff page, but not sent. Staff *can* get real email alerts for new requests (optional, via Resend). On Resend's free plan without your own domain, those alerts can only go to the email address the Resend account was created with. A real version would add a verified domain and the WhatsApp Business API.
2. **Not connected to Rain Bird Nigeria.** It does not use their logo, data, prices, stock or staff. All names, companies and phone numbers in the demo data are invented.
3. **Customers have no accounts.** They track one request at a time with a reference number and their email or phone. They cannot see a list of their past requests.
4. **No quotes or prices.** The quote form collects the information an engineer needs. Writing and sending the actual quote happens outside the system.
5. **Four statuses only.** There is no "Cancelled" or "On hold". Staff would mark a dead request Done and add an internal note.

## Security and abuse

6. **The public key can be used directly.** The Supabase "anon" key has to be in the browser so photos can upload. Someone technical could use it to add requests directly to the database, skipping the website's rate limit. The database rules still stop them reading anything, setting a status or engineer, or attaching more than 3 photos. A production version could route all inserts through the server only.
7. **Rate limits are per connection.** Many people on one office or mobile network share an address and therefore share the limit (5 submissions, 20 tracking lookups per 10 minutes). Someone with many addresses could get around it. A production version would add a CAPTCHA such as Cloudflare Turnstile.
8. **The bot trap is simple.** The hidden field stops basic spam robots, not determined attackers.
9. **One staff role.** Every staff member can do everything. There are no separate roles for managers, engineers or admins, and no way to add staff from inside the app (you add them in Supabase).
10. **Photos are not scanned for viruses.** Storage only accepts JPEG, PNG and WebP up to 5 MB, and the browser re-saves every photo, which removes hidden data such as location. A production system would also scan uploads.
11. **Photos uploaded but not registered.** If a phone loses connection halfway through, a photo may land in storage without being linked to the request. It is harmless (staff only see linked photos) but takes up space. A clean-up job would fix this.
12. **The `/setup-check` page is public.** It only shows pass or fail for each setup step, with no secrets, but a production site would hide it.

## Practical

13. **Free tiers have limits.** Supabase free projects pause after about a week of no use, and have storage and bandwidth caps. Fine for a demo, not for real customers.
14. **No live updates on the staff dashboard.** Staff see new requests when they refresh or change a filter. The customer tracker has a "Check for updates" button rather than updating on its own.
15. **Dates are shown in Lagos time only.**
16. **English only.** No Hausa, Yoruba, Igbo or Pidgin versions.
17. **Phone numbers must be Nigerian.** International customers would need to use email for tracking.
18. **iPhone HEIC photos** work in browsers that can open them (Safari does, and converts them to JPEG). Some older Android browsers cannot, and the customer will see a message asking for a JPG or PNG.
19. **The urgency is the customer's choice.** Someone could mark a minor issue as Critical. Staff can see the description and photos and judge for themselves, but cannot change the urgency in this version.
20. **No offline mode.** On a very weak connection, the form keeps the customer's answers and shows a clear message, but the request is only saved once it reaches the server.

## Testing gaps

21. Automated tests cover validation, reference numbers, phone handling, the tracking timeline and the public API routes, and the database security rules are tested against a real PostgreSQL database. During development the whole app was also tested end to end against PostgREST (the API layer Supabase uses) and in a headless Chrome browser at phone and desktop sizes. It has **not** been tested against a live Supabase project by me, on real phones, or with a screen reader by a disabled user. Run the [manual checklist](TEST-CHECKLIST.md) before demoing.
