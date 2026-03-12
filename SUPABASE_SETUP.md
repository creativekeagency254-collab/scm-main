# Supabase Setup

This project uses Supabase for auth and data when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

## 1. Environment Variables
Create a `.env` file (or set these in Vercel):

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Database Schema (SQL)
Run this in Supabase SQL editor:

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
