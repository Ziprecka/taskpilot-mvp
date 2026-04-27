# Auth and Billing Setup

## Supabase Auth
1. Go to your Supabase project.
2. Open Authentication -> URL Configuration.
3. Set Site URL:
   - `https://taskpilot.live`
4. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://taskpilot.live/auth/callback`
   - `https://taskpilot.live/dashboard`
   - `https://taskpilot.live/login`
5. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
6. For beta testing (optional): Authentication -> Providers -> Email -> disable Confirm email if you want faster signup/login loops.

For production, keep email confirmation ON. For early private testing, disabling confirmation is faster.
If login says "Email not confirmed", click the confirmation email link, resend from `/login`, or temporarily disable confirm email for private beta.

## Profiles table
Run `supabase/schema.sql` to create `profiles` and `usage_events`.
`profiles` stores:
- name/email/avatar
- plan/subscription status
- Stripe IDs (future)
- onboarding state

## Vercel env vars

```env
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://taskpilot.live
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_ENABLED=true
TASKPILOT_ROBOT_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_TEAM_MONTHLY=
```

## Stripe future setup
- `/api/billing/create-checkout-session` placeholder added.
- `/api/billing/create-portal-session` placeholder added.
- `/api/billing/webhook` placeholder added.

Implementations are intentionally TODO until pricing goes live.

## Plan limits
- Free: 3 generated workflows/month, 5 active sessions
- Pro: unlimited + robot/proof/daily/export features
- Team: shared/team-oriented extensions (future)
