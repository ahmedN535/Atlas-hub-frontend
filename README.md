# Atlas Hub Frontend

Vite + React frontend for Atlas Hub.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:5000` by default, so run the Express backend locally when you want live data.

## Backend URL

For deployed builds, set:

```bash
VITE_API_BASE_URL=https://your-render-backend.onrender.com
```

Leave `VITE_API_BASE_URL` empty for local development with the Vite proxy.

## Supabase authentication

1. Create a Supabase project and copy **Project URL** and **anon public** key into `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. In the Supabase SQL editor, run `supabase/profiles.sql` to create the `profiles` table, row-level security policies, and signup trigger.

3. In **Authentication → Providers**, enable Email (and optionally Google/GitHub). Set **Site URL** to `http://localhost:5173` for local dev.

4. Restart `npm run dev` after changing env vars.

Accounts are stored in Supabase Auth; profile rows live in `public.profiles`.

Run both SQL files in the Supabase SQL editor (in order):

1. `supabase/profiles.sql` — base table and signup trigger
2. `supabase/profiles_extend.sql` — bio, location, website, avatar, banner, role, privacy settings

## Current API contract

- `GET /api/agents`
- `GET /api/agents/:id`
- `POST /api/agents/search`
- `POST /api/agents/upload`
