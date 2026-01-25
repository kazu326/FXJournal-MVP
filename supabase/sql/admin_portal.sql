-- Admin/Teacher portal schema (idempotent)

-- Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  published_at timestamptz default now()
);

alter table public.announcements enable row level security;

do $$
begin
  create policy "members can read announcements"
  on public.announcements
  for select
  to authenticated
  using (published_at is not null);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "teacher can manage announcements"
  on public.announcements
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );
exception
  when duplicate_object then null;
end $$;

-- DM threads/messages
create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null references auth.users(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (member_user_id, teacher_user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz default now()
);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

do $$
begin
  create policy "participants can read dm_threads"
  on public.dm_threads
  for select
  to authenticated
  using (
    member_user_id = auth.uid() or teacher_user_id = auth.uid()
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "participants can create dm_threads"
  on public.dm_threads
  for insert
  to authenticated
  with check (
    member_user_id = auth.uid() or teacher_user_id = auth.uid()
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "participants can read dm_messages"
  on public.dm_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.member_user_id = auth.uid() or t.teacher_user_id = auth.uid())
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "participants can create dm_messages"
  on public.dm_messages
  for insert
  to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.member_user_id = auth.uid() or t.teacher_user_id = auth.uid())
    )
  );
exception
  when duplicate_object then null;
end $$;

-- Member settings (weekly limit / max risk)
create table if not exists public.member_settings (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null unique references auth.users(id) on delete cascade,
  weekly_limit integer not null default 2,
  max_risk_percent numeric(5,2) not null default 2,
  updated_at timestamptz default now()
);

alter table public.member_settings enable row level security;

do $$
begin
  create policy "member can read own settings"
  on public.member_settings
  for select
  to authenticated
  using (member_user_id = auth.uid());
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "teacher can manage settings"
  on public.member_settings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );
exception
  when duplicate_object then null;
end $$;

-- Teacher/admin can read members + trade_logs
do $$
begin
  create policy "teacher can read members"
  on public.members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "teacher can read all trade_logs"
  on public.trade_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher','admin')
    )
  );
exception
  when duplicate_object then null;
end $$;
