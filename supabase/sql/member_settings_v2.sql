-- Member settings v2 + weekly counts view (JST week)

-- 1) columns
alter table public.member_settings
  add column if not exists unlocked boolean default false;

alter table public.member_settings
  add column if not exists note text;

alter table public.member_settings
  add column if not exists updated_at timestamptz default now();

alter table public.member_settings
  add column if not exists weekly_limit integer default 2;

alter table public.member_settings
  add column if not exists max_risk_percent numeric(5,2) default 2.00;

update public.member_settings
set weekly_limit = coalesce(weekly_limit, 2),
    max_risk_percent = coalesce(max_risk_percent, 2.00),
    unlocked = coalesce(unlocked, false),
    updated_at = coalesce(updated_at, now());

-- 2) updated_at trigger
create or replace function public.touch_member_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger where tgname = 'trg_member_settings_updated_at'
  ) then
    drop trigger trg_member_settings_updated_at on public.member_settings;
  end if;
end $$;

create trigger trg_member_settings_updated_at
before update on public.member_settings
for each row execute procedure public.touch_member_settings_updated_at();

-- 3) weekly counts view (JST week start Monday 00:00)
create or replace view public.v_weekly_counts as
with base as (
  select
    user_id,
    log_type,
    occurred_at,
    date_trunc('week', timezone('Asia/Tokyo', occurred_at)) as week_start_at
  from public.trade_logs
  where voided_at is null
    and log_type in ('valid','invalid')
)
select
  user_id,
  week_start_at,
  count(*) as attempts_week,
  count(*) filter (where log_type = 'valid') as valid_week,
  count(*) filter (where log_type = 'invalid') as invalid_week
from base
group by user_id, week_start_at;

notify pgrst, 'reload schema';
