# Rain Bird Service Hub

A concept prototype built for the **Blueprint hackathon**. It is **not** an official Rain Bird Nigeria system, and all data in it is fictional demo data.

Customers of a pumps and water-systems company can request a quote or a service visit online, add photos of a fault, and track progress with a reference number, without phoning. Staff see every request in one dashboard, sorted so critical faults come first, and update each request as work moves along.

| | |
|---|---|
| Customer pages | Home, Request a quote (4 steps), Request service (with photos), Confirmation, Track |
| Staff pages | Login, Dashboard (filters, search, counters), Request detail (update, notes, history, messages) |
| Built with | Next.js 16, TypeScript, Tailwind CSS 4, Supabase (database, login, photo storage), Zod, React Hook Form |
| Hosting | Vercel free tier + Supabase free tier |

More reading:

- [How this works](docs/HOW-IT-WORKS.md): a plain-language explanation with a diagram, ready to present.
- [Known limitations](docs/LIMITATIONS.md): what this prototype does not do.
- [Manual test checklist](docs/TEST-CHECKLIST.md): click-through tests before a demo.

---

## Demo staff login

| Email | Password |
|---|---|
| `demo.staff@example.com` | `RainBird-Demo-2026` |

You create this account yourself in Step 3 below. Change the password if you deploy the app somewhere public.

---

## Setup guide (no experience needed)

Total time: about 30 minutes. You need three free accounts: **GitHub**, **Supabase** and **Vercel**. Sign up for all three with the same email to keep things simple.

### Step 0: Install the tools on your computer

1. Install **Node.js** (version 20.9 or newer). Go to nodejs.org and download the **LTS** version. Run the installer and accept the defaults.
2. Check it worked. Open a terminal (on Windows: search "Command Prompt"; on Mac: search "Terminal") and type:
   ```bash
   node -v
   ```
   You should see something like `v22.12.0`. Anything from v20.9 up is fine.
3. Install a code editor such as **VS Code** (code.visualstudio.com). It makes the files easier to read and edit.
4. Unzip this project somewhere easy to find, for example your Desktop.

### Step 1: Create a free Supabase project

Supabase gives you the database, the staff login and the photo storage.

1. Go to supabase.com, sign in, and click **New project**.
2. Name it `rainbird-service-hub`.
3. Choose a strong database password and save it somewhere safe. (The app does not need it, but Supabase may ask for it later.)
4. Region: choose the closest one offered to Nigeria, for example **West EU (Ireland)** or **Central EU (Frankfurt)**.
5. Click **Create new project** and wait about 2 minutes.

### Step 2: Build the database (copy and paste 4 files)

1. In your Supabase project, click **SQL Editor** in the left menu, then **New query**.
2. In the project folder, open `supabase/migrations/0001_schema.sql` in your editor. Select all, copy, paste it into the Supabase editor, and click **Run**. You should see "Success. No rows returned".
3. Click **New query** and do the same with `0002_security_and_functions.sql`.
4. Then `0003_storage.sql`.

If Supabase warns that the query contains "destructive operations", click **Run this query**. The files only remove and re-create their own rules, which makes them safe to run again.

### Step 3: Create the staff login

1. In Supabase go to **Authentication > Users**, click **Add user > Create new user**.
2. Email `demo.staff@example.com`, password `RainBird-Demo-2026`, tick **Auto Confirm User**, click **Create user**.
3. Back in **SQL Editor > New query**, paste and run `supabase/migrations/0004_engineers_and_staff.sql`. The result should show **engineers 4** and **staff_members 1**.
4. Go to **Authentication > Sign In / Providers** (or **Authentication > Settings** on older dashboards) and turn **off** "Allow new users to sign up". Keep the Email provider on.

### Step 4: Add the demo data (optional, recommended for demos)

In **SQL Editor > New query**, paste and run `supabase/seed/seed_demo_requests.sql`. It adds 20 fictional requests across all statuses and urgencies in Lagos, Abuja and Kano. You can run it again any time to reset the demo data. It only replaces requests that use `@example.com` email addresses.

### Step 5: Connect the app to Supabase

1. In Supabase, open **Project Settings > API Keys** (older dashboards: **Project Settings > API**). Keep this page open.
2. In the project folder, copy the file `.env.example` and name the copy `.env.local`. (On Mac, files starting with a dot are hidden in Finder. Do this in VS Code instead: right-click `.env.example`, copy, paste, rename.)
3. Fill in `.env.local`:

| Setting | What to paste |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL, like `https://abcd1234.supabase.co` (on the Data API or API page) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** or **publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** or **secret** key (click Reveal). Never share this one. |
| `RATE_LIMIT_SALT` | A random string. Make one by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in the terminal |

Your finished file looks like this (with your own values):

```
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RATE_LIMIT_SALT=3f9a0c...
```

### Step 6: Run it on your computer

In the terminal, go into the project folder and install everything:

```bash
cd Desktop/rainbird-service-hub
npm install
npm run dev
```

(The first line depends on where you unzipped the project.)

Open http://localhost:3000 in your browser.

Then open http://localhost:3000/setup-check. It checks your setup and shows a green tick for each of 7 items. If one is not ticked, it tells you exactly which step to repeat. After changing `.env.local`, stop the app (press `Ctrl + C` in the terminal) and run `npm run dev` again.

**Try it on your phone:** stop the app, then run the production version, which works best from other devices:

```bash
npm run build
npm start
```

Find your computer's address on the Wi-Fi (Windows: run `ipconfig` and look for "IPv4 Address"; Mac: System Settings > Wi-Fi > Details > IP address), then open `http://THAT-ADDRESS:3000` on a phone connected to the same Wi-Fi, for example `http://192.168.1.5:3000`.

### Step 7: Put your code on GitHub

Vercel deploys straight from GitHub.

1. Go to github.com and click **New repository**. Name it `rainbird-service-hub`, keep it **Private**, and click **Create repository**.
2. The easiest route for beginners is **GitHub Desktop** (desktop.github.com): choose **File > Add local repository**, pick the project folder, click **create a repository** if asked, then **Publish repository**.
   Or, in the terminal:
   ```bash
   git init
   git add .
   git commit -m "Rain Bird Service Hub prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/rainbird-service-hub.git
   git push -u origin main
   ```
3. Your `.env.local` file is **not** uploaded (the `.gitignore` file blocks it). That is correct: secrets never go on GitHub.

### Step 8: Deploy to Vercel

1. Go to vercel.com, sign in with GitHub, and click **Add New > Project**.
2. Find `rainbird-service-hub` and click **Import**.
3. Open **Environment Variables** and add the same 4 values from your `.env.local`, one at a time (name on the left, value on the right).
4. Click **Deploy** and wait about 2 minutes.
5. Open your new address (like `rainbird-service-hub.vercel.app`) and visit `/setup-check` to confirm everything is green.

If you change environment variables later, go to **Deployments**, click the three dots on the latest one, and choose **Redeploy**. The public values are built into the pages, so a redeploy is needed.

### Step 9: Before a live demo

- Re-run `supabase/seed/seed_demo_requests.sql` for fresh demo data with recent dates.
- Free Supabase projects pause after about a week without use. Open the Supabase dashboard the day before your demo and click **Restore** if it is paused.
- Run through [the manual test checklist](docs/TEST-CHECKLIST.md).

---

## Automated tests

```bash
npm test
```

This runs 90 tests covering form validation, reference numbers, phone number handling, the tracking timeline, the public API routes (including rate limits and the "same answer for a wrong contact or a missing reference" rule), and the staff dashboard helpers. No database is needed: the routes are tested with stand-in data.

The database security rules have their own tests in `supabase/tests/`. These are for developers with a local PostgreSQL installation. **Do not run them in your Supabase project**, because they create fake users.

Other useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app locally with live reload |
| `npm run build` | Builds the production version (Vercel does this for you) |
| `npm run typecheck` | Checks the TypeScript code for mistakes |

---

## Project structure

```
rainbird-service-hub/
├── README.md                     this guide
├── .env.example                  the 4 settings the app needs
├── next.config.ts                security headers
├── vitest.config.mts             test settings
├── docs/
│   ├── HOW-IT-WORKS.md           plain-language explanation and diagram
│   ├── LIMITATIONS.md            honest list of what is missing
│   └── TEST-CHECKLIST.md         manual test checklist
├── supabase/
│   ├── migrations/               4 SQL files: tables, security rules, photo storage, engineers + staff
│   ├── seed/                     20 fictional demo requests
│   └── tests/                    database security tests (local PostgreSQL only)
├── tests/                        automated tests (npm test)
└── src/
    ├── proxy.ts                  sends logged-out visitors on staff pages to the login page
    ├── app/                      every page and API route
    │   ├── page.tsx              home
    │   ├── quote/                4-step quote form
    │   ├── service/              service form with photos
    │   ├── confirmation/         reference number and summary
    │   ├── track/                customer tracker
    │   ├── staff/login/          staff login
    │   ├── staff/(protected)/    dashboard and request detail (staff only)
    │   ├── setup-check/          setup checklist page
    │   └── api/                  requests/quote, requests/service, requests/service/photos, track, staff/requests/[id], health
    ├── components/               shared building blocks: fields, buttons, badges, pipe tracker, photo picker
    └── lib/
        ├── validation/           Zod rules shared by browser and server
        ├── supabase/             4 ways to connect to Supabase, each with the least power it needs
        ├── constants.ts          every label and option list in one place
        ├── tracking.ts           turns status history into the customer timeline
        ├── rate-limit.ts         rate limits stored in the database
        └── ...                   phone, reference, formatting and sanitising helpers
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `/setup-check` says environment variables are missing | Check the file is named exactly `.env.local` (not `.env.local.txt`), in the main project folder, then restart `npm run dev`. On Vercel, add them under Settings > Environment Variables and redeploy. |
| "Could not connect to your Supabase URL" | The URL is wrong, you are offline, or the free project is paused. Open the Supabase dashboard and click Restore if paused. |
| Staff login says the account has no staff access | You created the user after running `0004_engineers_and_staff.sql`. Run that file again. |
| Login says the email and password do not match | Check the user exists under Authentication > Users and is confirmed. Reset the password there if needed. |
| Photos do not upload | Run `0003_storage.sql` again. Check Storage shows a private bucket called `request-photos`. |
| "Too many attempts" while testing | That is the rate limit working (5 submissions or 20 tracking lookups per 10 minutes per connection). Wait 10 minutes, or in SQL Editor run `delete from public.rate_limits;` |
| `npm install` fails | Check `node -v` shows v20.9 or newer. |
