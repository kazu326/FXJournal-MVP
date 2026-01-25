-- v_risk_queue v2 (JST week-aligned)
-- invalid_7 / skip_7 / valid_7 are now "this-week" values (JST Mon 00:00)

create or replace view public.v_risk_queue as
with week_bounds as (
  select
    timezone('Asia/Tokyo', now()) as now_jst,
    date_trunc('week', timezone('Asia/Tokyo', now())) as week_start_jst
),
week_logs as (
  select
    tl.*
  from public.trade_logs tl
  join week_bounds b on true
  where tl.voided_at is null
    and tl.occurred_at >= (b.week_start_jst at time zone 'Asia/Tokyo')
),
agg as (
  select
    user_id,
    count(*) filter (where log_type = 'invalid') as invalid_week,
    count(*) filter (where log_type = 'skip') as skip_week,
    count(*) filter (where log_type = 'valid') as valid_week,
    count(*) filter (where log_type in ('valid','invalid')) as attempts_week
  from week_logs
  group by user_id
),
latest as (
  select distinct on (user_id)
    user_id, id as last_log_id, occurred_at as last_log_at
  from week_logs
  order by user_id, occurred_at desc
)
select
  a.user_id,
  m.member_id,
  m.display_name,
  m.email,
  coalesce(a.invalid_week, 0) as invalid_7,
  coalesce(a.skip_week, 0) as skip_7,
  coalesce(a.valid_week, 0) as valid_7,
  ms.weekly_limit,
  (coalesce(a.invalid_week, 0) >= 2) as alert_invalid,
  (coalesce(a.skip_week, 0) = 0 and (coalesce(a.valid_week,0) + coalesce(a.invalid_week,0) + coalesce(a.skip_week,0)) > 0) as alert_skip0,
  (coalesce(a.attempts_week, 0) > coalesce(ms.weekly_limit, 2)) as alert_over_weekly,
  (coalesce(a.attempts_week, 0) > coalesce(ms.weekly_limit, 2) and coalesce(ms.unlocked, false) = false) as alert_over_weekly_hard,
  (coalesce(a.attempts_week, 0) > coalesce(ms.weekly_limit, 2) and coalesce(ms.unlocked, false) = true) as alert_over_weekly_soft,
  l.last_log_id,
  l.last_log_at
from agg a
left join public.members m on m.user_id = a.user_id
left join public.member_settings ms on ms.member_user_id = a.user_id
left join latest l on l.user_id = a.user_id
where
  (coalesce(a.invalid_week, 0) >= 2)
  or (coalesce(a.skip_week, 0) = 0 and (coalesce(a.valid_week,0) + coalesce(a.invalid_week,0) + coalesce(a.skip_week,0)) > 0)
  or (coalesce(a.attempts_week, 0) > coalesce(ms.weekly_limit, 2));

notify pgrst, 'reload schema';
