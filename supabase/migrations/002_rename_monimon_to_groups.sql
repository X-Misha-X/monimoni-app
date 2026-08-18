-- Rename the old "monimon" database concept to "group".
-- This migration is defensive so it can be re-run after a partially failed attempt.

drop view if exists public.monimon_member_balances;
drop view if exists public.group_member_balances;
drop view if exists public.payment_ledger_entries;
drop view if exists public.expense_ledger_entries;

do $$
begin
  if to_regclass('public.monimon_members') is not null
     and to_regclass('public.group_members') is null then
    alter table public.monimon_members rename to group_members;
  end if;

  if to_regclass('public.monimons') is not null
     and to_regclass('public.groups') is null then
    alter table public.monimons rename to groups;
  end if;

  if to_regclass('public.monimon_state') is not null
     and to_regclass('public.group_state') is null then
    alter table public.monimon_state rename to group_state;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'monimon_type'
  )
  and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'group_type'
  ) then
    alter type public.monimon_type rename to group_type;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'monimon_id') then
    alter table public.expenses rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expense_participants' and column_name = 'monimon_id') then
    alter table public.expense_participants rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'loans' and column_name = 'monimon_id') then
    alter table public.loans rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'monimon_id') then
    alter table public.payments rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'approval_requests' and column_name = 'monimon_id') then
    alter table public.approval_requests rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'invitations' and column_name = 'monimon_id') then
    alter table public.invitations rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'attachments' and column_name = 'monimon_id') then
    alter table public.attachments rename column monimon_id to group_id;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'group_members' and column_name = 'monimon_id') then
    alter table public.group_members rename column monimon_id to group_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'groups'
      and column_name = 'type'
  )
  and exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'group_type'
  ) then
    alter table public.groups
      alter column type type public.group_type using type::text::public.group_type;
  end if;
end $$;

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
  e.group_id,
  e.paid_by_member_id as member_id,
  e.currency,
  e.amount as balance_delta,
  e.expense_date as entry_date
from verified_expenses e
union all
select
  e.id as source_id,
  'expense_share'::text as source_type,
  e.group_id,
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
  p.group_id,
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
  p.group_id,
  p.to_member_id as member_id,
  p.currency,
  -p.amount as balance_delta,
  p.payment_date as entry_date
from public.payments p
where p.status = 'verified';

create or replace view public.group_member_balances
with (security_invoker = true)
as
select
  group_id,
  member_id,
  currency,
  round(sum(balance_delta), 2) as balance
from (
  select group_id, member_id, currency, balance_delta from public.expense_ledger_entries
  union all
  select group_id, member_id, currency, balance_delta from public.payment_ledger_entries
) entries
group by group_id, member_id, currency;

comment on table public.groups is
  'Groups where shared expenses, loans and settlements happen.';
comment on table public.group_members is
  'Membership join table. A member belongs to a specific group with role and status.';
comment on view public.group_member_balances is
  'Current balance by group, member and currency. Positive means others owe this member; negative means this member owes.';
