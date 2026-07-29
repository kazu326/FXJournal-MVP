alter table public.trade_logs
  add column if not exists mode text default 'live',
  add column if not exists trade_datetime timestamptz default now(),
  add column if not exists pre_note text,
  add column if not exists pre_env_sign boolean default false,
  add column if not exists pre_env_trend4h_up boolean default false,
  add column if not exists pre_env_range4h boolean default false,
  add column if not exists pre_env_support15m boolean default false,
  add column if not exists pre_env_long_wick15m boolean default false,
  add column if not exists pre_env_flag boolean default false,
  add column if not exists pre_env_triangle boolean default false,
  add column if not exists pre_env_london boolean default false,
  add column if not exists pre_env_newyork boolean default false,
  add column if not exists pre_env_as_planned boolean default false,
  add column if not exists post_side text,
  add column if not exists post_result text,
  add column if not exists post_pl numeric,
  add column if not exists post_rr_text text,
  add column if not exists post_rule_respected boolean,
  add column if not exists post_in_expected_range boolean,
  add column if not exists post_good_participation boolean,
  add column if not exists post_reference_point text,
  add column if not exists post_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'check_mode'
  ) then
    alter table public.trade_logs
      add constraint check_mode check (mode in ('live', 'practice'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'check_post_side'
  ) then
    alter table public.trade_logs
      add constraint check_post_side check (post_side in ('long', 'short'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'check_post_result'
  ) then
    alter table public.trade_logs
      add constraint check_post_result check (post_result in ('win', 'loss', 'be'));
  end if;
end
$$;
