-- Move the admin dashboard's trade-log aggregation from the browser into the database.
--
-- Why
--   AdminDashboard fetched every trade_log of the last 30 days and aggregated
--   them in JavaScript. That has three problems, in order of severity:
--
--   1. The Data API caps how many rows a request may return (the project's
--      "Max rows" setting, 1000 by default). Past that the response is silently
--      truncated -- no error -- so the dashboard would quietly start reporting
--      understated numbers. At roughly 33 logs/day across all members the cap is
--      already reached, long before the member count becomes interesting.
--   2. The whole window is shipped to the browser and aggregated there.
--   3. Three defects in the JavaScript aggregation, fixed here (see below).
--
--   Aggregating in SQL returns a fixed handful of rows regardless of how many
--   logs exist, so the row cap stops applying to this screen entirely.
--
-- Security
--   Deliberately NOT security definer. The function runs as the caller, so RLS
--   on trade_logs decides what it may aggregate: staff see everything (via
--   "teacher can read all trade_logs"), a member aggregating only ever sees
--   their own rows. No privilege escalation is introduced, and no new data is
--   reachable that the caller could not already select directly.
--
-- Behaviour changes versus the JavaScript it replaces
--   a. Voided logs are excluded (voided_at is not null). trade_logs has carried
--      void_reason/voided_at since supabase/sql/void_logs.sql, but the dashboard
--      never filtered them, so cancelled trades inflated every metric.
--   b. Consecutive-trade detection partitions by user. The JavaScript sorted all
--      logs globally and only compared against the immediately preceding row, so
--      any interleaving by another member hid the pair entirely.
--   c. Timestamps are bucketed in Asia/Tokyo. The JavaScript used the browser's
--      local timezone, which silently changed the hour-of-day and day-of-week
--      buckets depending on who opened the dashboard and from where.
--
--   These three make the numbers differ from what the dashboard showed before.
--   That is the point: the previous numbers were wrong.
--
-- Not addressed here (tracked separately)
--   Several metrics are proxies rather than real measurements -- avg_continuity
--   is logs-completed scaled to 30 days rather than an actual streak, and the
--   dashboard's "success rate after loss" has no P/L data behind it at all. They
--   are ported faithfully rather than redesigned, so this migration stays a
--   move, not a rewrite.

create or replace function public.admin_trade_metrics(p_days integer default 30)
returns jsonb
language sql
stable
set search_path = ''
as $$
with src as (
  select
    l.user_id,
    l.log_type,
    l.gate_risk_ok,
    l.post_within_hypothesis,
    l.completed_at,
    l.unexpected_reason,
    l.occurred_at,
    (l.occurred_at at time zone 'Asia/Tokyo') as local_at
  from public.trade_logs l
  where l.occurred_at >= now() - make_interval(days => p_days)
    and l.voided_at is null
),
seq as (
  select
    s.*,
    s.occurred_at - lag(s.occurred_at) over (
      partition by s.user_id order by s.occurred_at
    ) as since_prev
  from src s
),
flagged as (
  select
    q.*,
    (q.gate_risk_ok is false) as is_high_risk,
    (q.since_prev is not null and q.since_prev < interval '60 minutes') as is_short_interval
  from seq q
),
totals as (
  select
    count(*)::int as total_logs,
    count(*) filter (where completed_at is not null)::int as completed_logs,
    count(*) filter (where log_type = 'skip')::int as skip_logs,
    count(*) filter (where log_type = 'skip' and unexpected_reason is not null)::int as skip_with_reason,
    count(*) filter (where log_type = 'skip' and unexpected_reason is null)::int as skip_without_reason,
    count(*) filter (where is_high_risk)::int as high_risk_count,
    count(*) filter (where is_short_interval)::int as short_interval_count
  from flagged
),
-- Mon-Fri skeleton so the chart keeps every weekday even with no activity.
-- 2024-01-01 is a Monday.
weekdays as (
  select
    d as iso_dow,
    to_char(date '2024-01-01' + (d - 1), 'Dy') as label
  from generate_series(1, 5) as d
),
by_weekday as (
  select
    extract(isodow from local_at)::int as iso_dow,
    count(*) filter (where is_high_risk)::int as high_risk,
    count(*) filter (where is_short_interval)::int as short_interval
  from flagged
  group by 1
),
-- Six four-hour buckets: 0-4, 4-8, ... 20-24.
tz_buckets as (
  select
    b as idx,
    (b * 4)::text || '-' || ((b + 1) * 4)::text as label
  from generate_series(0, 5) as b
),
by_bucket as (
  select
    (floor(extract(hour from local_at) / 4))::int as idx,
    count(*)::int as cnt
  from src
  group by 1
),
-- Four weekly buckets. Bucket 4 is the most recent seven days, matching the
-- "1週".."4週" labels the chart already renders.
weeks as (
  select w as idx from generate_series(1, 4) as w
),
by_week as (
  select
    (4 - floor((ceil(extract(epoch from (now() - occurred_at)) / 86400.0) - 1) / 7))::int as idx,
    count(*)::int as total,
    count(*) filter (where completed_at is not null)::int as completed
  from src
  group by 1
),
-- Win rate over the first versus the second half of valid trades, by time.
valid as (
  select
    post_within_hypothesis,
    ntile(2) over (order by occurred_at) as half,
    count(*) over () as valid_total
  from src
  where log_type = 'valid'
),
learning as (
  select
    case
      when max(valid_total) < 2 then 0
      else coalesce(round(
        100.0 * count(*) filter (where half = 1 and post_within_hypothesis)
        / nullif(count(*) filter (where half = 1), 0)
      ), 0)
    end::int as win_rate_before,
    case
      when max(valid_total) < 2 then 0
      else coalesce(round(
        100.0 * count(*) filter (where half = 2 and post_within_hypothesis)
        / nullif(count(*) filter (where half = 2), 0)
      ), 0)
    end::int as win_rate_after
  from valid
)
select jsonb_build_object(
  'window_days', p_days,
  'total_logs', t.total_logs,
  'high_risk_count', t.high_risk_count,
  'short_interval_count', t.short_interval_count,
  'no_trade_rate', case when t.total_logs = 0 then 0
                        else round(100.0 * t.skip_logs / t.total_logs)::int end,
  'skip_reason_rate', case when t.skip_logs = 0 then 0
                           else round(100.0 * t.skip_with_reason / t.skip_logs)::int end,
  'skip_no_reason_rate', case when t.skip_logs = 0 then 0
                              else round(100.0 * t.skip_without_reason / t.skip_logs)::int end,
  'avg_continuity', case when t.total_logs = 0 then 0
                         else round(30.0 * t.completed_logs / t.total_logs)::int end,
  'win_rate_before', l.win_rate_before,
  'win_rate_after', l.win_rate_after,
  'night_ratio', case when t.total_logs = 0 then 0
                      else round(
                        100.0 * coalesce((
                          select sum(cnt) from by_bucket where idx in (0, 5)
                        ), 0) / t.total_logs
                      )::int end,
  'by_weekday', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'day', w.label,
      'high_risk', coalesce(d.high_risk, 0),
      'short_interval', coalesce(d.short_interval, 0)
    ) order by w.iso_dow), '[]'::jsonb)
    from weekdays w left join by_weekday d on d.iso_dow = w.iso_dow
  ),
  'by_time_bucket', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'time', b.label,
      'count', coalesce(c.cnt, 0)
    ) order by b.idx), '[]'::jsonb)
    from tz_buckets b left join by_bucket c on c.idx = b.idx
  ),
  'by_week', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'week', k.idx::text || '週',
      'rate', case when coalesce(v.total, 0) = 0 then 0
                   else round(100.0 * v.completed / v.total)::int end
    ) order by k.idx), '[]'::jsonb)
    from weeks k left join by_week v on v.idx = k.idx
  )
)
from totals t cross join learning l;
$$;

comment on function public.admin_trade_metrics(integer) is
  'Aggregates trade_logs for the admin dashboard. Runs as the caller, so RLS decides the scope. Excludes voided logs; buckets timestamps in Asia/Tokyo.';

revoke all on function public.admin_trade_metrics(integer) from public, anon;
grant execute on function public.admin_trade_metrics(integer) to authenticated, service_role;
