# TradeJournal Pro — Supabase + Vercel setup

The app now uses **Supabase** for real accounts and persistent trade data
(previously everything, including passwords, was just stored in the
browser's `localStorage`, which never survives a redeploy). Follow these
steps in order.

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Wait for it to finish provisioning (~2 minutes).

## 2. Create the database tables

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` (in this project) and click **Run**.
   This creates two tables — `profiles` and `trades` — with Row Level Security
   turned on, so each user can only ever read/write their own data.

## 3. Get your API keys

1. In the Supabase dashboard: **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key (not `service_role`).

## 4. Configure environment variables locally

```bash
cd vite-app
cp .env.example .env
```

Open `.env` and paste in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Then run it locally:

```bash
npm install
npm run dev
```

## 5. (Optional) Email confirmation

By default, Supabase requires users to confirm their email before they can
log in. For quick testing you can turn this off:
**Authentication → Providers → Email → "Confirm email"** → disable.
For a real production app, leave it enabled.

## 6. Deploy to Vercel

1. Push this project to a GitHub repo.
2. In Vercel: **Add New → Project → Import** your repo.
3. **Important:** since the app lives in the `vite-app` folder, set
   **Root Directory** to `vite-app` in the Vercel project configuration screen
   (Vercel will detect it as a Vite project automatically once you do).
4. Add the environment variables under **Settings → Environment Variables**
   (add them for Production, Preview, and Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Vercel will run `npm run build` and serve the `dist` folder.
   `vercel.json` already includes an SPA rewrite so any direct/refreshed
   URL still loads the app correctly.

## What changed under the hood

- `src/lib/supabaseClient.js` — creates the Supabase client from your env vars.
- `src/pages/AuthPage.jsx` — sign up / log in now go through real Supabase Auth
  instead of a fake `localStorage` password store.
- `src/App.jsx` — listens to the Supabase auth session and loads the user's
  saved setup ("profile") from the `profiles` table.
- `src/pages/DashboardPage.jsx` — imported trades are now saved to (and
  loaded from) the `trades` table instead of `localStorage`, so your journal
  is no longer wiped on redeploy or lost when switching devices.
- `supabase/schema.sql` — the two tables plus Row Level Security policies.
- `vercel.json` — build settings + SPA rewrite for a clean Vercel deploy.

Nothing about the UI, charts, CSV import format, or analytics logic changed —
only where accounts and trades are stored.
