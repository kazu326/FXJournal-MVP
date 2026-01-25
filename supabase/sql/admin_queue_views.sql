-- Admin queues for teacher workflow

-- 0) Columns for notes/review time (idempotent)
alter table public.trade_logs
  add column if not exists teacher_note text;

alter table public.trade_logs
  add column if not exists teacher_reviewed_at timestamptz;

-- 1) Review queue view
create or replace view public.v_review_queue as
select
  tl.id as log_id,
  tl.occurred_at,
  tl.log_type,
  tl.user_id,
  tl.member_id,
  m.display_name,
  m.email,
  tl.gate_trade_count_ok,
  tl.gate_rr_ok,
  tl.gate_risk_ok,
  tl.gate_rule_ok,
  tl.success_prob,
  tl.expected_value,
  tl.post_gate_kept,
  tl.post_within_hypothesis,
  tl.unexpected_reason,
  tl.teacher_review,
  tl.teacher_note,
  tl.teacher_reviewed_at,
  tl.voided_at
from public.trade_logs tl
left join public.members m on m.user_id = tl.user_id
where tl.log_type = 'valid'
  and tl.voided_at is null
  and coalesce(trim(tl.teacher_review), '') = '';

-- 2) Risk queue view (last 7 days)
create or replace view public.v_risk_queue as
with recent as (
  select *
  from public.trade_logs
  where occurred_at >= now() - interval '7 days'
    and voided_at is null
),
agg as (
  select
    user_id,
    count(*) filter (where log_type = 'invalid') as invalid_7,
    count(*) filter (where log_type = 'skip') as skip_7,
    count(*) filter (where log_type = 'valid') as valid_7
  from recent
  group by user_id
),
latest as (
  select distinct on (user_id)
    user_id, id as last_log_id, occurred_at as last_log_at
  from recent
  order by user_id, occurred_at desc
)
select
  a.user_id,
  m.member_id,
  m.display_name,
  m.email,
  coalesce(a.invalid_7, 0) as invalid_7,
  coalesce(a.skip_7, 0) as skip_7,
  coalesce(a.valid_7, 0) as valid_7,
  ms.weekly_limit,
  (coalesce(a.invalid_7, 0) >= 2) as alert_invalid,
  (coalesce(a.skip_7, 0) = 0 and (coalesce(a.valid_7,0) + coalesce(a.invalid_7,0) + coalesce(a.skip_7,0)) > 0) as alert_skip0,
  (coalesce(a.valid_7, 0) > coalesce(ms.weekly_limit, 3)) as alert_over_weekly,
  l.last_log_id,
  l.last_log_at
from agg a
left join public.members m on m.user_id = a.user_id
left join public.member_settings ms on ms.member_user_id = a.user_id
left join latest l on l.user_id = a.user_id
where
  (coalesce(a.invalid_7, 0) >= 2)
  or (coalesce(a.skip_7, 0) = 0 and (coalesce(a.valid_7,0) + coalesce(a.invalid_7,0) + coalesce(a.skip_7,0)) > 0)
  or (coalesce(a.valid_7, 0) > coalesce(ms.weekly_limit, 3));
