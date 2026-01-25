-- RLS hardening for FX Journal MVP
-- Role source: public.profiles.role (member/teacher/admin)

-- 1) Staff helper
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('teacher','admin')
  );
$$;

-- 2) Enable RLS (idempotent)
alter table public.members enable row level security;
alter table public.profiles enable row level security;
alter table public.trade_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.member_settings enable row level security;

-- 3) Drop existing policies (safe if missing)
drop policy if exists "member can read own members row" on public.members;
drop policy if exists "staff can read all members" on public.members;
drop policy if exists "member can update own members row" on public.members;

drop policy if exists "member can read own profiles row" on public.profiles;
drop policy if exists "staff can read all profiles" on public.profiles;

drop policy if exists "member can read own trade_logs" on public.trade_logs;
drop policy if exists "member can insert own trade_logs" on public.trade_logs;
drop policy if exists "member can update own trade_logs" on public.trade_logs;
drop policy if exists "member can delete own trade_logs" on public.trade_logs;
drop policy if exists "staff can read all trade_logs" on public.trade_logs;
drop policy if exists "staff can update trade_logs" on public.trade_logs;

drop policy if exists "member can read announcements" on public.announcements;
drop policy if exists "staff can manage announcements" on public.announcements;

drop policy if exists "participants can read dm_threads" on public.dm_threads;
drop policy if exists "participants can create dm_threads" on public.dm_threads;
drop policy if exists "participants can read dm_messages" on public.dm_messages;
drop policy if exists "participants can create dm_messages" on public.dm_messages;
drop policy if exists "staff can read all dm_threads" on public.dm_threads;
drop policy if exists "staff can read all dm_messages" on public.dm_messages;

drop policy if exists "member can read own settings" on public.member_settings;
drop policy if exists "staff can manage settings" on public.member_settings;

-- 4) Policies
-- members
create policy "member can read own members row"
on public.members
for select
to authenticated
using (user_id = auth.uid());

create policy "staff can read all members"
on public.members
for select
to authenticated
using (public.is_staff());

-- (Optional) allow member to update own display_name only.
-- If you want to disable member updates, remove this policy.
create policy "member can update own members row"
on public.members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- profiles (role source)
create policy "member can read own profiles row"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "staff can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_staff());

-- trade_logs
create policy "member can read own trade_logs"
on public.trade_logs
for select
to authenticated
using (user_id = auth.uid());

create policy "member can insert own trade_logs"
on public.trade_logs
for insert
to authenticated
with check (user_id = auth.uid());

create policy "member can update own trade_logs"
on public.trade_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Optional: delete disabled by default. Uncomment if needed.
-- create policy "member can delete own trade_logs"
-- on public.trade_logs
-- for delete
-- to authenticated
-- using (user_id = auth.uid());

create policy "staff can read all trade_logs"
on public.trade_logs
for select
to authenticated
using (public.is_staff());

create policy "staff can update trade_logs"
on public.trade_logs
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- announcements
create policy "member can read announcements"
on public.announcements
for select
to authenticated
using (published_at is not null);

create policy "staff can manage announcements"
on public.announcements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- dm_threads
create policy "participants can read dm_threads"
on public.dm_threads
for select
to authenticated
using (member_user_id = auth.uid() or teacher_user_id = auth.uid());

create policy "participants can create dm_threads"
on public.dm_threads
for insert
to authenticated
with check (member_user_id = auth.uid() or teacher_user_id = auth.uid());

create policy "staff can read all dm_threads"
on public.dm_threads
for select
to authenticated
using (public.is_staff());

-- dm_messages
create policy "participants can read dm_messages"
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.dm_threads t
    where t.id = dm_messages.thread_id
      and (t.member_user_id = auth.uid() or t.teacher_user_id = auth.uid())
  )
);

create policy "participants can create dm_messages"
on public.dm_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.dm_threads t
    where t.id = dm_messages.thread_id
      and (t.member_user_id = auth.uid() or t.teacher_user_id = auth.uid())
  )
);

create policy "staff can read all dm_messages"
on public.dm_messages
for select
to authenticated
using (public.is_staff());

-- member_settings
create policy "member can read own settings"
on public.member_settings
for select
to authenticated
using (member_user_id = auth.uid());

create policy "staff can manage settings"
on public.member_settings
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- ------------------------------------------------------------
-- Verification SQL (run in SQL Editor; replace with real IDs)
-- ------------------------------------------------------------
-- 1) Member cannot read other users' trade_logs
-- set local role authenticated;
-- set local "request.jwt.claim.sub" = '<member-uuid>';
-- select * from public.trade_logs where user_id <> auth.uid(); -- expect 0 rows
--
-- 2) Member can read announcements but not write
-- select * from public.announcements; -- expect rows
-- insert into public.announcements (title, body) values ('x','y'); -- expect RLS error
--
-- 3) Member cannot read all members
-- select * from public.members; -- expect only own row
--
-- 4) Staff can read all trade_logs
-- set local role authenticated;
-- set local "request.jwt.claim.sub" = '<teacher-uuid>';
-- select count(*) from public.trade_logs; -- expect > 0
