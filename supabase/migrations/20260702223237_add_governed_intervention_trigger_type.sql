DO $$
BEGIN
  CREATE TYPE intervention_trigger_type AS ENUM (
    'overtrading',
    'rule_violation',
    'no_skip_discipline',
    'learning_stall',
    'record_inactivity'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE interventions
  ADD COLUMN IF NOT EXISTS trigger_type intervention_trigger_type;

UPDATE interventions
SET trigger_type = trigger_reason::intervention_trigger_type
WHERE trigger_type IS NULL
  AND trigger_reason IN (
    'overtrading',
    'rule_violation',
    'no_skip_discipline',
    'learning_stall',
    'record_inactivity'
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM interventions WHERE trigger_type IS NULL) THEN
    RAISE EXCEPTION
      'Cannot enforce governed intervention triggers: classify existing interventions.trigger_reason values into trigger_type first.';
  END IF;
END $$;

ALTER TABLE interventions
  ALTER COLUMN trigger_type SET NOT NULL,
  ALTER COLUMN trigger_reason DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_trigger_type
  ON interventions(trigger_type);

CREATE OR REPLACE VIEW v_intervention_effectiveness AS
SELECT
  i.intervention_type,
  i.trigger_type,
  COUNT(*) AS total_interventions,
  COUNT(CASE WHEN i.status = 'completed' THEN 1 END) AS completed,
  AVG(io.improvement_percent) AS avg_improvement,
  SUM(CASE WHEN io.improvement_percent > 0 THEN 1 ELSE 0 END) AS successful_cases,
  ROUND(
    SUM(CASE WHEN io.improvement_percent > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) AS success_rate
FROM interventions i
LEFT JOIN intervention_outcomes io ON i.id = io.intervention_id
GROUP BY i.intervention_type, i.trigger_type
ORDER BY avg_improvement DESC;
