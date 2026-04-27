# Vercel 404 Debug Guide

Use this guide when Vercel deployment says **Ready** but your URL returns **404**.

## Domain issue vs root directory issue
- If `https://YOUR-VERCEL-URL.vercel.app/deploy-test` works but custom domain fails, this is usually a domain/DNS configuration issue.
- If both `vercel.app` and custom domain 404, this is usually project configuration (root directory/framework/build settings).

## Test URLs
- `/api/ping`
- `/deploy-test`
- `/dashboard`
- `/api/health`

Example:
- `https://YOUR-VERCEL-URL.vercel.app/api/ping`
- `https://YOUR-VERCEL-URL.vercel.app/deploy-test`
- `https://YOUR-VERCEL-URL.vercel.app/dashboard`
- `https://YOUR-VERCEL-URL.vercel.app/api/health`

## Expected results
- `/api/ping` should always return JSON even if env vars are missing.
- `/deploy-test` should render a page with navigation links.
- `/dashboard` should render app UI.
- `/api/health` should return env readiness details.

## Root directory guidance
- If `package.json` is at repository root, **Root Directory should be blank/default**.
- If `package.json` is inside `app/`, set **Root Directory to `app`**.

## Vercel project settings to verify
- Framework Preset: **Next.js**
- Build Command: **npm run build**
- Output Directory: **blank/default**
- Install Command: default (`npm install`) unless customized

## Environment variable note
Missing environment variables usually break API behavior, not static routing pages.
If `/api/ping` and `/deploy-test` still 404, focus on Vercel project/root/domain config first.
