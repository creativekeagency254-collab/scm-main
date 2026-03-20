# Vercel Deploy Ready (Do Not Deploy Yet)

Status: prepared and validated, deployment not executed.

## Local readiness checks completed

1. Dependencies installed at repo root: `npm install`
2. Dependencies installed in `server/`: `npm install`
3. Vercel preflight passed: `npm run vercel:preflight`
4. Production build passed: `npm run build`
5. Syntax checks passed for API/server runtime files.

## Vercel project linkage

Linked project metadata exists in `.vercel/project.json`.

## Required environment variables in Vercel (Production)

Set these in Vercel Project Settings -> Environment Variables:

1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`
3. `SUPABASE_URL`
4. `SUPABASE_SERVICE_ROLE_KEY`
5. `KORA_PUBLIC_KEY`
6. `KORA_SECRET_KEY`
7. `KORA_CALLBACK_URL`
8. `KORA_WEBHOOK_URL`
9. `KORA_WEBHOOK_ENFORCE`
10. `KORA_WEBHOOK_TOKEN`
11. `KORA_WEBHOOK_HMAC_SECRET`
12. `KORA_WEBHOOK_REQUIRE_TIMESTAMP`
13. `KORA_WEBHOOK_REPLAY_ENFORCE`
14. `KORA_WEBHOOK_MAX_SKEW_SECONDS`
15. `AUTO_PAYOUT_ADMIN_TOKEN`
16. `VITE_API_BASE` (set empty for same-origin `/api` routes)

## Deploy commands (run only when token is provided)

```bash
npx vercel pull --yes --environment=production --token <VERCEL_TOKEN>
npx vercel deploy --prod --yes --token <VERCEL_TOKEN>
```

Optional post-deploy inspect:

```bash
npx vercel inspect <DEPLOYMENT_URL> --token <VERCEL_TOKEN>
```

## Notes

1. This repo is prepared for deployment now.
2. Deployment has intentionally not been triggered yet.
