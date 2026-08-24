# CM Event Leads

**Internal event registration & lead collection platform — Color Metal SRL**

Visitors register on a tablet at the booth (or on their own phone via a QR code).
Every lead is stored in **your own** Supabase PostgreSQL database, exportable to
Excel or CSV at any time. No Jotform, no Typeform, no Google Forms, no submission
limits, no paid features. The whole stack runs on free tiers.

---

## Table of contents

1. [What it does](#1-what-it-does)
2. [Technology](#2-technology)
3. [Project structure](#3-project-structure)
4. [SETUP — 20 steps, exact commands](#4-setup--20-steps)
5. [Branding — one file changes everything](#5-branding)
6. [Security model](#6-security-model)
7. [Offline mode — how "no lost leads" works](#7-offline-mode)
8. [Everyday usage at an event](#8-everyday-usage-at-an-event)
9. [Free-tier limits](#9-free-tier-limits)
10. [Troubleshooting](#10-troubleshooting)
11. [Data ownership & backup](#11-data-ownership--backup)

---

## 1. What it does

**Public side (tablet / phone)**

* Kiosk-style, fullscreen-friendly registration form with very large touch targets
* Every field is configurable **per event** — enabled/disabled, required/optional,
  label, placeholder, help text, order
* Custom questions can be created from the admin UI without touching any code
* Automatic multi-step layout when many questions are enabled, single page when few
* Signature on an HTML5 canvas — **finger, stylus (Apple Pencil / S-Pen / Wacom /
  Surface Pen, pressure aware) or mouse**
* Configurable GDPR consent, with the exact accepted text and version stored per lead
* Duplicate warning (informative, never blocking)
* "Thank you" screen, then a full automatic reset — the next visitor never sees
  the previous visitor's data
* Works offline: registrations are stored in IndexedDB and uploaded automatically

**Admin side (`/#/admin`, Supabase Auth)**

* Dashboard with the key counters
* Events: create, edit, **duplicate (with the whole form configuration)**, archive,
  set active, per-event statistics, public link and QR code
* Form builder with drag & drop ordering (plus reliable Up/Down buttons),
  custom fields, templates and a live preview
* Lead list with full-text search and filters, lead detail with internal sales
  fields (status, assigned rep, internal notes, follow-up date)
* Sales representatives management
* Excel (.xlsx) and CSV (UTF-8 BOM) export — all / current event / filtered
* Settings: company name, logo, colours, defaults, GDPR text, auto-reset delay

---

## 2. Technology

| Layer | Choice | Cost |
|---|---|---|
| Frontend | React 18 + Vite 5 | free |
| Hosting | GitHub Pages (Netlify / Vercel also work) | free |
| Database | Supabase PostgreSQL | free tier |
| Auth | Supabase Auth | free tier |
| File storage | Supabase Storage (signature PNGs) | free tier |
| Offline queue | IndexedDB (`idb`) | free |
| Excel export | SheetJS (`xlsx`) | free |
| CSV export | plain JavaScript | free |
| QR codes | `qrcode` (client-side) | free |
| Router | `react-router-dom` (HashRouter) | free |

No other service is involved. No submission limits anywhere.

---

## 3. Project structure

```
cm-event-leads/
├─ .github/workflows/deploy.yml     GitHub Pages deployment
├─ public/
│  ├─ cm-logo.png                   Color Metal logo (colour, from the brand manual)
│  ├─ cm-logo-white.png             Color Metal logo (white, for dark backgrounds)
│  ├─ favicon.svg
│  └─ .nojekyll
├─ supabase/
│  ├─ 01_schema.sql                 tables, indexes, triggers, public views
│  ├─ 02_rls.sql                    Row Level Security policies + grants
│  ├─ 03_functions.sql              submit_registration(), duplicate check, stats…
│  ├─ 04_storage.sql                private "signatures" bucket + policies
│  ├─ 05_first_admin.sql            create the first administrator
│  └─ 06_seed_optional.sql          optional demo sales reps
├─ src/
│  ├─ config/
│  │  ├─ brand.js                   ★ THE ONLY FILE YOU EDIT TO RE-SKIN THE APP
│  │  ├─ fieldCatalog.js            the catalog of standard questions + option lists
│  │  ├─ templates.js               registration form templates
│  │  └─ leadStatus.js              internal sales statuses
│  ├─ i18n/                         ro.js · hu.js · en.js + tiny i18n engine
│  ├─ lib/
│  │  ├─ supabase.js                Supabase client (anon key only)
│  │  ├─ db.js                      every database call in one place
│  │  ├─ offlineQueue.js            IndexedDB queue + idempotent synchroniser
│  │  ├─ submitRegistration.js      builds the payload, saves locally, then sends
│  │  ├─ formEngine.js              step splitting + validation
│  │  ├─ exporters.js               XLSX + CSV export
│  │  └─ format.js                  helpers (slugify, uuid, validation, dates)
│  ├─ hooks/                        useAuth · useBranding · useConnection · useToast
│  ├─ components/
│  │  ├─ common/index.jsx           Logo, Modal, Badge, Stat, QRCode, …
│  │  ├─ form/FieldRenderer.jsx     renders one configured question
│  │  ├─ form/SignaturePad.jsx      canvas signature (finger / stylus / mouse)
│  │  ├─ form/RegistrationForm.jsx  the whole visitor form
│  │  └─ admin/AdminLayout.jsx      admin shell
│  ├─ pages/
│  │  ├─ public/RegisterPage.jsx    kiosk screen
│  │  ├─ public/SuccessScreen.jsx   thank-you + auto reset
│  │  └─ admin/…                    Login, Dashboard, Events, FormBuilder, Leads, …
│  ├─ styles/global.css             the whole design system
│  ├─ App.jsx                       routes
│  └─ main.jsx                      entry point
├─ .env.example
├─ package.json
└─ vite.config.js
```

---

## 4. SETUP — 20 steps

> You need: a computer with **Node.js 18 or newer** installed
> (<https://nodejs.org> → "LTS"), a **GitHub** account and a **Supabase** account.
> Both accounts are free.

### Step 1 — Create a Supabase account

1. Open <https://supabase.com>
2. Click **Start your project** → sign in with GitHub (simplest) or e-mail.

### Step 2 — Create a Supabase project

1. Click **New project**.
2. Fill in:
   * **Name**: `cm-event-leads`
   * **Database Password**: generate a strong one and **save it in your password
     manager** (you will rarely need it, but you cannot recover it later)
   * **Region**: `Central EU (Frankfurt)` — closest to Romania
   * **Pricing plan**: **Free**
3. Click **Create new project** and wait ~2 minutes.

### Step 3 — Run the SQL schema

1. In the Supabase dashboard open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/01_schema.sql` from this project, copy **the whole file**,
   paste it into the editor, press **Run** (or `Ctrl+Enter`).
3. You should see `Success. No rows returned`.

### Step 4 — Configure RLS (Row Level Security)

Repeat the same procedure with the next files, **in this exact order**:

| # | File | What it does |
|---|---|---|
| 1 | `supabase/02_rls.sql` | security policies and permissions |
| 2 | `supabase/03_functions.sql` | the registration + statistics functions |

Each one must end with `Success`.

To verify: **Table Editor** → you should see the tables `events`, `form_fields`,
`form_options`, `registrations`, `registration_answers`, `admin_profiles`,
`sales_reps`, `app_settings`, `lead_counters`, each with a green **RLS enabled**
badge.

### Step 5 — Configure signature storage

1. **SQL Editor** → **New query** → paste `supabase/04_storage.sql` → **Run**.
2. Verify: **Storage** (left sidebar) → a bucket named **signatures** exists and
   is **private** (no "Public" badge).

### Step 6 — Configure Supabase Auth

1. **Authentication** → **Providers** → make sure **Email** is enabled.
2. **Authentication** → **Sign In / Providers** (or **Providers → Email**) →
   **turn OFF "Enable email signups"** ("Allow new users to sign up").
   This is important: only you should be able to create accounts.
3. **Authentication** → **Emails** → nothing to do; we create users manually with
   "Auto Confirm", so no e-mail is ever sent.

### Step 7 — Create the first admin account

1. **Authentication** → **Users** → **Add user** → **Create new user**
   * **Email**: e.g. `lucian@color-metal.ro`
   * **Password**: a strong password
   * Tick **Auto Confirm User**
   * **Create user**
2. **SQL Editor** → **New query** → paste `supabase/05_first_admin.sql`
3. **Change the e-mail on line 17** (`v_email`) and the name (`v_name`) to what
   you just created, then **Run**. You should see
   `NOTICE: Admin profile ready for …`.

> Creating an auth user alone is **not** enough — the row in `admin_profiles` is
> what grants access. To add more admins later, repeat step 7 with another e-mail.

*(Optional)* Run `supabase/06_seed_optional.sql` to pre-fill a few sales
representatives.

### Step 8 — Configure environment variables

1. In Supabase: **Project Settings** (gear icon) → **API**.
2. Copy two values:
   * **Project URL** → looks like `https://abcdefghijk.supabase.co`
   * **Project API keys → `anon` `public`** → a long `eyJhbGciOi…` string
3. On your computer, in the project folder:

```bash
cp .env.example .env
```

4. Open `.env` in a text editor and fill it in:

```
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.....
VITE_BASE_PATH=
```

> ⚠️ **NEVER** copy the `service_role` key into this file or into the repository.
> The `anon` key is designed to be public; `service_role` bypasses all security.

### Step 9 — Run locally

```bash
cd cm-event-leads
npm install
npm run dev
```

Open the address it prints (usually <http://localhost:5173>).

* <http://localhost:5173/#/> → the visitor registration screen
* <http://localhost:5173/#/admin> → the admin login

Log in with the account from step 7.

To stop the server press `Ctrl+C`.

### Step 10 — Create a GitHub repository

1. Open <https://github.com/new>
2. **Repository name**: `cm-event-leads`
3. **Private** (recommended — the code contains no secrets, but keep it internal)
4. Do **not** tick "Add a README file"
5. **Create repository**

### Step 11 — Push the code

In the project folder:

```bash
git init
git add .
git commit -m "CM Event Leads - initial version"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/cm-event-leads.git
git push -u origin main
```

Replace `<YOUR-USERNAME>` with your GitHub user name.

> `.env` is listed in `.gitignore`, so your keys are **not** pushed. That is
> intentional — the deployment gets them from GitHub variables in the next step.

### Step 12 — Deploy the website

1. On GitHub open your repository → **Settings** → **Secrets and variables** →
   **Actions** → the **Variables** tab → **New repository variable**.
2. Add two variables (name → value):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://abcdefghijk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi…` (the anon key) |

### Step 13 — Configure GitHub Pages

1. Repository → **Settings** → **Pages**
2. **Build and deployment → Source**: choose **GitHub Actions**
3. Go to the **Actions** tab → if no run started yet, open
   **Deploy to GitHub Pages** → **Run workflow**.
4. Wait for the green tick (~1–2 minutes).
5. Your site is live at:

```
https://<YOUR-USERNAME>.github.io/cm-event-leads/
```

From now on **every `git push` redeploys automatically**:

```bash
git add .
git commit -m "change"
git push
```

### Step 14 — Open Admin

```
https://<YOUR-USERNAME>.github.io/cm-event-leads/#/admin
```

Log in with the account from step 7.

### Step 15 — Create the first event

**Events** → **+ New event**

* **Event name**: `nZEB Expo București 2026`
* **URL identifier**: filled in automatically (`nzeb-expo-bucuresti-2026`)
* **Location**: `Romexpo, București`
* **Start / End date**
* **Save**

The form builder opens automatically, already seeded with all the standard
Color Metal questions.

### Step 16 — Configure the registration form

In the form builder:

* Use the **ACTIVE** switch to decide which questions appear
* Use the **REQUIRED** switch, per question, independently
* **EDIT** to change the label, placeholder, help text, options and section
* **↑ ↓** or drag the **⠿** handle to change the order
* **+ Add custom question** for a brand-new question
  (e.g. *"Ce tip de material folosiți cel mai des?"* with the options
  Aluminiu / Cupru / Titan-zinc / Oțel / Altele)
* **Apply a template** to start from a ready-made set
  (Basic contact, Trade show, Architect event, Installer event, Open day,
  Full qualification)
* On the right: **Signature** (disabled / optional / required) and
  **GDPR** (disabled / optional / required + the exact text and its version)
* **Preview form** shows exactly what the visitor sees. Nothing entered in the
  preview is saved.

Everything is saved immediately — there is no separate "save form" button.

### Step 17 — Activate the event

**Events** → on the event's row press **Set as active**.

Only one event can be active at a time; that is the one the tablet shows.

### Step 18 — Test tablet registration

1. On the tablet open `https://<YOUR-USERNAME>.github.io/cm-event-leads/`
2. Add it to the home screen for a fullscreen kiosk experience:
   * **iPad / Safari**: Share → *Add to Home Screen*
   * **Android / Chrome**: ⋮ → *Add to Home screen*
3. Fill in the form, sign with a finger or a stylus, submit.
4. Check **Admin → Leads** — the lead is there with an ID like `CM-2026-000001`.

You can also print the **QR code** (Admin → Events → open the event) so visitors
can register from their own phone.

### Step 19 — Test offline registration

1. On the tablet turn **Wi-Fi off** (or enable airplane mode).
2. Reload the registration page — it still works (the event configuration is
   cached locally).
3. Fill in and submit a registration → an orange banner appears:
   *"Înregistrare salvată local – sincronizare în așteptare"*.
4. Turn Wi-Fi back on. Within ~20 seconds the queue is uploaded automatically;
   the indicator in Admin shows `Online` again with no pending items.
5. Verify in **Admin → Leads** that the lead arrived exactly once.

> The registration ID is generated on the tablet and used as the database primary
> key, so a retry can never create a duplicate.

### Step 20 — Export leads to Excel

**Admin → Leads**

* **Export all · XLSX** — everything in the database
* **Export current event** — only the selected/active event
* **Export filtered results · XLSX** — exactly what the filters show
* **CSV** — UTF-8 with BOM, so Excel shows `ă â î ș ț ő ű` correctly

Custom questions automatically become extra columns, headed with the exact
question text the visitor saw.

---

## 5. Branding

Everything visual is defined in **one file**:

```
src/config/brand.js
```

It already contains the official Color Metal brand manual values:

| | |
|---|---|
| Primary (Gold) | `#C0A062` |
| Faded Gold | `#E1D1B4` |
| Secondary (Silver) | `#939598` |
| Faded Silver | `#D1CECD` |
| Accent (Orange) | `#F4B422` |
| Faded Orange | `#FCE1B0` |
| "Black" / graphite | `#323232` |
| White | `#FFFFFF` |
| Bronze / Dark bronze | `#9E2A03` / `#620C01` |
| Green / Dark green | `#41896D` / `#464D45` |
| Grey | `#57525F` |
| Typeface | **Montserrat** (Light 300 / Regular 400 / Bold 700) |

Change a value there → the whole application changes. No component code has a
hard-coded colour; everything reads CSS custom properties generated from this file.

The logos in `public/` (`cm-logo.png`, `cm-logo-white.png`) were extracted from the
brand manual PDF. Replace those two files to change the logo, or point
`brand.logo` / `brand.logoLight` at any URL.

**Admin → Settings** can override the company name, the logo URLs and the main
colours at runtime (stored in the database), without redeploying. `brand.js`
stays the fallback and the single source of truth for a fresh installation.

---

## 6. Security model

| | Public (anon key) | Admin (logged in + `admin_profiles` row) |
|---|---|---|
| Read the active event's configuration | ✅ (only safe columns, via `public_*` views) | ✅ |
| Read the internal event description | ❌ | ✅ |
| Submit a registration | ✅ (only through the `submit_registration` function) | ✅ |
| Ask "is this a duplicate?" | ✅ (returns only `true`/`false`) | ✅ |
| List / read / search registrations | ❌ | ✅ |
| Update / delete registrations | ❌ | ✅ |
| Export | ❌ | ✅ |
| Manage events, forms, reps, settings | ❌ | ✅ |
| Read a signature image | ❌ | ✅ (via a short-lived signed URL) |
| Upload a signature image | ✅ (insert only, cannot list or read) | ✅ |

* Row Level Security is **enabled on every table**.
* The anon key has **no table privileges at all** on `registrations`,
  `registration_answers`, `events`, `form_fields`, `admin_profiles`,
  `sales_reps` or `lead_counters` — the grants are revoked, so even a policy
  mistake cannot expose data.
* The tablet writes through `submit_registration(payload jsonb)`, a
  `SECURITY DEFINER` function — the only door into the database.
* Being authenticated is **not** enough: `is_admin()` requires an active row in
  `admin_profiles`. A random Supabase user sees zero rows and can change nothing.
* The `service_role` key is never used by the front-end and must never be put in
  `.env`, in the repository, or in GitHub variables.

These rules were verified against a live PostgreSQL instance: as `anon`, every
forbidden operation fails with `permission denied`, while `submit_registration`
and the duplicate check succeed.

---

## 7. Offline mode

Development priority #1 is **never lose a lead**. The flow:

```
visitor presses "Trimite"
        │
        ▼
1. a UUID is generated on the tablet
2. the whole registration is written to IndexedDB      ← survives a crash,
        │                                                a reload, a flat battery
        ▼
3. try to upload the signature PNG to Supabase Storage
4. call submit_registration(payload)
        │
   ┌────┴─────┐
   ▼          ▼
success     failure (no Wi-Fi, server error, tab closed)
   │          │
   │          └─► the record STAYS in IndexedDB and is retried:
   │                • when the browser fires "online"
   │                • every 20 seconds while anything is pending
   │                • when the tab becomes visible again
   │                • when the operator presses "Sync now"
   │                • on the next app start
   ▼
the local copy is deleted, the lead number is shown
```

* Because the UUID is the **primary key**, `submit_registration` returns the
  existing row instead of inserting a second one. Retrying is always safe.
* If the signature cannot be uploaded (offline), the PNG is stored as base64 in
  `registrations.signature_data` — the signature is never lost either.
* The tablet caches the event configuration in `localStorage`, so the form keeps
  working even if the venue Wi-Fi disappears completely.
* The connection indicator is visible on both the tablet banner and the admin
  top bar: `Online` / `Offline` / `Pending sync: 4`.
* **Admin → Settings → Local queue on this device** lists anything still waiting
  on that particular device and offers a "Force sync" button.

> One caveat worth knowing: the local queue lives **in the browser of that
> specific tablet**. Do not clear the browser data of a tablet that still shows
> pending items, and finish the sync before wiping a device.

---

## 8. Everyday usage at an event

**Before the event**

1. Admin → **Events** → **New event** (or **Duplicate** last year's — the whole
   form configuration comes with it).
2. Configure the form, preview it.
3. **Set as active**.
4. Print the QR code if you want visitors to register from their own phones.
5. On the tablet, open the site once **while online** so the configuration is
   cached, then add it to the home screen.

**During the event**

* The tablet stays on the registration screen; after each visitor it resets by
  itself in ~5 seconds (configurable in Settings).
* Watch the connection badge — if it says `Pending sync: n`, leads are safe
  locally and will upload when the network returns.

**After the event**

1. Make sure `Pending sync` is 0 on **every** tablet you used.
2. Admin → **Leads** → filter by the event → **Export current event**.
3. Work through the leads: set the status, assign a sales representative, add
   internal notes and a follow-up date.
4. Archive the event (leads stay in the database forever).

---

## 9. Free-tier limits

Supabase Free (at the time of writing) gives roughly:

* 500 MB database
* 1 GB file storage
* 5 GB bandwidth / month
* projects are paused after ~1 week of complete inactivity (one click to restore)

What that means for you in practice: a lead row plus its answers is on the order
of a few kB, so **hundreds of thousands of leads** fit in 500 MB. A signature PNG
is roughly 10–30 kB, so 1 GB is tens of thousands of signatures. GitHub Pages has
a 1 GB site limit and a soft 100 GB/month bandwidth limit — irrelevant here.

To keep the project from pausing between events, just open the admin once every
few days (or export your leads regularly, which you should do anyway).

---

## 10. Troubleshooting

**"Aplicația nu este configurată" on the registration screen**
`.env` is missing or wrong locally; on the deployed site the GitHub *Variables*
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing. Note they must be
under **Variables**, not **Secrets**, and you must re-run the workflow after
adding them.

**"Niciun eveniment activ" on the tablet**
No event has `status = active` **and** the active flag. Admin → Events →
**Set as active**.

**Login says "Contul există, dar nu are drept de administrator"**
The Supabase Auth user exists but has no row in `admin_profiles`. Run
`supabase/05_first_admin.sql` with that e-mail.

**Login fails with "E-mail sau parolă incorectă"**
Check the user in Supabase → Authentication → Users. If the user is not
confirmed, use "Confirm user" or recreate it with *Auto Confirm User* ticked.

**The page is blank after deploying to GitHub Pages**
Almost always the base path. The workflow sets
`VITE_BASE_PATH=/<repository-name>/` automatically; if you renamed the repository,
re-run the workflow. Check the browser console for 404s on `/assets/…`.

**Excel shows `Ã¢` instead of `â`**
You opened the `.csv` by double-clicking in an old Excel. Use the `.xlsx` export,
or in Excel use *Data → From Text/CSV* and pick UTF-8. The CSV already contains a
UTF-8 BOM, which modern Excel honours.

**A signature is missing on a lead**
Either the event had signatures disabled, or the visitor left it empty when it was
optional. If it was captured offline it may be stored as base64 — the admin lead
detail shows both cases identically.

**The tablet shows "Pending sync" and it does not go down**
Open Admin → Settings on that device → **Force sync**, and check the "try"
counter. If the number keeps rising, the device has no route to Supabase (captive
portal Wi-Fi at the venue is a common cause) — tether to a phone for a minute.

**I want to reset everything and start over**
Run `01`–`04` again on a fresh Supabase project. All the SQL files are idempotent
and can also be re-run on an existing project without losing data.

---

## 11. Data ownership & backup

The database belongs to Color Metal. There is no form platform in the middle and
no vendor that can lock you out.

* **Export at any time**: Admin → Leads → Export all (XLSX or CSV).
* **Full database dump** (Supabase dashboard → Database → Backups), or with the
  Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db dump -f cm_leads_backup.sql
```

* Even if you stop using this application entirely, the data stays readable in
  plain PostgreSQL tables (`registrations` + `registration_answers`) and can be
  moved to any other PostgreSQL host.

A sensible routine: export to Excel after every event, and take a database dump
once a quarter.

---

## Useful commands

```bash
npm install        # install dependencies
npm run dev        # local development server
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

---

*CM Event Leads · Color Metal SRL · Partner in Engineering*
