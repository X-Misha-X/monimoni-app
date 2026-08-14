-- MONI MON! normalized core schema.
-- This migration is intentionally additive: it creates the target relational model
-- without dropping the legacy monimon_state table.

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  create type public.profile_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_kind as enum ('registered', 'guest');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.monimon_type as enum ('personal', 'group');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.settlement_mode as enum ('global', 'direct');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.membership_status as enum ('active', 'invited', 'removed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.record_status as enum ('pending', 'verified', 'rejected', 'deleted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.contact_status as enum ('pending', 'accepted', 'blocked', 'removed');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_kind as enum (
    'expense',
    'loan',
    'payment',
    'member_invite',
    'contact_request'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.approval_response as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  username citext,
  display_name text not null default 'Usuario',
  avatar_url text,
  country_code text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email citext;
alter table public.profiles add column if not exists username citext;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists role public.profile_role not null default 'user';

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email::text))
  where email is not null;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username::text))
  where username is not null;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  kind public.member_kind not null default 'registered',
  display_name text not null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_registered_profile_required check (
    (kind = 'registered' and profile_id is not null)
    or (kind = 'guest')
  )
);

alter table public.members add column if not exists kind public.member_kind not null default 'registered';
alter table public.members add column if not exists claimed_at timestamptz;

create unique index if not exists members_profile_unique_idx
  on public.members (profile_id)
  where profile_id is not null;

create table if not exists public.monimons (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  type public.monimon_type not null default 'group',
  settlement_mode public.settlement_mode not null default 'global',
  default_currency text not null default 'ARS',
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.monimons add column if not exists owner_profile_id uuid references public.profiles(id) on delete set null;
alter table public.monimons add column if not exists type public.monimon_type not null default 'group';
alter table public.monimons add column if not exists settlement_mode public.settlement_mode not null default 'global';
alter table public.monimons add column if not exists default_currency text not null default 'ARS';
alter table public.monimons add column if not exists archived_at timestamptz;
alter table public.monimons add column if not exists deleted_at timestamptz;

create table if not exists public.monimon_members (
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role public.membership_role not null default 'member',
  status public.membership_status not null default 'active',
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (monimon_id, member_id)
);

alter table public.monimon_members add column if not exists role public.membership_role not null default 'member';
alter table public.monimon_members add column if not exists invited_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.monimon_members add column if not exists removed_at timestamptz;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  paid_by_member_id uuid not null references public.members(id) on delete restrict,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  expense_date date not null default current_date,
  status public.record_status not null default 'pending',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, paid_by_member_id)
    references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.expense_participants (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  monimon_id uuid not null,
  member_id uuid not null,
  share_amount numeric(14, 2) check (share_amount is null or share_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (expense_id, member_id),
  foreign key (monimon_id, member_id)
    references public.monimon_members(monimon_id, member_id)
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  lender_member_id uuid not null,
  borrower_member_id uuid not null,
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  loan_date date not null default current_date,
  status public.record_status not null default 'pending',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, lender_member_id)
    references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, borrower_member_id)
    references public.monimon_members(monimon_id, member_id),
  constraint loans_cannot_self_reference check (lender_member_id <> borrower_member_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid not null references public.monimons(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  payment_date date not null default current_date,
  status public.record_status not null default 'pending',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  detail text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (monimon_id, from_member_id)
    references public.monimon_members(monimon_id, member_id),
  foreign key (monimon_id, to_member_id)
    references public.monimon_members(monimon_id, member_id),
  constraint payments_cannot_self_reference check (from_member_id <> to_member_id)
);

alter table public.payments add column if not exists status public.record_status not null default 'pending';
alter table public.payments add column if not exists created_by_profile_id uuid references public.profiles(id) on delete set null;
alter table public.payments add column if not exists note text;

create table if not exists public.payment_allocations (
  payment_id uuid not null references public.payments(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (payment_id, expense_id)
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid references public.monimons(id) on delete cascade,
  kind public.approval_kind not null,
  entity_id uuid not null,
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_responses (
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  response public.approval_response not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_id, member_id)
);

create table if not exists public.contact_relationships (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.contact_status not null default 'pending',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_cannot_self_reference check (requester_profile_id <> recipient_profile_id)
);

create unique index if not exists contact_relationships_pair_unique_idx
  on public.contact_relationships (
    least(requester_profile_id, recipient_profile_id),
    greatest(requester_profile_id, recipient_profile_id)
  )
  where status <> 'removed';

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid references public.monimons(id) on delete cascade,
  guest_member_id uuid references public.members(id) on delete set null,
  invited_email citext,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  accepted_by_profile_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  monimon_id uuid references public.monimons(id) on delete cascade,
  expense_id uuid references public.expenses(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  original_name text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  created_at timestamptz not null default now(),
  constraint attachments_single_parent check (
    num_nonnulls(expense_id, loan_id, payment_id) <= 1
  )
);

create unique index if not exists attachments_storage_unique_idx
  on public.attachments (storage_bucket, storage_path);

create table if not exists public.user_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  selected_currency text not null default 'ARS',
  ui_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.expense_ledger_entries
with (security_invoker = true)
as
with participant_counts as (
  select expense_id, count(*)::numeric as participant_count
  from public.expense_participants
  group by expense_id
),
verified_expenses as (
  select *
  from public.expenses
  where status = 'verified'
)
select
  e.id as source_id,
  'expense_paid'::text as source_type,
  e.monimon_id,
  e.paid_by_member_id as member_id,
  e.currency,
  e.amount as balance_delta,
  e.expense_date as entry_date
from verified_expenses e
union all
select
  e.id as source_id,
  'expense_share'::text as source_type,
  e.monimon_id,
  ep.member_id,
  e.currency,
  -coalesce(ep.share_amount, e.amount / nullif(pc.participant_count, 0)) as balance_delta,
  e.expense_date as entry_date
from verified_expenses e
join public.expense_participants ep on ep.expense_id = e.id
join participant_counts pc on pc.expense_id = e.id;

create or replace view public.payment_ledger_entries
with (security_invoker = true)
as
select
  p.id as source_id,
  'payment_sent'::text as source_type,
  p.monimon_id,
  p.from_member_id as member_id,
  p.currency,
  p.amount as balance_delta,
  p.payment_date as entry_date
from public.payments p
where p.status = 'verified'
union all
select
  p.id as source_id,
  'payment_received'::text as source_type,
  p.monimon_id,
  p.to_member_id as member_id,
  p.currency,
  -p.amount as balance_delta,
  p.payment_date as entry_date
from public.payments p
where p.status = 'verified';

create or replace view public.monimon_member_balances
with (security_invoker = true)
as
select
  monimon_id,
  member_id,
  currency,
  round(sum(balance_delta), 2) as balance
from (
  select monimon_id, member_id, currency, balance_delta from public.expense_ledger_entries
  union all
  select monimon_id, member_id, currency, balance_delta from public.payment_ledger_entries
) entries
group by monimon_id, member_id, currency;

create index if not exists expenses_monimon_idx on public.expenses (monimon_id, status, currency);
create index if not exists expenses_paid_by_idx on public.expenses (paid_by_member_id);
create index if not exists expense_participants_member_idx on public.expense_participants (member_id);
create index if not exists loans_monimon_idx on public.loans (monimon_id, status, currency);
create index if not exists payments_monimon_idx on public.payments (monimon_id, status, currency);
create index if not exists approval_requests_entity_idx on public.approval_requests (kind, entity_id);
create index if not exists invitations_token_hash_idx on public.invitations (token_hash);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists monimons_updated_at on public.monimons;
create trigger monimons_updated_at before update on public.monimons
for each row execute function public.set_updated_at();

drop trigger if exists monimon_members_updated_at on public.monimon_members;
create trigger monimon_members_updated_at before update on public.monimon_members
for each row execute function public.set_updated_at();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists loans_updated_at on public.loans;
create trigger loans_updated_at before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists approval_requests_updated_at on public.approval_requests;
create trigger approval_requests_updated_at before update on public.approval_requests
for each row execute function public.set_updated_at();

drop trigger if exists approval_responses_updated_at on public.approval_responses;
create trigger approval_responses_updated_at before update on public.approval_responses
for each row execute function public.set_updated_at();

drop trigger if exists contact_relationships_updated_at on public.contact_relationships;
create trigger contact_relationships_updated_at before update on public.contact_relationships
for each row execute function public.set_updated_at();

drop trigger if exists invitations_updated_at on public.invitations;
create trigger invitations_updated_at before update on public.invitations
for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monimons enable row level security;
alter table public.monimon_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.loans enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_responses enable row level security;
alter table public.contact_relationships enable row level security;
alter table public.invitations enable row level security;
alter table public.attachments enable row level security;
alter table public.user_preferences enable row level security;

comment on table public.profiles is
  'Registered Supabase Auth users. Login is email/password or OAuth; username is only a unique public handle.';
comment on table public.members is
  'Stable person identity used inside Mon!. Registered users have one reusable member; guests are provisional members.';
comment on table public.monimons is
  'Mon! spaces. Includes personal spaces and group spaces, plus the settlement mode used for balances.';
comment on table public.monimon_members is
  'Membership join table. A member belongs to a specific Mon! with role and status.';
comment on table public.expenses is
  'Shared expenses. In global settlement mode, expenses are split through expense_participants.';
comment on table public.expense_participants is
  'Members included in each shared expense. share_amount is optional for future custom splits.';
comment on table public.loans is
  'Direct loans between two members. Loans are not split and do not share expense logic.';
comment on table public.payments is
  'Payments between members. Pending payments do not affect balances until verified.';
comment on table public.payment_allocations is
  'Optional mapping from a payment to specific expenses for future detailed payment flows.';
comment on table public.approval_requests is
  'Consent workflow header for expenses, loans, payments, invites and contact requests.';
comment on table public.approval_responses is
  'Per-member response to an approval request.';
comment on table public.contact_relationships is
  'Real contacts between registered profiles only. Guest members are intentionally excluded.';
comment on table public.invitations is
  'Invite links for Mon! access and optional guest-member claiming.';
comment on table public.attachments is
  'Metadata for files stored in Supabase Storage.';
comment on table public.user_preferences is
  'Non-critical user preferences. Business data must not be stored here.';

comment on view public.expense_ledger_entries is
  'Accounting entries generated from verified shared expenses.';
comment on view public.payment_ledger_entries is
  'Accounting entries generated from verified payments.';
comment on view public.monimon_member_balances is
  'Current balance by Mon!, member and currency. Positive means others owe this member; negative means this member owes.';
