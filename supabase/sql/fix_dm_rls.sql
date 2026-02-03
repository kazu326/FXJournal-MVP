-- 0) schema
alter table public.dm_messages
  add column if not exists recipient_user_id uuid references auth.users(id) on delete cascade;

-- broadcast等のためthread_idをNULL許容（thread_id列がある前提）
alter table public.dm_messages
  alter column thread_id drop not null;

-- 1) RLS ON
alter table public.dm_messages enable row level security;

-- 2) 旧/混在ポリシーを全削除（名前違いが残るのが一番事故る）
drop policy if exists "participants can read dm_messages" on public.dm_messages;
drop policy if exists "participants can create dm_messages" on public.dm_messages;

drop policy if exists "Recipients can read their own messages" on public.dm_messages;
drop policy if exists "Admin/Teacher can send messages" on public.dm_messages;
drop policy if exists "Admin/Teacher can view all messages" on public.dm_messages;

drop policy if exists "dm_select_self_or_broadcast_or_admin" on public.dm_messages;
drop policy if exists "dm_insert_admin_only" on public.dm_messages;

-- 3) SELECT: 受信者本人 + 一斉配信
create policy "dm_select_member"
on public.dm_messages
for select
to authenticated
using (
  recipient_user_id = auth.uid()
  or recipient_user_id is null
);

-- 4) SELECT: 管理者は全件（管理画面用）
create policy "dm_select_admin_all"
on public.dm_messages
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('teacher', 'admin')
  )
);

-- 5) INSERT: 管理者のみ送信（sender_user_idは必ず自分）
create policy "dm_insert_admin_only"
on public.dm_messages
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('teacher', 'admin')
  )
  and sender_user_id = auth.uid()
);

-- index
create index if not exists idx_dm_messages_recipient on public.dm_messages(recipient_user_id);
create index if not exists idx_dm_messages_sender on public.dm_messages(sender_user_id);
