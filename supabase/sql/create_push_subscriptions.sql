-- Create table for storing Web Push subscriptions
create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
revoke all on table public.push_subscriptions from public, anon;
grant select, insert, update, delete
  on table public.push_subscriptions
  to authenticated;

create policy "Users can manage their own subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Add index
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
