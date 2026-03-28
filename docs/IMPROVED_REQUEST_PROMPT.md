# Improved Build Prompt (Ready To Reuse)

Build and deploy a **sandbox-ready EdisonPay MVP** with Safaricom Daraja and Supabase.

## Scope
1. Use **M-Pesa Daraja sandbox only**.
2. Keep all payment secrets in server-side env vars.
3. Fix auth UX so users can reliably:
   1. Sign up with email/password.
   2. Verify email before login.
   3. Sign in again later.
   4. Use Google sign-in and set a password from Settings.
4. Simplify Wallet/Deposit flow for low-tech users (clear steps, minimal wording).
5. Ensure Admin and Client dashboards reflect payment updates quickly.
6. Redeploy on Vercel and provide deployment link.

## M-Pesa Sandbox Credentials
- `MPESA_CONSUMER_KEY=...`
- `MPESA_CONSUMER_SECRET=...`
- `MPESA_PASSKEY=...`
- `MPESA_SHORTCODE=174379`
- `MPESA_ENVIRONMENT=sandbox`
- `MPESA_API_BASE_URL=https://sandbox.safaricom.co.ke`
- `PAYMENTS_MODE=sandbox`
- `VITE_PAYMENTS_MODE=sandbox`

## Required Backend Endpoints
1. `POST /api/payments/mpesa/initiate`
2. `POST /api/payments/mpesa/callback`
3. `GET|POST /api/payments/verify/mpesa`
4. `POST /api/payments/mpesa/simulate` (success/failure scenarios)
5. `GET /api/payments/status` (dashboard status feed)

## Data Requirements (Supabase)
1. `users`
2. `courses`
3. `payments` with:
   1. `amount`
   2. `status`
   3. `payment_reference`
   4. `payment_type`
   5. `environment` (`sandbox`/`live`)
   6. `payment_timestamp`

## Security Requirements
1. Do not expose secrets to client-side env vars.
2. HTTPS callbacks only.
3. Callback token/signature validation enabled.

## Testing Requirements
1. Test number: `254708374149`.
2. Run success + failure simulations.
3. Confirm status appears in Admin + Client dashboards.
4. Confirm environment label appears as `Testing` in sandbox.

## Deliverables
1. Updated code.
2. Env checklist for Vercel + Supabase.
3. Test results summary.
4. Final Vercel deployment URL.
