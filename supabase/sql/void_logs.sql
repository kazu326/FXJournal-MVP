-- Add void columns for user corrections (idempotent)
alter table public.trade_logs
  add column if not exists voided_at timestamptz;

alter table public.trade_logs
  add column if not exists void_reason text;

-- Allow members to update their own logs (for voiding)
do $$
begin
  create policy "member can void own trade_logs"
  on public.trade_logs
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
exception
  when duplicate_object then null;
end $$;
