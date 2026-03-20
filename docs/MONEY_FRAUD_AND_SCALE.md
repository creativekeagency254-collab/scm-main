# Money Fraud Controls + 1M User Scale Plan

This document describes the production controls for:
1. Preventing payment fraud and duplicate credits.
2. Verifying Kora payment status before wallet credit.
3. Scaling Supabase/Postgres safely past 1M users.

## 1) Payment Integrity Controls

Current controls:
1. Tier/amount lock: deposits must match configured tier amount.
2. Idempotent credit: `confirm_deposit_success` settles wallet once per reference.
3. Atomic settlement: deposit status + wallet ledger update happen in one DB function.
4. No status downgrade: failed updates do not overwrite already-successful deposits.
5. Amount mismatch trap: provider amount must match expected deposit amount.
6. Fraud telemetry:
   - `payment_audit_events` logs every verify/webhook/reconcile decision.
   - `payment_flags` records suspicious cases (mismatch, missing deposit, processing errors).
7. Referral abuse guard: referral commission is awarded only on the referred user's first successful deposit.

## 2) Double-Check Flow (Kora)

1. `POST /api/v1/deposit/create` creates `deposits.status='pending'`.
2. Kora redirect/webhook returns tracking/reference.
3. Verify/webhook endpoint fetches live provider status from Kora.
4. Service compares provider amount to DB amount.
5. On exact match, call `confirm_deposit_success(reference)`.
6. DB function:
   - marks deposit `success`
   - writes wallet ledger transaction
   - upgrades user tier metadata
   - applies referral commission idempotently
7. If mismatch or malformed payload:
   - mark deposit `failed` (if not already success)
   - insert row in `payment_flags`
   - log decision in `payment_audit_events`

## 3) Reconciliation Job

Run periodically (every 5-15 minutes):

```bash
npm run reconcile:kora
```

Safety guard:
1. The job refuses to run when `KORA_MOCK=1` unless `ALLOW_MOCK_RECON=1`.
2. Only set `ALLOW_MOCK_RECON=1` in test/sandbox environments.

The script:
1. Scans recent pending/failed Kora deposits.
2. Re-queries Kora status by reference.
3. Confirms success via `confirm_deposit_success`.
4. Flags amount mismatches/errors for manual review.

Recommended scheduler:
1. Vercel Cron / GitHub Actions / server cron.
2. Alert if `payment_flags(status='open')` rises above threshold.

## 4) Monitoring Queries

Open unresolved payment flags:

```sql
select status, reason, merchant_reference, tracking_id, expected_amount, provider_amount, created_at
from public.payment_flags
where status = 'open'
order by created_at desc
limit 200;
```

Recent payment decisions:

```sql
select source, decision, merchant_reference, expected_amount, provider_amount, created_at
from public.payment_audit_events
order by created_at desc
limit 500;
```

Possible duplicate/reference risk scan:

```sql
select reference, count(*)
from public.transactions
where reference is not null
group by reference
having count(*) > 1;
```

## 5) 1M+ User Database Strategy

Required (already prepared by migrations):
1. High-cardinality indexes on deposits/transactions/video_views/payout queues.
2. Service-role settlement path only for money-changing operations.
3. Strict RLS + security-definer RPCs for wallet mutations.

Next scale steps:
1. Monthly partition `transactions` and `payment_audit_events` by `created_at`.
2. Keep hot data in primary table, archive old partitions.
3. Route reporting/admin dashboards to read replicas.
4. Add queue-based async workers for reconciliation and analytics.
5. Add daily integrity checks:
   - `wallet balance == sum(transactions.amount)` per user
   - no orphaned successful deposits without ledger rows
6. Add per-IP and per-user rate limits on deposit/verify endpoints.

## 6) Operational Policy

1. Never credit wallets directly from client code.
2. Never trust client-submitted amount/tier for settlement.
3. Only settle from provider-verified status + amount match.
4. Treat every mismatch as fraud-risk until reviewed.

## 7) Dashboard Data Feed (Supabase)

To power progress bar + account overview from trusted DB records:
1. `tier_upgrade_events` stores every tier increase event.
2. `get_my_dashboard_overview(p_tier)` returns one-row metrics payload for:
   - deposits
   - withdrawals
   - transactions
   - video earnings
   - referral earnings
   - referral counts
   - progress target/earned/percent

## 8) Loophole Guard Rails

Additional DB guards in `20260320_loophole_and_malfunction_guards.sql`:
1. `apply_wallet_tx` is strict + idempotent by reference and blocks negative balances.
2. Direct `apply_wallet_tx` execute is revoked from client roles (`anon`, `authenticated`).
3. Deposit and payout status transitions are validated by triggers.
4. Referral constraints prevent self-referrals and duplicate referral rows per deposit.
5. Referral constraints now also prevent multiple commission rows for the same referred user.
6. Admin triage policy can allow secure `payment_flags` status updates (`open/reviewed/resolved/ignored`) with automatic `resolved_at` handling.
