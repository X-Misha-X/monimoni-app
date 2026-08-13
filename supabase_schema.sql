create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_src text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'ghost', 'removed')),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monimons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monimon_members (
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  invited_by_member_id uuid references public.members(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (monimon_id, member_id)
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  debt_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'paid', 'removed')),
  created_by_member_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, from_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, to_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, created_by_member_id) references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  requested_by_member_id uuid not null,
  detail text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  payment_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejected_by_member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, from_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, to_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, requested_by_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, rejected_by_member_id) references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.payment_request_approvals (
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  monimon_id uuid not null,
  member_id uuid not null,
  approved_at timestamptz not null default now(),
  primary key (payment_request_id, member_id),
  foreign key (monimon_id, member_id) references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  payment_request_id uuid references public.payment_requests(id) on delete set null,
  detail text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  payment_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, from_member_id) references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, to_member_id) references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.monimon_state (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();

drop trigger if exists monimons_updated_at on public.monimons;
create trigger monimons_updated_at before update on public.monimons for each row execute function public.set_updated_at();

drop trigger if exists monimon_members_updated_at on public.monimon_members;
create trigger monimon_members_updated_at before update on public.monimon_members for each row execute function public.set_updated_at();

drop trigger if exists debts_updated_at on public.debts;
create trigger debts_updated_at before update on public.debts for each row execute function public.set_updated_at();

drop trigger if exists payment_requests_updated_at on public.payment_requests;
create trigger payment_requests_updated_at before update on public.payment_requests for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

drop trigger if exists monimon_state_updated_at on public.monimon_state;
create trigger monimon_state_updated_at before update on public.monimon_state for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monimons enable row level security;
alter table public.monimon_members enable row level security;
alter table public.debts enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_request_approvals enable row level security;
alter table public.payments enable row level security;
alter table public.monimon_state enable row level security;
