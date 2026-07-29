-- Message care hub
-- - Monthly behavior check-ins
-- - Evidence-backed, deterministic feedback
-- - Member-initiated habit support
-- - Organization-scoped staff access

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  create type public.checkin_assignment_status as enum ('due', 'completed', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.feedback_status as enum ('draft', 'published', 'suppressed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.feedback_signal as enum (
    'on_track',
    'monitoring',
    'followup',
    'support_requested',
    'insufficient_data'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.support_category as enum (
    'record_habit',
    'rule_adherence',
    'emotion_management',
    'skip_decision',
    'learning',
    'app_usage'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.support_thread_status as enum (
    'open',
    'waiting_staff',
    'waiting_member',
    'resolved',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.support_sender_kind as enum ('member', 'staff', 'system');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.checkin_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version integer not null check (version > 0),
  title text not null,
  description text not null,
  cadence text not null default 'monthly' check (cadence = 'monthly'),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (key, version)
);

create unique index if not exists checkin_definitions_one_active_key
  on public.checkin_definitions (key)
  where is_active;

create table if not exists public.checkin_questions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.checkin_definitions(id) on delete cascade,
  question_key text not null,
  position smallint not null check (position between 1 and 20),
  prompt text not null,
  low_label text not null,
  high_label text not null,
  allow_not_applicable boolean not null default false,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (definition_id, question_key),
  unique (definition_id, position)
);

create table if not exists public.checkin_assignments (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.checkin_definitions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  period_start date not null,
  period_end date not null,
  due_at timestamptz not null,
  status public.checkin_assignment_status not null default 'due',
  support_requested boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (definition_id, user_id, period_start)
);

create index if not exists checkin_assignments_user_period_idx
  on public.checkin_assignments (user_id, period_start desc);
create index if not exists checkin_assignments_org_status_idx
  on public.checkin_assignments (organization_id, status, period_start desc);

create table if not exists public.checkin_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.checkin_assignments(id) on delete cascade,
  question_id uuid not null references public.checkin_questions(id),
  answer_value smallint,
  is_not_applicable boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (answer_value between 1 and 5 and is_not_applicable = false)
    or (answer_value is null and is_not_applicable = true)
  ),
  unique (assignment_id, question_id)
);

create table if not exists public.evidence_cards (
  id uuid primary key default gen_random_uuid(),
  evidence_key text not null,
  version integer not null check (version > 0),
  title text not null,
  evidence_kind text not null check (
    evidence_kind in ('meta_analysis', 'experiment', 'observational', 'app_data', 'hypothesis')
  ),
  source_name text not null,
  source_year integer,
  source_url text not null,
  summary text not null,
  scope_note text not null,
  limitation_note text not null,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (evidence_key, version)
);

create table if not exists public.feedback_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  version integer not null check (version > 0),
  signal public.feedback_signal not null,
  title text not null,
  interpretation text not null,
  next_action text not null,
  evidence_card_id uuid references public.evidence_cards(id),
  auto_publish boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_key, version)
);

create table if not exists public.monthly_feedback (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.checkin_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  period_start date not null,
  signal public.feedback_signal not null,
  status public.feedback_status not null default 'draft',
  summary text not null,
  interpretation text not null,
  next_action text not null,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  template_id uuid not null references public.feedback_templates(id),
  evidence_card_id uuid references public.evidence_cards(id),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monthly_feedback_user_period_idx
  on public.monthly_feedback (user_id, period_start desc);
create index if not exists monthly_feedback_org_status_idx
  on public.monthly_feedback (organization_id, status, period_start desc);

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  category public.support_category not null,
  subject text not null,
  status public.support_thread_status not null default 'waiting_staff',
  assigned_staff_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists support_threads_one_active_per_member
  on public.support_threads (member_user_id)
  where status in ('open', 'waiting_staff', 'waiting_member');
create index if not exists support_threads_org_status_idx
  on public.support_threads (organization_id, status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_kind public.support_sender_kind not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at);

-- Internal authorization helpers. They are SECURITY DEFINER because organization
-- membership tables may have their own RLS. They are kept out of exposed schemas,
-- validate auth.uid(), set a fixed search_path, and are executable only by authenticated.
create or replace function private.message_member_org_id(p_member_user_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid;
begin
  if p_member_user_id is null then
    return null;
  end if;

  if to_regclass('public.org_students') is not null then
    execute
      'select organization_id
         from public.org_students
        where student_user_id = $1
        order by created_at asc
        limit 1'
      into v_org_id
      using p_member_user_id;
  end if;

  return v_org_id;
end;
$$;

create or replace function private.is_message_staff_for_member(p_member_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_allowed boolean := false;
begin
  if v_actor is null or p_member_user_id is null then
    return false;
  end if;

  if to_regclass('public.platform_admins') is not null then
    execute
      'select exists (
         select 1 from public.platform_admins where user_id = $1
       )'
      into v_allowed
      using v_actor;
    if v_allowed then
      return true;
    end if;
  end if;

  if to_regclass('public.profiles') is not null then
    execute
      'select exists (
         select 1
           from public.profiles
          where user_id = $1
            and role in (''admin'', ''platform_admin'')
       )'
      into v_allowed
      using v_actor;
    if v_allowed then
      return true;
    end if;
  end if;

  if to_regclass('public.org_staff') is not null
     and to_regclass('public.org_students') is not null then
    execute
      'select exists (
         select 1
           from public.org_staff staff
           join public.org_students student
             on student.organization_id = staff.organization_id
          where staff.staff_user_id = $1
            and student.student_user_id = $2
            and staff.role in (''owner'', ''admin'', ''teacher'', ''member'')
       )'
      into v_allowed
      using v_actor, p_member_user_id;
  end if;

  return coalesce(v_allowed, false);
end;
$$;

create or replace function private.contains_prohibited_investment_direction(
  p_body text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select
    regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g')
      ~* '(今|今日|現在|次).{0,16}(買い|買う|売り|売る|エントリー)(して|する|がよい|がおすすめ|すべき)'
    or regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g')
      ~* '(買い|買う|売り|売る|エントリー)(して|する|がよい|がおすすめ|すべき).{0,16}(今|今日|現在|次)'
    or regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g')
      ~* '(ドル円|ユーロ円|ポンド円|ユーロドル|USD/?JPY|EUR/?JPY|GBP/?JPY|EUR/?USD).{0,20}(買い|売り|ロング|ショート)(です|推奨|がおすすめ|すべき)?'
    or regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g')
      ~* '(損切り|利確).{0,16}([0-9]+(\.[0-9]+)?\s*(円|pips?|ポイント)|価格|レート)(に|で|がおすすめ|すべき)'
    or regexp_replace(trim(coalesce(p_body, '')), '\s+', ' ', 'g')
      ~* '[0-9]+(\.[0-9]+)?\s*(ロット|lots?|lot)(で|がよい|がおすすめ|にして|にする)';
$$;

create or replace function private.guard_announcement_investment_scope()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if private.contains_prohibited_investment_direction(
    coalesce(new.title, '') || ' ' || coalesce(new.body, '')
  ) then
    raise exception
      'Announcement includes a prohibited investment direction'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.message_member_org_id(uuid) from public, anon;
revoke all on function private.is_message_staff_for_member(uuid) from public, anon;
revoke all on function private.contains_prohibited_investment_direction(text) from public, anon, authenticated;
revoke all on function private.guard_announcement_investment_scope() from public, anon, authenticated;
grant execute on function private.message_member_org_id(uuid) to authenticated;
grant execute on function private.is_message_staff_for_member(uuid) to authenticated;

do $$
begin
  if to_regclass('public.announcements') is not null then
    execute 'drop trigger if exists announcements_investment_scope_guard on public.announcements';
    execute 'create trigger announcements_investment_scope_guard
      before insert or update of title, body on public.announcements
      for each row execute function private.guard_announcement_investment_scope()';
  end if;
end
$$;

-- Seed the versioned monthly behavior check-in.
insert into public.checkin_definitions (
  id, key, version, title, description, cadence, is_active
) values (
  'ac000001-0000-4000-8000-000000000001',
  'monthly_behavior_checkin',
  1,
  '今月の行動チェックイン',
  '記録と判断の習慣を約1分で振り返ります。',
  'monthly',
  true
)
on conflict (key, version) do update
set title = excluded.title,
    description = excluded.description,
    is_active = excluded.is_active;

insert into public.checkin_questions (
  id, definition_id, question_key, position, prompt, low_label, high_label,
  allow_not_applicable, is_required
) values
  (
    'ac000001-0000-4000-8000-000000000101',
    'ac000001-0000-4000-8000-000000000001',
    'goal_action',
    1,
    '今月、決めていた目標行動をどの程度実行できましたか？',
    'ほとんどできなかった',
    'ほぼ毎回できた',
    false,
    true
  ),
  (
    'ac000001-0000-4000-8000-000000000102',
    'ac000001-0000-4000-8000-000000000001',
    'rule_adherence',
    2,
    '自分で決めた取引ルールをどの程度守れましたか？',
    'ほとんど守れなかった',
    'ほぼ毎回守れた',
    false,
    true
  ),
  (
    'ac000001-0000-4000-8000-000000000103',
    'ac000001-0000-4000-8000-000000000001',
    'record_before_decision',
    3,
    '気持ちが動いたとき、判断前に記録を残せましたか？',
    'ほとんど残せなかった',
    'ほぼ毎回残せた',
    true,
    true
  ),
  (
    'ac000001-0000-4000-8000-000000000104',
    'ac000001-0000-4000-8000-000000000001',
    'skip_when_needed',
    4,
    '条件が合わないとき、見送る判断ができましたか？',
    'ほとんどできなかった',
    'ほぼ毎回できた',
    true,
    true
  ),
  (
    'ac000001-0000-4000-8000-000000000105',
    'ac000001-0000-4000-8000-000000000001',
    'next_action_clarity',
    5,
    '来月に試す行動が明確になっていますか？',
    'まだ決まっていない',
    '具体的に決まっている',
    false,
    true
  )
on conflict (definition_id, question_key) do update
set position = excluded.position,
    prompt = excluded.prompt,
    low_label = excluded.low_label,
    high_label = excluded.high_label,
    allow_not_applicable = excluded.allow_not_applicable,
    is_required = excluded.is_required;

insert into public.evidence_cards (
  id, evidence_key, version, title, evidence_kind, source_name, source_year,
  source_url, summary, scope_note, limitation_note, approved, approved_at
) values
  (
    'ec000001-0000-4000-8000-000000000001',
    'progress_monitoring',
    1,
    '進み具合を記録する',
    'meta_analysis',
    'Harkin et al., Psychological Bulletin',
    2016,
    'https://pubmed.ncbi.nlm.nih.gov/26479070/',
    '目標の進み具合を確認する介入は、平均的には目標達成を後押ししました。',
    '複数領域の目標行動を対象にした研究です。',
    'FXの成績や利益への効果を直接示す研究ではありません。',
    true,
    now()
  ),
  (
    'ec000001-0000-4000-8000-000000000002',
    'implementation_intentions',
    1,
    'If–Thenで次の行動を決める',
    'meta_analysis',
    'Gollwitzer & Sheeran, Advances in Experimental Social Psychology',
    2006,
    'https://doi.org/10.1016/S0065-2601(06)38002-1',
    '「もし状況Xになったら行動Yをする」という計画は、目標を行動へ移す助けになりました。',
    '複数の自己調整課題を対象にした研究です。',
    '特定の計画が全員に有効であることを保証するものではありません。',
    true,
    now()
  ),
  (
    'ec000001-0000-4000-8000-000000000003',
    'break_even_effect',
    1,
    '損失後の「取り返したい」判断',
    'experiment',
    'Thaler & Johnson, Management Science',
    1990,
    'https://doi.org/10.1287/mnsc.36.6.643',
    '先の損失があると、損益を元へ戻せる可能性を持つ選択が魅力的になる場合があります。',
    '実験による意思決定研究です。',
    '個人の状態を診断したり、実際のFX行動の原因を断定したりする根拠ではありません。',
    true,
    now()
  )
on conflict (evidence_key, version) do update
set title = excluded.title,
    evidence_kind = excluded.evidence_kind,
    source_name = excluded.source_name,
    source_year = excluded.source_year,
    source_url = excluded.source_url,
    summary = excluded.summary,
    scope_note = excluded.scope_note,
    limitation_note = excluded.limitation_note,
    approved = excluded.approved,
    approved_at = excluded.approved_at;

insert into public.feedback_templates (
  id, template_key, version, signal, title, interpretation, next_action,
  evidence_card_id, auto_publish, is_active
) values
  (
    'fc000001-0000-4000-8000-000000000001',
    'monthly_on_track',
    1,
    'on_track',
    '続けられていることがあります',
    '結果ではなく、慎重な判断を記録できた過程を次の月にも残していきましょう。',
    '来月も、判断前の30秒記録を最初の1回から続けてみましょう。',
    'ec000001-0000-4000-8000-000000000001',
    true,
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000002',
    'monthly_monitoring',
    1,
    'monitoring',
    '変化を確認している段階です',
    'できた場面と難しかった場面の両方を残すと、次に試す行動を具体化しやすくなります。',
    '「取引したくなったら、先に記録画面を開く」のようにIf–Thenで1つ決めてみましょう。',
    'ec000001-0000-4000-8000-000000000002',
    true,
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000003',
    'monthly_followup',
    1,
    'followup',
    '一緒に振り返る準備をしています',
    '回答と記録を担当者が確認し、行動を続けやすくする方法を整理します。',
    '難しかった場面を1つだけ、記録から確認しておきましょう。',
    'ec000001-0000-4000-8000-000000000002',
    false,
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000004',
    'monthly_support_requested',
    1,
    'support_requested',
    '相談希望を受け付けました',
    '担当者が記録と回答を確認します。個別の売買判断ではなく、記録・ルール・学習の続け方を一緒に整理します。',
    '相談したい場面を1つだけ整理してお待ちください。',
    'ec000001-0000-4000-8000-000000000002',
    false,
    true
  ),
  (
    'fc000001-0000-4000-8000-000000000005',
    'monthly_insufficient_data',
    1,
    'insufficient_data',
    'まずは比較できる記録を作りましょう',
    '今月は傾向を判断できるだけの記録がまだありません。記録は自分の判断を後から客観視する材料になります。',
    '次の機会に、取引前30秒の記録を1回残すことから始めましょう。',
    'ec000001-0000-4000-8000-000000000001',
    true,
    true
  )
on conflict (template_key, version) do update
set signal = excluded.signal,
    title = excluded.title,
    interpretation = excluded.interpretation,
    next_action = excluded.next_action,
    evidence_card_id = excluded.evidence_card_id,
    auto_publish = excluded.auto_publish,
    is_active = excluded.is_active;

-- Creates the current member's assignment on demand. This keeps the first
-- release functional even before a scheduled job is configured.
create or replace function public.ensure_current_month_checkin()
returns public.checkin_assignments
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_definition_id uuid;
  v_period_start date := date_trunc('month', timezone('Asia/Tokyo', now()))::date;
  v_period_end date := (date_trunc('month', timezone('Asia/Tokyo', now())) + interval '1 month - 1 day')::date;
  v_assignment public.checkin_assignments;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select id
    into v_definition_id
    from public.checkin_definitions
   where key = 'monthly_behavior_checkin'
     and is_active
   order by version desc
   limit 1;

  if v_definition_id is null then
    raise exception 'Active monthly check-in definition not found';
  end if;

  insert into public.checkin_assignments (
    definition_id,
    user_id,
    organization_id,
    period_start,
    period_end,
    due_at
  ) values (
    v_definition_id,
    v_user_id,
    private.message_member_org_id(v_user_id),
    v_period_start,
    v_period_end,
    (v_period_end::timestamp + time '23:59:59') at time zone 'Asia/Tokyo'
  )
  on conflict (definition_id, user_id, period_start) do update
    set updated_at = now()
  returning * into v_assignment;

  return v_assignment;
end;
$$;

create or replace function public.submit_monthly_checkin(
  p_assignment_id uuid,
  p_answers jsonb,
  p_support_requested boolean default false
)
returns table (
  feedback_id uuid,
  feedback_status public.feedback_status,
  feedback_signal public.feedback_signal
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_assignment public.checkin_assignments;
  v_item record;
  v_question public.checkin_questions;
  v_question_count integer;
  v_answer_count integer;
  v_answer_value smallint;
  v_is_na boolean;
  v_average numeric;
  v_minimum smallint;
  v_record_count integer := 0;
  v_completed_count integer := 0;
  v_skip_count integer := 0;
  v_signal public.feedback_signal;
  v_template public.feedback_templates;
  v_summary text;
  v_status public.feedback_status;
  v_feedback public.monthly_feedback;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
    into v_assignment
    from public.checkin_assignments
   where id = p_assignment_id
     and user_id = v_user_id
   for update;

  if v_assignment.id is null then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  if v_assignment.status <> 'due' then
    raise exception 'Assignment already submitted' using errcode = '23505';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object';
  end if;

  select count(*)
    into v_question_count
    from public.checkin_questions
   where definition_id = v_assignment.definition_id
     and is_required;

  select count(*)
    into v_answer_count
    from jsonb_object_keys(p_answers);

  if v_answer_count <> v_question_count then
    raise exception 'All required questions must be answered';
  end if;

  for v_item in select key, value from jsonb_each(p_answers)
  loop
    select *
      into v_question
      from public.checkin_questions
     where definition_id = v_assignment.definition_id
       and question_key = v_item.key;

    if v_question.id is null then
      raise exception 'Unknown question: %', v_item.key;
    end if;

    v_is_na := v_item.value = 'null'::jsonb;
    if v_is_na and not v_question.allow_not_applicable then
      raise exception 'Question does not allow not applicable: %', v_item.key;
    end if;

    if v_is_na then
      v_answer_value := null;
    else
      v_answer_value := (v_item.value #>> '{}')::smallint;
      if v_answer_value < 1 or v_answer_value > 5 then
        raise exception 'Answer must be between 1 and 5: %', v_item.key;
      end if;
    end if;

    insert into public.checkin_answers (
      assignment_id, question_id, answer_value, is_not_applicable
    ) values (
      v_assignment.id, v_question.id, v_answer_value, v_is_na
    );
  end loop;

  select avg(answer_value), min(answer_value)
    into v_average, v_minimum
    from public.checkin_answers
   where assignment_id = v_assignment.id
     and not is_not_applicable;

  if to_regclass('public.trade_logs') is not null then
    execute
      'select count(*),
              count(*) filter (where completed_at is not null),
              count(*) filter (where log_type = ''skip'')
         from public.trade_logs
        where user_id = $1
          and occurred_at >= $2::date
          and occurred_at < ($3::date + 1)'
      into v_record_count, v_completed_count, v_skip_count
      using v_user_id, v_assignment.period_start, v_assignment.period_end;
  end if;

  v_signal := case
    when p_support_requested then 'support_requested'::public.feedback_signal
    when v_record_count = 0 then 'insufficient_data'::public.feedback_signal
    when v_minimum is not null and v_minimum <= 2 then 'followup'::public.feedback_signal
    when v_average is not null and v_average >= 4 then 'on_track'::public.feedback_signal
    else 'monitoring'::public.feedback_signal
  end;

  select *
    into v_template
    from public.feedback_templates
   where signal = v_signal
     and is_active
   order by version desc
   limit 1;

  if v_template.id is null then
    raise exception 'Feedback template not found for signal %', v_signal;
  end if;

  v_summary := case
    when v_record_count = 0
      then '今月は比較できる記録がまだありません。回答だけで状態を断定せず、次の記録から確認していきます。'
    when v_record_count = 1
      then format('今月は記録が1件ありました。1件だけで傾向を断定せず、続く記録を確認していきます。')
    else
      format(
        '今月は記録が%s件あり、そのうち完了記録が%s件、見送り記録が%s件でした。',
        v_record_count,
        v_completed_count,
        v_skip_count
      )
  end;

  v_status := case
    when v_template.auto_publish then 'published'::public.feedback_status
    else 'draft'::public.feedback_status
  end;

  insert into public.monthly_feedback (
    assignment_id,
    user_id,
    organization_id,
    period_start,
    signal,
    status,
    summary,
    interpretation,
    next_action,
    metrics_snapshot,
    template_id,
    evidence_card_id,
    published_at
  ) values (
    v_assignment.id,
    v_user_id,
    v_assignment.organization_id,
    v_assignment.period_start,
    v_signal,
    v_status,
    v_summary,
    v_template.interpretation,
    v_template.next_action,
    jsonb_build_object(
      'answer_average', v_average,
      'answer_minimum', v_minimum,
      'record_count', v_record_count,
      'completed_record_count', v_completed_count,
      'skip_record_count', v_skip_count,
      'support_requested', p_support_requested
    ),
    v_template.id,
    v_template.evidence_card_id,
    case when v_status = 'published' then now() else null end
  )
  returning * into v_feedback;

  update public.checkin_assignments
     set status = 'completed',
         support_requested = p_support_requested,
         completed_at = now(),
         updated_at = now()
   where id = v_assignment.id;

  return query
    select v_feedback.id, v_feedback.status, v_feedback.signal;
end;
$$;

create or replace function public.open_support_thread(
  p_category public.support_category,
  p_subject text,
  p_body text
)
returns public.support_threads
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_thread public.support_threads;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(trim(p_subject)) not between 1 and 120 then
    raise exception 'Subject must be between 1 and 120 characters';
  end if;
  if char_length(trim(p_body)) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select *
    into v_thread
    from public.support_threads
   where member_user_id = v_user_id
     and status in ('open', 'waiting_staff', 'waiting_member')
   order by created_at desc
   limit 1;

  if v_thread.id is not null then
    raise exception 'An active support thread already exists' using errcode = '23505';
  end if;

  insert into public.support_threads (
    member_user_id,
    organization_id,
    category,
    subject,
    status
  ) values (
    v_user_id,
    private.message_member_org_id(v_user_id),
    p_category,
    trim(p_subject),
    'waiting_staff'
  )
  returning * into v_thread;

  insert into public.support_messages (
    thread_id, sender_user_id, sender_kind, body
  ) values (
    v_thread.id, v_user_id, 'member', trim(p_body)
  );

  return v_thread;
end;
$$;

create or replace function public.post_support_message(
  p_thread_id uuid,
  p_body text
)
returns public.support_messages
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_thread public.support_threads;
  v_kind public.support_sender_kind;
  v_message public.support_messages;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if char_length(trim(p_body)) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select *
    into v_thread
    from public.support_threads
   where id = p_thread_id
   for update;

  if v_thread.id is null then
    raise exception 'Support thread not found' using errcode = 'P0002';
  end if;
  if v_thread.status in ('resolved', 'closed') then
    raise exception 'Support thread is closed';
  end if;

  if v_thread.member_user_id = v_actor then
    v_kind := 'member';
  elsif private.is_message_staff_for_member(v_thread.member_user_id) then
    v_kind := 'staff';
  else
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if v_kind = 'staff'
     and private.contains_prohibited_investment_direction(p_body) then
    raise exception
      'Reply includes a prohibited investment direction'
      using errcode = '22023';
  end if;

  insert into public.support_messages (
    thread_id, sender_user_id, sender_kind, body
  ) values (
    v_thread.id, v_actor, v_kind, trim(p_body)
  )
  returning * into v_message;

  update public.support_threads
     set status = case
           when v_kind = 'member' then 'waiting_staff'::public.support_thread_status
           else 'waiting_member'::public.support_thread_status
         end,
         assigned_staff_user_id = case
           when v_kind = 'staff' then coalesce(assigned_staff_user_id, v_actor)
           else assigned_staff_user_id
         end,
         last_message_at = now(),
         updated_at = now()
   where id = v_thread.id;

  return v_message;
end;
$$;

create or replace function public.set_support_thread_status(
  p_thread_id uuid,
  p_status public.support_thread_status
)
returns public.support_threads
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_thread public.support_threads;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
    into v_thread
    from public.support_threads
   where id = p_thread_id
   for update;

  if v_thread.id is null then
    raise exception 'Support thread not found' using errcode = 'P0002';
  end if;

  if v_thread.member_user_id <> v_actor
     and not private.is_message_staff_for_member(v_thread.member_user_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if v_thread.member_user_id = v_actor and p_status not in ('resolved', 'closed') then
    raise exception 'Members can only resolve or close their own thread';
  end if;

  update public.support_threads
     set status = p_status,
         resolved_at = case when p_status in ('resolved', 'closed') then now() else null end,
         updated_at = now()
   where id = v_thread.id
  returning * into v_thread;

  return v_thread;
end;
$$;

create or replace function public.publish_monthly_feedback(p_feedback_id uuid)
returns public.monthly_feedback
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_feedback public.monthly_feedback;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
    into v_feedback
    from public.monthly_feedback
   where id = p_feedback_id
   for update;

  if v_feedback.id is null then
    raise exception 'Feedback not found' using errcode = 'P0002';
  end if;
  if not private.is_message_staff_for_member(v_feedback.user_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  update public.monthly_feedback
     set status = 'published',
         reviewed_by = v_actor,
         reviewed_at = now(),
         published_at = now(),
         updated_at = now()
   where id = v_feedback.id
  returning * into v_feedback;

  return v_feedback;
end;
$$;

revoke all on function public.ensure_current_month_checkin() from public, anon;
revoke all on function public.submit_monthly_checkin(uuid, jsonb, boolean) from public, anon;
revoke all on function public.open_support_thread(public.support_category, text, text) from public, anon;
revoke all on function public.post_support_message(uuid, text) from public, anon;
revoke all on function public.set_support_thread_status(uuid, public.support_thread_status) from public, anon;
revoke all on function public.publish_monthly_feedback(uuid) from public, anon;

grant execute on function public.ensure_current_month_checkin() to authenticated;
grant execute on function public.submit_monthly_checkin(uuid, jsonb, boolean) to authenticated;
grant execute on function public.open_support_thread(public.support_category, text, text) to authenticated;
grant execute on function public.post_support_message(uuid, text) to authenticated;
grant execute on function public.set_support_thread_status(uuid, public.support_thread_status) to authenticated;
grant execute on function public.publish_monthly_feedback(uuid) to authenticated;

alter table public.checkin_definitions enable row level security;
alter table public.checkin_questions enable row level security;
alter table public.checkin_assignments enable row level security;
alter table public.checkin_answers enable row level security;
alter table public.evidence_cards enable row level security;
alter table public.feedback_templates enable row level security;
alter table public.monthly_feedback enable row level security;
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy checkin_definitions_read_active
  on public.checkin_definitions for select to authenticated
  using (is_active);

create policy checkin_questions_read_active
  on public.checkin_questions for select to authenticated
  using (
    exists (
      select 1
        from public.checkin_definitions definition
       where definition.id = checkin_questions.definition_id
         and definition.is_active
    )
  );

create policy checkin_assignments_read_participant
  on public.checkin_assignments for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_message_staff_for_member(user_id)
  );

create policy checkin_answers_read_participant
  on public.checkin_answers for select to authenticated
  using (
    exists (
      select 1
        from public.checkin_assignments assignment
       where assignment.id = checkin_answers.assignment_id
         and (
           assignment.user_id = (select auth.uid())
           or private.is_message_staff_for_member(assignment.user_id)
         )
    )
  );

create policy evidence_cards_read_approved
  on public.evidence_cards for select to authenticated
  using (
    approved
    or exists (
      select 1
        from public.monthly_feedback feedback
       where feedback.evidence_card_id = evidence_cards.id
         and private.is_message_staff_for_member(feedback.user_id)
    )
  );

create policy feedback_templates_read_staff
  on public.feedback_templates for select to authenticated
  using (
    exists (
      select 1
        from public.monthly_feedback feedback
       where feedback.template_id = feedback_templates.id
         and private.is_message_staff_for_member(feedback.user_id)
    )
  );

create policy monthly_feedback_read_participant
  on public.monthly_feedback for select to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'published')
    or private.is_message_staff_for_member(user_id)
  );

create policy support_threads_read_participant
  on public.support_threads for select to authenticated
  using (
    member_user_id = (select auth.uid())
    or private.is_message_staff_for_member(member_user_id)
  );

create policy support_messages_read_participant
  on public.support_messages for select to authenticated
  using (
    exists (
      select 1
        from public.support_threads thread
       where thread.id = support_messages.thread_id
         and (
           thread.member_user_id = (select auth.uid())
           or private.is_message_staff_for_member(thread.member_user_id)
         )
    )
  );

revoke all on table
  public.checkin_definitions,
  public.checkin_questions,
  public.checkin_assignments,
  public.checkin_answers,
  public.evidence_cards,
  public.feedback_templates,
  public.monthly_feedback,
  public.support_threads,
  public.support_messages
from anon;

revoke all on table
  public.checkin_definitions,
  public.checkin_questions,
  public.checkin_assignments,
  public.checkin_answers,
  public.evidence_cards,
  public.feedback_templates,
  public.monthly_feedback,
  public.support_threads,
  public.support_messages
from authenticated;

grant select on table
  public.checkin_definitions,
  public.checkin_questions,
  public.checkin_assignments,
  public.checkin_answers,
  public.evidence_cards,
  public.feedback_templates,
  public.monthly_feedback,
  public.support_threads,
  public.support_messages
to authenticated;

-- Legacy DM remains readable for history and writable by existing admin-only
-- safety follow-up flows. Member-originated legacy thread/message creation is removed.
drop policy if exists "participants can create dm_threads" on public.dm_threads;
drop policy if exists "participants can create dm_messages" on public.dm_messages;
drop policy if exists "dm_threads_insert_admin_only" on public.dm_threads;
create policy "dm_threads_insert_admin_only"
  on public.dm_threads for insert to authenticated
  with check (
    teacher_user_id = (select auth.uid())
    and private.is_message_staff_for_member(member_user_id)
  );

create or replace view public.v_monthly_checkin_org_summary
with (security_invoker = true) as
with assignment_results as (
  select
    assignment.id,
    assignment.organization_id,
    assignment.period_start,
    assignment.status,
    avg(answer.answer_value) filter (
      where not answer.is_not_applicable
    ) as answer_average,
    feedback.signal
  from public.checkin_assignments assignment
  left join public.checkin_answers answer
    on answer.assignment_id = assignment.id
  left join public.monthly_feedback feedback
    on feedback.assignment_id = assignment.id
  group by
    assignment.id,
    assignment.organization_id,
    assignment.period_start,
    assignment.status,
    feedback.signal
)
select
  organization_id,
  period_start,
  count(*) as assigned_count,
  count(*) filter (where status = 'completed') as response_count,
  case
    when count(*) filter (where status = 'completed') >= 5
    then round(avg(answer_average) filter (where status = 'completed'), 2)
    else null
  end as average_answer,
  count(*) filter (
    where signal in ('followup', 'support_requested')
  ) as followup_count
from assignment_results
group by organization_id, period_start;

revoke all on public.v_monthly_checkin_org_summary from public, anon;
grant select on public.v_monthly_checkin_org_summary to authenticated;

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'monthly_feedback'
  ) then
    alter publication supabase_realtime add table public.monthly_feedback;
  end if;
exception
  when undefined_object then
    null;
end $$;
