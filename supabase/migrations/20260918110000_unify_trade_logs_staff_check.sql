-- Make public.is_staff() the single authority for staff-wide reads of trade_logs.
--
-- Why
--   Three different answers to "is this person staff" were live at once:
--
--     src/layouts/AdminLayout.tsx  -> platform_admins, then profiles.role
--     public.is_staff()            -> staff_users
--     trade_logs read policy       -> inline profiles.role
--
--   The first two disagreeing is what produced the original bug: the guard let
--   an admin into the dashboard while RLS treated them as an ordinary member,
--   so the screen loaded with a single row and no error. AdminLayout now calls
--   is_staff(); this migration brings the last inline copy into line so there is
--   one definition left to keep correct.
--
-- Effect today
--   None. The only account with profiles.role in ('admin','teacher') is also in
--   staff_users, having been backfilled by
--   20260917120000_fix_admin_staff_read_access.sql, so the same person is staff
--   under both spellings. What changes is that promoting someone from here on
--   means inserting into staff_users rather than editing profiles.role -- and
--   that editing profiles.role alone no longer silently grants half of it.
--
-- Deliberately untouched
--   The platform_admins-based policies on subscriptions and payments, from
--   20260212213500_compliance_extensions.sql. platform_admins is empty, so those
--   revenue tables are currently readable by nobody. Repointing them at
--   is_staff() would newly expose LTV, MRR and churn data, which is a decision
--   about revenue visibility rather than a cleanup, and docs/GOVERNANCE.md is
--   explicit that revenue metrics must not drive per-member judgement. Left for
--   a separate, deliberate change.

drop policy if exists "teacher can read all trade_logs" on public.trade_logs;
drop policy if exists "staff can read all trade_logs" on public.trade_logs;

create policy "trade_logs_select_staff_all"
on public.trade_logs
for select
to authenticated
using (public.is_staff());

comment on function public.is_staff() is
  'Single source of truth for staff membership: a row in public.staff_users with role admin or teacher. Consulted by RLS policies and by the admin route guard. Grant staff access by inserting here, not by editing profiles.role.';
