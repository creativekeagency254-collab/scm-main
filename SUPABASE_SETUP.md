# Supabase Setup

> Note: The source of truth is the SQL files in `supabase/migrations`. Apply every migration in order, including `20260319_fix_request_withdrawal_new_balance.sql`, `20260320_security_hardening.sql`, `20260320_payments_fraud_and_scale.sql`, `20260320_dashboard_overview_records.sql`, `20260320_loophole_and_malfunction_guards.sql`, `20260320_referral_first_deposit_guard.sql`, `20260320_payment_flags_admin_triage.sql`, `20260320_video_views_deposit_gate.sql`, `20260320_user_upgrade_security.sql`, `20260320_admin_1m_scale.sql`, and `20260320_webhook_security_hardening.sql`. The legacy SQL section below is archival reference only and is not the source of truth.

This project uses Supabase for auth and data when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

## 1. Environment Variables
Create a `.env` file (or set these in Vercel):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Leave empty on Vercel so frontend requests use same-origin `/api/*`.
VITE_API_BASE=
VITE_ENABLE_TAWK_CHAT=0
```

For local development with a separate backend host, you can still set:

```
VITE_API_BASE=http://localhost:8787
```

For E2E tests (optional):

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
KORA_PUBLIC_KEY=your_kora_public_key
KORA_SECRET_KEY=your_kora_secret_key
KORA_WEBHOOK_URL=https://your-domain.com/api/v1/webhook/kora
API_BASE=http://localhost:8787
KORA_WEBHOOK_ENFORCE=1
KORA_WEBHOOK_TOKEN=your_shared_webhook_token
KORA_WEBHOOK_HMAC_SECRET=your_webhook_hmac_secret
KORA_WEBHOOK_REQUIRE_TIMESTAMP=1
KORA_WEBHOOK_REPLAY_ENFORCE=1
KORA_WEBHOOK_MAX_SKEW_SECONDS=300
AUTO_PAYOUT_ADMIN_TOKEN=your_strong_random_admin_token
```

Quick Vercel deployment checks:

```
npm run vercel:preflight
npm run build
npm run vercel:deploy
```

## 2. Database Schema (SQL)
Run these in Supabase SQL editor, in order:

1) `supabase/migrations/20260314_mvp.sql`
2) `supabase/migrations/20260314_claim_earning.sql`
3) `supabase/migrations/20260315_rls_and_functions.sql`
4) `supabase/migrations/20260315_tier_gate.sql` OR `supabase/migrations/20260315_allow_earnings_without_deposit.sql` (choose one)
5) `supabase/migrations/20260315_withdrawal_deposit_gate.sql`
6) `supabase/migrations/20260319_fix_request_withdrawal_new_balance.sql`
7) `supabase/migrations/20260320_security_hardening.sql`
8) `supabase/migrations/20260320_payments_fraud_and_scale.sql`
9) `supabase/migrations/20260320_dashboard_overview_records.sql`
10) `supabase/migrations/20260320_loophole_and_malfunction_guards.sql`
11) `supabase/migrations/20260320_referral_first_deposit_guard.sql`
12) `supabase/migrations/20260320_payment_flags_admin_triage.sql`
13) `supabase/migrations/20260320_video_views_deposit_gate.sql`
14) `supabase/migrations/20260320_user_upgrade_security.sql`
15) `supabase/migrations/20260320_admin_1m_scale.sql`
16) `supabase/migrations/20260320_webhook_security_hardening.sql`

Important:
- If you already applied `20260315_withdrawal_deposit_gate.sql`, still run `20260319_fix_request_withdrawal_new_balance.sql`.
- Use only one earnings-gate variant: `20260315_tier_gate.sql` or `20260315_allow_earnings_without_deposit.sql`.
- Run `20260320_security_hardening.sql` to enforce strict tier deposit amounts, atomic deposit confirmation, and tighter anti-escalation RLS rules.
- Run `20260320_payments_fraud_and_scale.sql` to add payment audit/flag telemetry and high-volume indexes for 1M+ users.
- Run `20260320_dashboard_overview_records.sql` to log tier upgrades and power dashboard metrics (`get_my_dashboard_overview`).
- Run `20260320_loophole_and_malfunction_guards.sql` to close wallet/status/referral loopholes and prevent malformed state transitions.
- Run `20260320_referral_first_deposit_guard.sql` to enforce referral commission only on the referred user's first successful deposit.
- Run `20260320_payment_flags_admin_triage.sql` to allow admin triage updates on `payment_flags` and auto-manage `resolved_at`.
- Run `20260320_video_views_deposit_gate.sql` to block `video_views` inserts until the user has a successful deposit for their current tier.
- Run `20260320_user_upgrade_security.sql` to block user-side tier/referral tampering and require confirmed deposits before tier activation.
- Run `20260320_admin_1m_scale.sql` to add admin-scale RPCs (`get_admin_system_overview`, `get_admin_tier_distribution`) plus additional indexes for 1M+ user reporting.
- Run `20260320_webhook_security_hardening.sql` to add durable webhook replay protection (`register_payment_webhook_receipt`) and admin visibility for webhook receipts.

Legacy schema (no longer used) is below:

## 3. Brutal E2E test (optional)
Runs a full batch: signup, referral, videos, claim, deposit+webhook, withdrawal.

```
node scripts/e2e_brutal_test.mjs
```

The script auto-loads `.env` and `server/.env` if present.

Optional env:

```
BRUTAL_USERS=3
BRUTAL_BATCHES=1
CLEANUP=1
TEST_PASSWORD=Passw0rd!
```

```sql
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  avatar_url text,
  balance numeric,
  join_number integer,
  ref_code text,
  referred_by text,
  role text default 'client',
  category text default 'Client',
  status text default 'Active',
  tier text default 'Regular',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists profiles_ref_code_key on profiles (ref_code);

create table if not exists client_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  amount numeric,
  method text,
  status text,
  note text,
  created_at timestamptz default now()
);

create table if not exists client_referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_user_id uuid references auth.users(id) on delete cascade,
  level integer,
  name text,
  email text,
  tier text,
  bonus numeric,
  status text,
  earnings numeric,
  created_at timestamptz default now()
);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric,
  method text,
  status text,
  phone text,
  tier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  amount numeric,
  method text,
  status text,
  created_at timestamptz default now()
);
```

## 3. RLS Policies (SQL)
Run this after the schema:

```sql
alter table profiles enable row level security;
alter table client_transactions enable row level security;
alter table client_referrals enable row level security;
alter table withdrawals enable row level security;
alter table transactions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Profiles
create policy "profiles_select_self" on profiles
for select using (auth.uid() = id or public.is_admin());
create policy "profiles_select_referrals" on profiles
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and profiles.referred_by = p.ref_code
  )
);
create policy "profiles_insert_self" on profiles
for insert with check (auth.uid() = id);
create policy "profiles_update_self" on profiles
for update using (auth.uid() = id or public.is_admin());

-- Client data
create policy "client_tx_select" on client_transactions
for select using (auth.uid() = user_id or public.is_admin());
create policy "client_tx_insert" on client_transactions
for insert with check (auth.uid() = user_id or public.is_admin());

create policy "client_refs_select" on client_referrals
for select using (auth.uid() = user_id or public.is_admin());
create policy "client_refs_insert" on client_referrals
for insert with check (auth.uid() = user_id or public.is_admin());

-- Referral rewards (3 levels: 10% / 2% / 1%)
create or replace function public.apply_referral_rewards(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int := 1;
  v_ref_code text;
  v_ref_id uuid;
  v_next_code text;
  v_bonus numeric;
begin
  select referred_by into v_ref_code from profiles where id = p_user_id;

  while v_level <= 3 and v_ref_code is not null and v_ref_code <> '' loop
    select id, referred_by into v_ref_id, v_next_code from profiles where ref_code = v_ref_code;
    exit when v_ref_id is null;

    if v_level = 1 then
      v_bonus := p_amount * 0.10;
    elsif v_level = 2 then
      v_bonus := p_amount * 0.02;
    else
      v_bonus := p_amount * 0.01;
    end if;

    insert into client_referrals (user_id, source_user_id, level, name, email, tier, bonus, status, earnings, created_at)
    select v_ref_id, p_user_id, v_level, p.name, p.email, p.tier, v_bonus, 'Pending', 0, now()
    from profiles p
    where p.id = p_user_id;

    insert into transactions (user_id, type, amount, method, status, created_at)
    values (v_ref_id, concat('Referral Bonus L', v_level), v_bonus, 'Referral', 'Pending', now());

    v_ref_code := v_next_code;
    v_level := v_level + 1;
  end loop;
end;
$$;

create or replace function public.handle_deposit_referrals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.type ilike 'deposit%' and new.status ilike 'paid%') then
    perform public.apply_referral_rewards(new.user_id, new.amount);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deposit_referrals on transactions;
create trigger trg_deposit_referrals
after insert on transactions
for each row execute function public.handle_deposit_referrals();

-- Admin tables
create policy "withdrawals_select" on withdrawals
for select using (auth.uid() = user_id or public.is_admin());
create policy "withdrawals_insert" on withdrawals
for insert with check (auth.uid() = user_id or public.is_admin());
create policy "withdrawals_update_admin" on withdrawals
for update using (public.is_admin());

create policy "transactions_select" on transactions
for select using (auth.uid() = user_id or public.is_admin());
create policy "transactions_insert" on transactions
for insert with check (auth.uid() = user_id or public.is_admin());
```

## 4. Make an Admin
After your first admin user signs up, run:

```sql
update profiles
set role = 'admin'
where email = 'admin@example.com';
```

## 5. Google OAuth
Enable Google in Supabase Auth, then add the redirect URLs for your local and production domains.
Your app uses `window.location.origin` for OAuth redirects.

Steps:
1. Google Cloud Console: create or select a project.
2. Configure OAuth consent screen (external), then publish it.
3. Create OAuth Client ID (Web application).
4. Add the Supabase redirect URL shown in the Google provider panel as an authorized redirect URI.
5. Copy the Google Client ID + Client Secret into Supabase Auth -> Providers -> Google.
6. In Supabase Auth -> URL Configuration, set `Site URL` and add your `http://localhost:5000` (and production) to `Additional Redirect URLs`.

## 6. Referral Codes
When a user signs up, the optional referral code is stored as `referred_by` on their profile.
Each user also gets a generated `ref_code` for sharing their own referral link.

## 7. Security Hardening (Recommended for Production)
Run this AFTER the base schema/RLS to lock down rewards, withdrawals, and referral abuse.

```sql
-- === Tier rules (server-authoritative reward limits) ===
create table if not exists tier_rules (
  tier text primary key,
  deposit numeric,
  manual_videos int,
  bot_videos int,
  video_price numeric default 50,
  bot_multiplier numeric default 0.4,
  updated_at timestamptz default now()
);

insert into tier_rules (tier, deposit, manual_videos, bot_videos, video_price, bot_multiplier) values
('Regular',       5000,   2,  2, 50, 0.4),
('Standard',     10000,   4,  6, 50, 0.4),
('Deluxe',       20000,   8, 18, 50, 0.4),
('Executive',    50000,  20, 38, 50, 0.4),
('Executive Pro',100000, 40, 38, 50, 0.4)
on conflict (tier) do update
set deposit = excluded.deposit,
    manual_videos = excluded.manual_videos,
    bot_videos = excluded.bot_videos,
    video_price = excluded.video_price,
    bot_multiplier = excluded.bot_multiplier,
    updated_at = now();

-- === Earning claims & replay protection ===
create table if not exists earning_claims (
  user_id uuid references auth.users(id) on delete cascade,
  day date not null,
  manual_count int not null default 0,
  bot_count int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, day)
);

create table if not exists earning_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  user_id uuid references auth.users(id) on delete cascade,
  kind text,
  qty int,
  created_at timestamptz default now()
);

alter table earning_claims enable row level security;
alter table earning_events enable row level security;

drop policy if exists "earning_claims_select" on earning_claims;
create policy "earning_claims_select" on earning_claims
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "earning_events_select" on earning_events;
create policy "earning_events_select" on earning_events
for select using (auth.uid() = user_id or public.is_admin());

-- === Tighten client inserts ===
drop policy if exists "client_tx_insert" on client_transactions;
create policy "client_tx_insert_admin" on client_transactions
for insert with check (public.is_admin());

drop policy if exists "client_refs_insert" on client_referrals;
create policy "client_refs_insert_admin" on client_referrals
for insert with check (public.is_admin());

drop policy if exists "transactions_insert" on transactions;
drop policy if exists "transactions_insert_pending" on transactions;
drop policy if exists "transactions_insert_admin" on transactions;
create policy "transactions_insert_pending" on transactions
for insert with check (
  auth.uid() = user_id
  and type ilike 'deposit%'
  and status ilike 'pending%'
);
create policy "transactions_insert_admin" on transactions
for insert with check (public.is_admin());

drop policy if exists "withdrawals_insert" on withdrawals;
create policy "withdrawals_insert_admin" on withdrawals
for insert with check (public.is_admin());

-- === Prevent referral + balance tampering ===
create or replace function public.prevent_referral_change()
returns trigger
language plpgsql
as $$
begin
  if (old.referred_by is not null and old.referred_by <> '' and new.referred_by is distinct from old.referred_by) then
    raise exception 'referred_by cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_referral_change on profiles;
create trigger trg_prevent_referral_change
before update on profiles
for each row execute function public.prevent_referral_change();

create or replace function public.prevent_profile_balance_update()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.balance is distinct from old.balance then
      raise exception 'balance is system-managed';
    end if;
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed';
    end if;
    if new.ref_code is distinct from old.ref_code then
      raise exception 'ref_code cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_updates on profiles;
create trigger trg_prevent_profile_updates
before update on profiles
for each row execute function public.prevent_profile_balance_update();

-- === Referral rewards: only first paid deposit + referrer must be paid ===
create or replace function public.apply_referral_rewards(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int := 1;
  v_ref_code text;
  v_ref_id uuid;
  v_next_code text;
  v_bonus numeric;
  v_ref_paid boolean;
begin
  select referred_by into v_ref_code from profiles where id = p_user_id;

  while v_level <= 3 and v_ref_code is not null and v_ref_code <> '' loop
    select id, referred_by into v_ref_id, v_next_code from profiles where ref_code = v_ref_code;
    exit when v_ref_id is null;

    select exists(
      select 1 from transactions
      where user_id = v_ref_id
        and type ilike 'deposit%'
        and status ilike 'paid%'
    ) into v_ref_paid;

    if v_ref_paid then
      if v_level = 1 then
        v_bonus := p_amount * 0.10;
      elsif v_level = 2 then
        v_bonus := p_amount * 0.02;
      else
        v_bonus := p_amount * 0.01;
      end if;

      insert into client_referrals (user_id, source_user_id, level, name, email, tier, bonus, status, earnings, created_at)
      select v_ref_id, p_user_id, v_level, p.name, p.email, p.tier, v_bonus, 'Pending', 0, now()
      from profiles p
      where p.id = p_user_id;

      insert into transactions (user_id, type, amount, method, status, created_at)
      values (v_ref_id, concat('Referral Bonus L', v_level), v_bonus, 'Referral', 'Pending', now());
    end if;

    v_ref_code := v_next_code;
    v_level := v_level + 1;
  end loop;
end;
$$;

create or replace function public.handle_deposit_referrals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_paid boolean;
begin
  if (new.type ilike 'deposit%' and new.status ilike 'paid%') then
    select exists(
      select 1 from transactions
      where user_id = new.user_id
        and type ilike 'deposit%'
        and status ilike 'paid%'
        and id <> new.id
    ) into v_already_paid;

    if not v_already_paid then
      perform public.apply_referral_rewards(new.user_id, new.amount);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deposit_referrals on transactions;
create trigger trg_deposit_referrals
after insert on transactions
for each row execute function public.handle_deposit_referrals();

-- === Secure earning claims (server time + limits + replay protection) ===
create or replace function public.claim_earning(p_kind text, p_qty int, p_event_id text)
returns table(credited_amount numeric, new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := current_date;
  v_manual_limit int;
  v_bot_limit int;
  v_price numeric;
  v_bot_mult numeric;
  v_manual int;
  v_bot int;
  v_credit numeric;
  v_balance numeric;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100 then
    raise exception 'Invalid quantity';
  end if;
  if p_kind not in ('manual','bot') then
    raise exception 'Invalid kind';
  end if;
  if p_event_id is null or length(p_event_id) < 6 then
    raise exception 'Invalid event id';
  end if;

  if (select count(*) from earning_events where user_id = v_user and created_at > now() - interval '30 seconds') > 40 then
    raise exception 'Rate limit exceeded';
  end if;

  insert into earning_events (event_id, user_id, kind, qty)
  values (p_event_id, v_user, p_kind, p_qty);

  select tr.manual_videos, tr.bot_videos, tr.video_price, tr.bot_multiplier
  into v_manual_limit, v_bot_limit, v_price, v_bot_mult
  from profiles p
  join tier_rules tr on lower(tr.tier) = lower(p.tier)
  where p.id = v_user;

  if not found then
    raise exception 'Tier rules missing';
  end if;

  insert into earning_claims (user_id, day) values (v_user, v_day)
  on conflict (user_id, day) do nothing;

  select manual_count, bot_count into v_manual, v_bot
  from earning_claims
  where user_id = v_user and day = v_day
  for update;

  if p_kind = 'manual' then
    if (v_manual + p_qty) > v_manual_limit then
      raise exception 'Manual daily limit exceeded';
    end if;
    v_credit := p_qty * v_price;
    update earning_claims set manual_count = v_manual + p_qty, updated_at = now()
    where user_id = v_user and day = v_day;
  else
    if (v_bot + p_qty) > v_bot_limit then
      raise exception 'Bot daily limit exceeded';
    end if;
    v_credit := p_qty * (v_price * v_bot_mult);
    update earning_claims set bot_count = v_bot + p_qty, updated_at = now()
    where user_id = v_user and day = v_day;
  end if;

  update profiles
  set balance = coalesce(balance, 0) + v_credit, updated_at = now()
  where id = v_user
  returning balance into v_balance;

  insert into client_transactions (user_id, type, amount, method, status, note, created_at)
  values (v_user, 'Earning', v_credit, p_kind, 'Credited', 'Auto', now());

  return query select v_credit, v_balance;
end;
$$;

-- === Secure withdrawal requests (server time + balance checks) ===
create or replace function public.request_withdrawal(p_amount numeric, p_method text, p_phone text)
returns table(new_balance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_day text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;
  v_day := trim(to_char(now(), 'Day'));
  if v_day not in ('Tuesday','Wednesday','Friday') then
    raise exception 'Withdrawals are closed today';
  end if;

  select coalesce(balance, 0) into v_balance
  from profiles
  where id = v_user
  for update;

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update profiles
  set balance = v_balance - p_amount, updated_at = now()
  where id = v_user
  returning balance into v_balance;

  insert into withdrawals (user_id, amount, method, status, phone, tier, created_at, updated_at)
  select v_user, p_amount, p_method, 'Pending', p_phone, p.tier, now(), now()
  from profiles p
  where p.id = v_user;

  insert into client_transactions (user_id, type, amount, method, status, note, created_at)
  values (v_user, 'Withdrawal', p_amount, p_method, 'Pending', 'Request', now());

  return query select v_balance;
end;
$$;
```
