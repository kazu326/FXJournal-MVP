-- Unlock candidates view (rolling 14 days)
-- Thresholds: valid_count_14 >= 4, invalid_count_14 = 0, risk_ok_rate_14 >= 0.9, rule_ok_rate_14 >= 0.9

create or replace view public.v_unlock_candidates as
with window_logs as (
  select tl.*
  from public.trade_logs tl
  where tl.voided_at is null
    and tl.occurred_at >= now() - interval '14 days'
),
agg as (
  select
    user_id,
    count(*) filter (where log_type = 'valid') as valid_count_14,
    count(*) filter (where log_type = 'invalid') as invalid_count_14,
    avg(
      case
        when log_type = 'valid' and gate_risk_ok then 1
        when log_type = 'valid' then 0
        else null
      end
    ) as risk_ok_rate_14,
    avg(
      case
        when log_type = 'valid' and gate_rule_ok then 1
        when log_type = 'valid' then 0
        else null
      end
    ) as rule_ok_rate_14,
    max(occurred_at) as last_log_at
  from window_logs
  group by user_id
)
select
  a.user_id,
  m.member_id,
  m.display_name,
  m.email,
  ms.weekly_limit,
  least(coalesce(ms.weekly_limit, 2) + 1, 4) as suggested_weekly_limit,
  coalesce(a.valid_count_14, 0) as valid_count_14,
  coalesce(a.invalid_count_14, 0) as invalid_count_14,
  coalesce(a.risk_ok_rate_14, 0) as risk_ok_rate_14,
  coalesce(a.rule_ok_rate_14, 0) as rule_ok_rate_14,
  a.last_log_at
from agg a
left join public.members m on m.user_id = a.user_id
left join public.member_settings ms on ms.member_user_id = a.user_id
where
  coalesce(ms.unlocked, false) = false
  and a.user_id is not null
  and coalesce(a.valid_count_14, 0) >= 4
  and coalesce(a.invalid_count_14, 0) = 0
  and coalesce(a.risk_ok_rate_14, 0) >= 0.9
  and coalesce(a.rule_ok_rate_14, 0) >= 0.9;

notify pgrst, 'reload schema';
