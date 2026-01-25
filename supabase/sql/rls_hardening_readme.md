# RLS Hardening Summary

## Role Source
- `public.profiles.role` is the single source of truth for `member/teacher/admin`.
- Staff check uses `public.is_staff()` (security definer).

## Assumptions / Required Columns
- `public.members.user_id` exists and maps to `auth.users.id`.
- `public.trade_logs.user_id` exists and maps to `auth.users.id`.
- `public.dm_threads.member_user_id` / `teacher_user_id` map to `auth.users.id`.

## Access Rules (High Level)
- **Members**: can read/update only their own rows (members/profile/trade_logs).
- **Staff**: can read all members/profiles/trade_logs and manage announcements/settings.
- **Announcements**: members read-only, staff full CRUD.
- **DM**: only participants can read/write messages; staff can read all.

## If Frontend Breaks
- Ensure `profiles.role` exists and is populated.
- Ensure `members.user_id` and `trade_logs.user_id` are not null.
- Re-run `supabase/sql/rls_hardening.sql` in SQL Editor.
