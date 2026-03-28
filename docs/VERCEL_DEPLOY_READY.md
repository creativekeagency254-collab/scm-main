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
5. `FONBNK_SOURCE`
6. `FONBNK_URL_SIGNATURE_SECRET`
7. `FONBNK_CLIENT_ID`
8. `FONBNK_CLIENT_SECRET`
9. `FONBNK_CALLBACK_URL`
10. `FONBNK_WEBHOOK_URL`
11. `FONBNK_WEBHOOK_ENFORCE`
12. `FONBNK_WEBHOOK_TOKEN`
13. `FONBNK_WEBHOOK_SECRET`
14. `FONBNK_WEBHOOK_REPLAY_ENFORCE`
15. `AUTO_PAYOUT_ADMIN_TOKEN`
16. `VITE_API_BASE` (set empty for same-origin `/api` routes)
17. `MPESA_ENVIRONMENT`
18. `MPESA_CONSUMER_KEY`
19. `MPESA_CONSUMER_SECRET`
20. `MPESA_PASSKEY`
21. `MPESA_SHORTCODE`
22. `MPESA_CALLBACK_SECRET`
23. `MPESA_SIMULATION_TOKEN`

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
