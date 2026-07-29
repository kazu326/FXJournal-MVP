-- MVP launch hardening for the existing production project.
--
-- Keep authenticated application RPCs available while preventing anonymous
-- callers from invoking SECURITY DEFINER helpers and trigger functions
-- directly through the Data API.

create or replace function public.save_push_subscription(
  sub_endpoint text,
  sub_p256dh text,
  sub_auth text,
  sub_user_agent text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required';
  end if;

  insert into public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    updated_at
  )
  values (
    v_user_id,
    sub_endpoint,
    sub_p256dh,
    sub_auth,
    sub_user_agent,
    now()
  )
  on conflict (endpoint) do update
  set
    user_id = v_user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    updated_at = now();
end;
$$;

alter function public.is_admin() set search_path = '';
alter function public.is_staff() set search_path = '';
alter function public.set_trade_log_member_id() set search_path = '';
alter function public.update_xp_and_streak(public.xp_action_type) set search_path = '';

alter view public.v_intervention_effectiveness
  set (security_invoker = true);
revoke all on table public.v_intervention_effectiveness from public, anon;
grant select on table public.v_intervention_effectiveness to authenticated;

revoke all on function public.get_user_metadata(uuid)
  from public, anon, authenticated;
grant execute on function public.get_user_metadata(uuid) to service_role;

revoke all on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke all on function public.set_trade_log_member_id()
  from public, anon, authenticated;
grant execute on function public.set_trade_log_member_id() to service_role;

revoke all on function public.sync_discord_profile()
  from public, anon, authenticated;
grant execute on function public.sync_discord_profile() to service_role;

revoke all on function public.is_admin()
  from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.is_staff()
  from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated, service_role;

revoke all on function public.save_push_subscription(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, text, text, text)
  to authenticated, service_role;

revoke all on function public.update_xp_and_streak(public.xp_action_type)
  from public, anon, authenticated;
grant execute on function public.update_xp_and_streak(public.xp_action_type)
  to authenticated, service_role;

-- The bucket itself remains public, so published learning assets retain their
-- existing public URLs. Removing this table policy only prevents anonymous
-- callers from enumerating every object through the Storage API.
drop policy if exists "Public Access" on storage.objects;
