-- Unfinished queue for follow-up DM

alter table public.trade_logs
  add column if not exists followup_sent_at timestamptz;

create or replace view public.v_unfinished_queue as
select
  tl.id as log_id,
  tl.occurred_at,
  tl.user_id,
  tl.member_id,
  m.display_name,
  m.email,
  extract(epoch from (now() - tl.occurred_at)) / 3600.0 as hours_since,
  (now() - tl.occurred_at) >= interval '24 hours' as is_over_24h,
  tl.followup_sent_at
from public.trade_logs tl
left join public.members m on m.user_id = tl.user_id
where tl.log_type = 'valid'
  and tl.voided_at is null
  and (tl.post_gate_kept is null or tl.post_within_hypothesis is null);

notify pgrst, 'reload schema';
