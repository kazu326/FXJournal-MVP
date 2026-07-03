-- Harden public views so RLS on underlying tables is evaluated as the caller.
-- This makes Appendix A query 4 in docs/GOVERNANCE.md satisfiable for the
-- target schema while preserving application-facing views that rely on RLS.

DO $$
DECLARE
  public_view record;
BEGIN
  FOR public_view IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format(
      'ALTER VIEW %I.%I SET (security_invoker = true)',
      public_view.nspname,
      public_view.relname
    );
  END LOOP;
END $$;

DO $$
DECLARE
  public_view record;
BEGIN
  FOR public_view IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v'
      AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', public_view.nspname, public_view.relname);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon', public_view.nspname, public_view.relname);
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM authenticated', public_view.nspname, public_view.relname);
  END LOOP;
END $$;

GRANT SELECT ON TABLE
  public.v_user_ltv,
  public.v_behavior_compliance_report,
  public.v_compliance_report_with_interventions,
  public.v_intervention_effectiveness
TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.v_review_queue') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.v_review_queue TO authenticated;
  END IF;

  IF to_regclass('public.v_risk_queue') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.v_risk_queue TO authenticated;
  END IF;

  IF to_regclass('public.v_unfinished_queue') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.v_unfinished_queue TO authenticated;
  END IF;

  IF to_regclass('public.v_unlock_candidates') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.v_unlock_candidates TO authenticated;
  END IF;

  IF to_regclass('public.v_weekly_counts') IS NOT NULL THEN
    GRANT SELECT ON TABLE public.v_weekly_counts TO authenticated;
  END IF;
END $$;

COMMENT ON VIEW public.v_user_ltv IS
  'Governed revenue analytics view; uses security_invoker so base-table RLS controls row visibility.';
COMMENT ON VIEW public.v_churn_analysis IS
  'Governed churn analytics view; direct anon/authenticated access is revoked.';
COMMENT ON VIEW public.v_mrr_arr_summary IS
  'Governed MRR/ARR analytics view; direct anon/authenticated access is revoked.';
COMMENT ON VIEW public.v_behavior_compliance_report IS
  'Governed admin analytics view; uses security_invoker so base-table RLS controls row visibility.';
COMMENT ON VIEW public.v_compliance_report_with_interventions IS
  'Governed admin intervention analytics view; uses security_invoker so base-table RLS controls row visibility.';
COMMENT ON VIEW public.v_intervention_effectiveness IS
  'Governed intervention analytics view; uses security_invoker so base-table RLS controls row visibility.';
