# TaskPilot MVP

TaskPilot is an AI workflow copilot for guided execution, proof checking, and session persistence.

## 1) Install

```bash
npm install
```

## 2) Create `.env.local`

Create `.env.local` in the **project root** (same folder as `package.json`), then add:

```bash
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_ENABLED=false
TASKPILOT_ROBOT_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_TEAM_MONTHLY=
```

## 3) Run

```bash
npm run dev
```

## 4) Health check

Open:

```bash
http://localhost:3000/api/health
```

## 5) Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. Add env vars to `.env.local`.
6. Set `SUPABASE_DB_ENABLED=true`.
7. Restart:

```bash
npm run dev
```

8. Visit:

```bash
http://localhost:3000/settings/setup
```

## Notes

- If OpenAI key is missing/invalid, TaskPilot uses Mock Mode.
- Supabase DB routes gracefully fall back to local mode when disabled.

## Supabase Auth setup

In Supabase Auth URL configuration, add redirects:

- `http://localhost:3000/auth/callback`
- `https://taskpilot.live/auth/callback`
- `https://taskpilot.live/dashboard`

## Deployment (Vercel)

Set all required env vars in Vercel Project Settings, then redeploy.
Keep framework preset as Next.js and output directory blank.
