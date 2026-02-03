-- Update dm_messages schema to unify user ID references
-- Instructions: Run this in Supabase SQL Editor

-- 1. Add recipient_user_id column if not exists
alter table public.dm_messages 
add column if not exists recipient_user_id uuid references auth.users(id) on delete cascade;

-- 2. Add comment/description for clarity
comment on column public.dm_messages.recipient_user_id is 'Message recipient (Member). NULL for broadcast.';
comment on column public.dm_messages.sender_user_id is 'Message sender (Admin/Teacher).';

-- 3. Make thread_id nullable (for legacy support or broadcast messages that don't belong to a thread)
alter table public.dm_messages alter column thread_id drop not null;

-- 4. Update RLS policies to use new columns
-- Drop existing policies to avoid conflicts or confusion
drop policy if exists "participants can read dm_messages" on public.dm_messages;
drop policy if exists "participants can create dm_messages" on public.dm_messages;
drop policy if exists "Admin/Teacher can view all messages" on public.dm_messages;

-- Policy: Recipients can read their own messages
create policy "Recipients can read their own messages"
  on public.dm_messages
  for select
  to authenticated
  using (
    auth.uid() = recipient_user_id
    or auth.uid() = sender_user_id
    -- Allow broadcast messages (where recipient_user_id is NULL)?
    or recipient_user_id is null
  );

-- Policy: Admin/Teacher can send messages (insert)
create policy "Admin/Teacher can send messages"
  on public.dm_messages
  for insert
  to authenticated
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('teacher', 'admin')
    )
  );

-- Policy: Admin/Teacher can view all messages (for management)
create policy "Admin/Teacher can view all messages"
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

-- 5. Create Index for performance
create index if not exists idx_dm_messages_recipient on public.dm_messages(recipient_user_id);
create index if not exists idx_dm_messages_sender on public.dm_messages(sender_user_id);
