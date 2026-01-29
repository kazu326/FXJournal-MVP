-- RLS Hardening v2 (operational safety)
-- Safe to run multiple times.

-- 1) profiles: default role + auto-create
alter table public.profiles
  alter column role set default 'member';

update public.profiles
set role = 'member'
where role is null;

alter table public.profiles
  alter column role set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  insert into public.member_settings (member_user_id, weekly_limit, max_risk_percent, unlocked)
  values (new.id, 2, 2, false)
  on conflict (member_user_id) do nothing;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    drop trigger on_auth_user_created on auth.users;
  end if;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 2) Backfill user_id via email (members -> auth.users)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'members' and column_name = 'email'
  ) then
    update public.members m
    set user_id = u.id
    from auth.users u
    where m.user_id is null
      and m.email is not null
      and u.email = m.email;
  end if;
end $$;

-- 2b) Backfill trade_logs.user_id via members (if member_id exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'trade_logs' and column_name = 'member_id'
  ) then
    update public.trade_logs tl
    set user_id = m.user_id
    from public.members m
    where tl.user_id is null
      and tl.member_id is not null
      and m.member_id = tl.member_id
      and m.user_id is not null;
  end if;
end $$;

-- 3) DM FK hardening (thread_id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'dm_messages_thread_id_fkey'
  ) then
    alter table public.dm_messages
      add constraint dm_messages_thread_id_fkey
      foreign key (thread_id) references public.dm_threads(id)
      on delete cascade;
  end if;
end $$;

-- 4) DM RLS: enforce participants check via thread join
drop policy if exists "participants can read dm_messages" on public.dm_messages;
drop policy if exists "participants can create dm_messages" on public.dm_messages;

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

-- 5) trade_logs: staff can read NULL user_id rows during migration
drop policy if exists "staff can read all trade_logs" on public.trade_logs;
create policy "staff can read all trade_logs"
on public.trade_logs
for select
to authenticated
using (public.is_staff());

-- ------------------------------------------------------------
-- Verification SQL (run in SQL Editor; replace with real IDs)
-- ------------------------------------------------------------
-- A) profiles auto-create + default role
-- insert into auth.users (id, email) values ('<new-uuid>', 'new@example.com');
-- select * from public.profiles where user_id = '<new-uuid>'; -- role should be 'member'

-- B) member cannot read NULL user_id rows in trade_logs
-- set local role authenticated;
-- set local "request.jwt.claim.sub" = '<member-uuid>';
-- select * from public.trade_logs where user_id is null; -- expect 0 rows

-- C) staff can read NULL user_id rows in trade_logs
-- set local role authenticated;
-- set local "request.jwt.claim.sub" = '<teacher-uuid>';
-- select * from public.trade_logs where user_id is null; -- allowed

-- D) DM participant isolation
-- set local role authenticated;
-- set local "request.jwt.claim.sub" = '<member-uuid-not-in-thread>';
-- select * from public.dm_messages where thread_id = '<thread-id>'; -- expect 0 rows
