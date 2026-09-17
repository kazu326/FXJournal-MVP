-- Let staff read public.users so the admin dashboard can list every member.
--
-- Symptom
--   The admin dashboard rendered without errors but showed only the signed-in
--   admin's own row, so every chart and the user list reflected a single user.
--
-- Cause
--   public.v_behavior_compliance_report is declared WITH (security_invoker = true)
--   (see 20260703070500_harden_public_view_security_invoker.sql) and is driven by
--   `FROM users u`, with every other table LEFT JOINed onto it. Row visibility of
--   the view is therefore decided entirely by RLS on public.users, and that table
--   carried only an own-row policy:
--
--     "Users can view own profile"  SELECT  using (id = auth.uid())
--
--   public.profiles and public.trade_logs already had staff-facing SELECT
--   policies, so this is the one remaining gap.
--
-- Scope
--   Adds a single SELECT policy. RLS stays enabled, existing policies are not
--   touched, and no write path is widened. All existing policies on this table
--   are PERMISSIVE, so this one is OR'ed with the own-row policy rather than
--   narrowing it.
--
-- Second gap, fixed below
--   public.is_staff() resolves staff membership from public.staff_users (user_id,
--   role in ('admin','teacher')) -- NOT from profiles.role, and NOT the
--   definition checked into supabase/sql/rls_hardening.sql, which is stale.
--   public.staff_users was empty, so is_staff() returned false for everyone and
--   the pre-existing "profiles_select_staff_all" policy had never granted
--   anything either. A policy alone therefore does not fix the dashboard; the
--   table has to be seeded. public.staff_users has no DDL in this repository; it
--   exists only in the generated types.
--
-- Known drift to resolve separately (not changed here)
--   Three different sources of truth for "is this person staff" coexist:
--     - src/layouts/AdminLayout.tsx  -> platform_admins, then profiles.role
--     - public.is_staff()            -> staff_users
--     - "teacher can read all trade_logs" on trade_logs -> inline profiles.role
--   The first two disagreeing is what let the admin open the dashboard while
--   still reading as an ordinary member.

drop policy if exists "users_select_staff_all" on public.users;
create policy "users_select_staff_all"
on public.users
for select
to authenticated
using (public.is_staff());

-- One-time backfill of public.staff_users from the roles already recorded on
-- public.profiles, so that is_staff() starts returning true for the accounts
-- that the admin guard already treats as staff.
--
-- This reconciles the two sources of truth once; it does not change the ongoing
-- rule. public.staff_users remains authoritative for is_staff(), and promoting
-- someone later still means inserting a row here rather than editing
-- profiles.role. Scoped to the roles is_staff() recognises ('admin','teacher'),
-- so 'member' and NULL roles are not granted anything.
--
-- Written as NOT EXISTS rather than ON CONFLICT so it does not depend on a
-- unique constraint whose definition is not present in this repository.
insert into public.staff_users (user_id, role)
select p.user_id, p.role
from public.profiles p
where p.role in ('admin', 'teacher')
  and not exists (
    select 1
    from public.staff_users su
    where su.user_id = p.user_id
  );
