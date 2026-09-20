create table public.attention_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_pair_id uuid not null references public.currency_pairs(id),
  symbol text not null,
  htf text not null default 'H4',
  chart_tf text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  gate_result text,
  final_decision text,
  gate_answers jsonb not null default '[]'::jsonb,
  judgment_answers jsonb not null default '[]'::jsonb,
  hard_veto boolean not null default false,
  gate_seconds integer,
  judgment_seconds integer,
  total_seconds integer,
  trade_log_id uuid unique references public.trade_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attention_sessions_gate_result_check
    check (gate_result is null or gate_result in ('stop', 'hold', 'pass')),
  constraint attention_sessions_final_decision_check
    check (final_decision is null or final_decision in ('skip', 'monitor', 'consider_trade')),
  constraint attention_sessions_gate_answers_array_check
    check (jsonb_typeof(gate_answers) = 'array'),
  constraint attention_sessions_judgment_answers_array_check
    check (jsonb_typeof(judgment_answers) = 'array'),
  constraint attention_sessions_finished_after_started_check
    check (finished_at is null or finished_at >= started_at),
  constraint attention_sessions_gate_seconds_check
    check (gate_seconds is null or gate_seconds >= 0),
  constraint attention_sessions_judgment_seconds_check
    check (judgment_seconds is null or judgment_seconds >= 0),
  constraint attention_sessions_total_seconds_check
    check (total_seconds is null or total_seconds >= 0),
  constraint attention_sessions_final_decision_requires_pass_check
    check (
      final_decision is null
      or (gate_result is not distinct from 'pass' and finished_at is not null)
    ),
  constraint attention_sessions_hard_veto_requires_pass_check
    check (not hard_veto or gate_result is not distinct from 'pass'),
  constraint attention_sessions_hard_veto_blocks_trade_check
    check (not hard_veto or final_decision is distinct from 'consider_trade'),
  constraint attention_sessions_trade_link_requires_decision_check
    check (
      trade_log_id is null
      or final_decision is not distinct from 'consider_trade'
    )
);

create index attention_sessions_user_started_at_idx
  on public.attention_sessions (user_id, started_at desc);

create index attention_sessions_currency_pair_id_idx
  on public.attention_sessions (currency_pair_id);

create or replace function public.touch_attention_sessions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_attention_sessions_updated_at
before update on public.attention_sessions
for each row
execute function public.touch_attention_sessions_updated_at();

revoke execute on function public.touch_attention_sessions_updated_at()
from public, anon, authenticated;

alter table public.attention_sessions enable row level security;

create policy "attention_sessions_select_own"
on public.attention_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "attention_sessions_insert_own"
on public.attention_sessions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and trade_log_id is null
);

create policy "attention_sessions_update_own"
on public.attention_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    trade_log_id is null
    or exists (
      select 1
      from public.trade_logs as trade_log
      where trade_log.id = attention_sessions.trade_log_id
        and trade_log.user_id = (select auth.uid())
    )
  )
);

revoke all on table public.attention_sessions from anon;
revoke all on table public.attention_sessions from authenticated;
grant select, insert, update on table public.attention_sessions to authenticated;

comment on table public.attention_sessions is
  'Human-first Attention Gate and Judgment Navigator sessions recorded before the existing trade gate.';

comment on column public.attention_sessions.symbol is
  'Snapshot of currency_pairs.symbol. GOLD is stored using the existing XAU/USD value.';
