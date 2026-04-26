# Deploy TaskPilot to Vercel

## Prerequisites
- TaskPilot runs locally (`npm run dev`)
- Local production build works (`npm run build`)
- Supabase project created
- GitHub repository ready
- Vercel account ready

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial TaskPilot MVP"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Import into Vercel
1. Open Vercel dashboard.
2. Click **Add New Project**.
3. Import your GitHub repository.
4. Set framework preset to **Next.js**.
5. Configure environment variables.
6. Deploy.

## Environment Variables (Vercel)

```env
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_ENABLED=true
TASKPILOT_ROBOT_API_KEY=
```

## Supabase Production Setup
1. Open production Supabase project SQL Editor.
2. Run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. Confirm tables + seed rows are present.

## Health Check URLs
- `https://YOUR-VERCEL-URL.vercel.app/api/health`
- `https://YOUR-VERCEL-URL.vercel.app/settings/setup`
- `https://YOUR-VERCEL-URL.vercel.app/settings/robot`
- `https://YOUR-VERCEL-URL.vercel.app/settings/deploy`
- `https://YOUR-VERCEL-URL.vercel.app/settings/mobile`

## Mobile Install Steps
### iPhone (Safari)
1. Open deployed URL.
2. Tap Share.
3. Tap **Add to Home Screen**.

### Android (Chrome)
1. Open deployed URL.
2. Open menu.
3. Tap **Add to Home Screen** or **Install app**.

## Troubleshooting
- **Build fails on Vercel:** run `npm run build` locally and fix TypeScript/build errors first.
- **Supabase not syncing:** verify all Supabase env vars and `SUPABASE_DB_ENABLED=true`.
- **Robot API unauthorized:** ensure `x-taskpilot-robot-key` matches `TASKPILOT_ROBOT_API_KEY`.
- **PWA install not shown:** use deployed HTTPS URL, not localhost.
