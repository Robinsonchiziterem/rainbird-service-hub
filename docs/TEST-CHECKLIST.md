# Manual test checklist

Run through this before a demo. It takes about 15 minutes. Use a phone (or your browser's phone view: press F12, then the phone icon) for the customer steps.

Write down the reference numbers you get; you will need them.

## 0. Setup

- [ ] `/setup-check` shows 7 green ticks.
- [ ] Footer on every page says: "Concept prototype built for the Blueprint hackathon. Not an official Rain Bird Nigeria system. Demo data only."

## 1. Submit a quote

- [ ] Home page: tap **Request a quote**.
- [ ] Tap **Continue** with nothing filled in. Each empty field shows a red message under it, and the cursor jumps to "Full name".
- [ ] Type an invalid email (`ada@`) and a non-Nigerian phone (`+44 20 7946 0958`). Both show clear messages.
- [ ] Fill in contact details correctly with phone `0803 123 4567`. Tap **Continue**.
- [ ] Step 2: pick a site type, a product area and a water source. Tap **Continue**.
- [ ] Step 3: pick a state, type a town, pick a water need and timeline. Tap **Continue**.
- [ ] Step 4 shows all your answers. Tap **Back**: your answers are still there. Return to step 4.
- [ ] Tap **Send quote request**. The confirmation page shows a reference like **QT-1042** and a summary of what you sent.
- [ ] **Copy reference** copies it.

## 2. Submit a service request with a photo

- [ ] Home page: tap **Request service**.
- [ ] Fill in contact details. Use a different email from the quote.
- [ ] Choose urgency **Critical** and help needed **Emergency repair**.
- [ ] Type the equipment, and a description of at least 10 characters.
- [ ] Tap **Add photos** and choose a photo. A preview and its size appear.
- [ ] Add two more photos. With 3 chosen, the button changes to "Photo limit reached". Tap **Remove** under one, then add it back.
- [ ] Tap **Send service request**. The button shows "Uploading photo 1 of 3" and so on. The confirmation shows **SV-** and "Photos: 3 uploaded".

## 3. Track it

- [ ] From the confirmation page, tap **Track this request**. The reference is already filled in.
- [ ] Type the email or phone you used, in a different format from how you first typed it (for example `+234 803 123 4567` instead of `0803 123 4567`).
- [ ] The tracker shows **Received** with today's date. Received is current, the other three are not reached yet.
- [ ] Tap **Track another request**, and try the same reference with a wrong email. You see "We could not find a request with those details".
- [ ] Try a reference that does not exist (`SV-99999`) with your real email. You see exactly the same message.
- [ ] Use the **Track a request** box on the home page. It opens the tracker and shows the result straight away.

## 4. Log in as staff

- [ ] Go to `/staff`. You are sent to the login page.
- [ ] Try a wrong password: "That email and password do not match a staff account."
- [ ] Log in with `demo.staff@example.com` / `RainBird-Demo-2026`. The dashboard opens.
- [ ] Counters show open requests, critical open requests and completed this week.
- [ ] Your new service request (Critical) is near the top. Critical requests have a red edge. Done requests are at the bottom.
- [ ] Filter by **Urgency: Critical**: only critical requests show. **Clear filters** brings everything back.
- [ ] Search your quote's reference number: it is found. Search a company name (`Lekki`): matching requests are found.
- [ ] Filter by **Engineer: Unassigned**.
- [ ] On a phone, the dashboard shows cards instead of a table and nothing scrolls sideways.

## 5. Change a status

- [ ] Open your service request. You see the details, the photo (tap to open it full size), the status history and two "Messages that would be sent" (email and WhatsApp, marked "Not sent (simulated)").
- [ ] Choose an engineer. A hint says "Saving will also move the status to Assigned".
- [ ] Add a public note ("Engineer on the way") and an internal note ("Check the warranty"). Tap **Save update**.
- [ ] A green message confirms it. The status badge says **Assigned**. The history shows "Received to Assigned, by Demo Staff". Two new simulated messages appear, including your public note.
- [ ] Change status to **Scheduled** and save.

## 6. Confirm the customer's tracker updates

- [ ] Go back to the tracker (on the phone) and tap **Check for updates**, or track again.
- [ ] It now shows **Scheduled**, with Received and Assigned ticked and their dates.
- [ ] It shows the engineer's first name and your public note.
- [ ] It does **not** show the internal note.

## 7. Finish

- [ ] Mark the request **Done**. The dashboard's "Completed this week" counter goes up by one, and the tracker shows every stage complete.
- [ ] Tap **Log out**. Visiting `/staff` sends you to the login page again.

## 8. Accessibility spot checks

- [ ] Using only the keyboard (Tab, Shift+Tab, Space, Enter), complete a quote request. Every focused item has a clear teal outline.
- [ ] The first Tab on any page shows "Skip to main content".
- [ ] Zoom the browser to 200%: nothing is cut off.
- [ ] If you can, try a screen reader (VoiceOver on iPhone/Mac, TalkBack on Android, NVDA on Windows): field errors are read out with their fields, and the tracker reads each stage as "completed", "current stage" or "not reached yet".
