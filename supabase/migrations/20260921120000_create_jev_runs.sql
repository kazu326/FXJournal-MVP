create table public.jev_runs (
  id uuid primary key default gen_random_uuid(),
  attention_session_id uuid not null unique
    references public.attention_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'gate_q1_q2',
  model text not null default 'jev-latest',
  prompt_version text not null default 'q1q2-v0.1',
  feature_version text not null default 'q1q2-features-v0.1',
  status text not null default 'pending',
  snapshot_at timestamptz,
  q1_input jsonb,
  q1_output jsonb,
  q2_input jsonb,
  q2_output jsonb,
  q1_comparison text,
  q2_comparison text,
  latency_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint jev_runs_scope_check check (scope = 'gate_q1_q2'),
  constraint jev_runs_model_check check (model = 'jev-latest'),
  constraint jev_runs_prompt_version_check check (prompt_version = 'q1q2-v0.1'),
  constraint jev_runs_feature_version_check check (feature_version = 'q1q2-features-v0.1'),
  constraint jev_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed')),
  constraint jev_runs_q1_comparison_check
    check (
      q1_comparison is null
      or q1_comparison in (
        'same', 'different', 'human_unknown', 'jev_unknown',
        'both_unknown', 'not_answered'
      )
    ),
  constraint jev_runs_q2_comparison_check
    check (
      q2_comparison is null
      or q2_comparison in (
        'same', 'different', 'human_unknown', 'jev_unknown',
        'both_unknown', 'not_answered'
      )
    ),
  constraint jev_runs_latency_ms_check
    check (latency_ms is null or latency_ms >= 0),
  constraint jev_runs_completed_at_check
    check (
      (status in ('pending', 'running') and completed_at is null)
      or (status in ('completed', 'failed') and completed_at is not null)
    )
);

create index jev_runs_user_created_at_idx
  on public.jev_runs (user_id, created_at desc);

alter table public.jev_runs enable row level security;

-- Deliberately no authenticated policies or grants. Only the Edge Function's
-- service-role client may read or write experimental runs in v0.1.
revoke all on table public.jev_runs from public, anon, authenticated;
grant all on table public.jev_runs to service_role;

comment on table public.jev_runs is
  'Jev Q1/Q2 comparison experiment. v0.1 experimental machine proxy; not instructor rules.';
comment on column public.jev_runs.q1_input is
  'Market-only input. v0.1 experimental machine proxy; not instructor rules.';
comment on column public.jev_runs.q2_input is
  'Market-only input. v0.1 experimental machine proxy; not instructor rules.';
comment on column public.jev_runs.q1_output is
  'Machine-proxy output; not an instructor judgment.';
comment on column public.jev_runs.q2_output is
  'Machine-proxy output; not an instructor judgment.';
