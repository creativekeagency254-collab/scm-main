# M-Pesa Daraja Sandbox MVP Setup

This project now includes an end-to-end Safaricom Daraja STK Push sandbox flow with:

- `POST /api/payments/mpesa/initiate`
- `POST /api/payments/mpesa/callback`
- `GET|POST /api/payments/verify/mpesa`
- `POST /api/payments/mpesa/simulate` (success/failure simulation)
- `GET /api/payments/status` (dashboard status API)
- `POST /api/admin/simulate/events` (admin simulation lab for deposits, withdrawals, transactions, and upgrades)

## 1. Environment Variables

Set these in local `.env` and in Vercel:

```env
PAYMENTS_MODE=sandbox
VITE_PAYMENTS_MODE=sandbox

MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your_safaricom_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_safaricom_sandbox_consumer_secret
MPESA_PASSKEY=your_safaricom_sandbox_passkey
MPESA_SHORTCODE=174379

MPESA_CALLBACK_SECRET=your_random_callback_secret
MPESA_CALLBACK_SIGNATURE_ENFORCE=0
MPESA_SIMULATION_TOKEN=your_random_simulation_token

MPESA_TEST_PHONE=254708374149
MPESA_TEST_AUTH_TOKEN=
```

Notes:

1. Keep all keys server-side only.
2. Do not expose `MPESA_*` secrets in frontend env vars.
3. `MPESA_CALLBACK_SIGNATURE_ENFORCE=0` is recommended for Daraja sandbox callbacks (Daraja does not provide a native callback HMAC signature).

## 2. Supabase Migration

Apply the new migration:

`supabase/migrations/20260327_mpesa_sandbox_mvp.sql`

It adds:

1. `courses`
2. `course_access`
3. Extended `payments` fields (`payment_reference`, `payment_type`, `environment`, `payment_timestamp`, etc.)
4. `mpesa_stk_requests` tracking for STK callback lifecycle

## 3. Local Run

```bash
npm run dev:full
```

Frontend: `http://localhost:5000`  
API: `http://localhost:5001`

## 4. Sandbox E2E Test

Use the included script (requires a valid signed-in Supabase access token):

```bash
npm run payments:mpesa:test
```

The script runs:

1. STK initiate
2. Simulated success callback
3. Simulated failure callback
4. Verify status and dashboard status checks

The script sends `allowSandboxFallback=true` during initiate so tests still proceed if Safaricom sandbox is temporarily busy.

## 5. Admin Simulation Lab

Admin Settings now includes a **Simulation Lab** that calls:

`POST /api/admin/simulate/events`

Supported actions:

1. `deposit_success`
2. `deposit_failed`
3. `withdrawal_pending`
4. `withdrawal_paid`
5. `tier_upgrade`
6. `earning_tx`
7. `referral_tx`
8. `adjustment_tx`

These events are designed to appear in:

1. Admin Payments table
2. Admin Transactions table
3. Admin Withdrawals table
4. Tier upgrade history/events

## 6. Redeploy Workflow

1. Apply SQL migration in Supabase.
2. Set/update env vars in Vercel Project Settings.
3. Run preflight:
   `npm run vercel:preflight`
4. Deploy:
   `npm run vercel:deploy:prod`

## 7. Switching to Production (Live)

When ready for live:

1. Replace sandbox credentials with live Daraja credentials:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_PASSKEY`
   - `MPESA_SHORTCODE`
2. Set:
   - `MPESA_ENVIRONMENT=live`
   - `PAYMENTS_MODE=live`
   - `VITE_PAYMENTS_MODE=live`
3. Disable simulation in live:
   - Keep `MPESA_SIMULATION_TOKEN` unset (or rotate and lock down access)
   - Do not expose simulation endpoint to public operators
4. Ensure callback URL is HTTPS and reachable publicly.

## 8. Auth Reliability (Email + Google)

1. In Supabase Dashboard > Authentication > Providers:
   1. Enable Email provider with **Confirm email** enabled.
   2. Enable Google provider if Google sign-in is required.
2. Ensure `SITE_URL` and redirect URLs include your Vercel domain.
3. Users who signed up with Google can set an email/password later from in-app Settings (Account Security section).
