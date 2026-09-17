-- Per-member trade figures for the admin dashboard's user summary table.
--
-- Why
--   The table renders "トレード数", "勝率" and "最終活動" from columns the
--   frontend type claims exist on v_behavior_compliance_report -- total_trades,
--   win_rate, last_trade_date. None of them are in the view, so those three
--   columns had always rendered 0 and "-" regardless of the underlying data.
--
--   The figures themselves are derivable from trade_logs. They are exposed here
--   rather than bolted onto v_behavior_compliance_report, which already mixes
--   revenue (lifetime_value, monthly_revenue, churn_reason) with behaviour;
--   widening it further runs against docs/GOVERNANCE.md D-4. Keeping behaviour
--   aggregates in their own function keeps the two separable.
--
-- Shape
--   One row per member that has at least one log, so the result is bounded by
--   member count rather than log count.
--
-- Security
--   Not SECURITY DEFINER. Runs as the caller, so RLS on trade_logs decides the
--   scope: staff see every member, a member sees only their own row.
--
-- Consistency
--   Voided logs are excluded, matching public.admin_trade_metrics.
--   total_trades counts executed trades only ('valid'), while last_activity_at
--   spans skips too, since a logged skip is still activity by the member.
--   win_rate mirrors the metric the dashboard used before: the share of valid
--   trades whose outcome stayed within hypothesis. It is null, not zero, when a
--   member has no scored trades yet, so "no data" stays distinct from "0%".

create or replace function public.admin_user_metrics()
returns table (
  user_id uuid,
  total_trades integer,
  win_rate numeric,
  last_activity_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    l.user_id,
    count(*) filter (where l.log_type = 'valid')::integer as total_trades,
    case
      when count(*) filter (
        where l.log_type = 'valid' and l.post_within_hypothesis is not null
      ) = 0 then null
      else round(
        100.0 * count(*) filter (
          where l.log_type = 'valid' and l.post_within_hypothesis
        ) / count(*) filter (
          where l.log_type = 'valid' and l.post_within_hypothesis is not null
        ),
        1
      )
    end as win_rate,
    max(l.occurred_at) as last_activity_at
  from public.trade_logs l
  where l.voided_at is null
  group by l.user_id;
$$;

comment on function public.admin_user_metrics() is
  'Per-member trade counts, win rate and last activity for the admin user summary. Runs as the caller, so RLS decides the scope. Excludes voided logs.';

revoke all on function public.admin_user_metrics() from public, anon;
grant execute on function public.admin_user_metrics() to authenticated, service_role;
