-- Push subscription endpoints and key material must never be enumerable by
-- anonymous callers. The notification Edge Function uses service_role and is
-- unaffected by these user-facing RLS policies.

drop policy if exists "Admins can view all subscriptions"
  on public.push_subscriptions;
drop policy if exists "Users can insert their own subscriptions"
  on public.push_subscriptions;
drop policy if exists "Users can select their own subscriptions"
  on public.push_subscriptions;
drop policy if exists "Users can delete their own subscriptions"
  on public.push_subscriptions;
drop policy if exists "Users can update their own subscriptions"
  on public.push_subscriptions;
drop policy if exists "Users can manage their own subscriptions"
  on public.push_subscriptions;

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
