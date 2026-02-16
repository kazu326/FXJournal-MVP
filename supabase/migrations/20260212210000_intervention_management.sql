-- interventions テーブル
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL CHECK (
    intervention_type IN (
      'retention_email',
      'onboarding_call',
      'custom_message',
      'course_recommendation',
      'discount_offer',
      'manual_support'
    )
  ),
  trigger_reason TEXT NOT NULL,
  trigger_metric JSONB,
  action_taken TEXT NOT NULL,
  expected_outcome TEXT,
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'failed')
  ),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interventions_user_id ON interventions(user_id);
CREATE INDEX idx_interventions_type ON interventions(intervention_type);
CREATE INDEX idx_interventions_status ON interventions(status);

COMMENT ON TABLE interventions IS 'ユーザーに対して実施した施策の記録';

-- intervention_outcomes テーブル
CREATE TABLE intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  before_value NUMERIC,
  after_value NUMERIC,
  improvement_percent NUMERIC,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_intervention_outcomes_intervention_id ON intervention_outcomes(intervention_id);

COMMENT ON TABLE intervention_outcomes IS '施策の効果測定・結果追跡';

-- measurement_schedule テーブル
CREATE TABLE measurement_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  measure_at TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  before_snapshot JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_measurement_schedule_measure_at ON measurement_schedule(measure_at);
CREATE INDEX idx_measurement_schedule_status ON measurement_schedule(status);

-- v_intervention_effectiveness ビュー
CREATE OR REPLACE VIEW v_intervention_effectiveness AS
SELECT 
  i.intervention_type,
  i.trigger_reason,
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
GROUP BY i.intervention_type, i.trigger_reason
ORDER BY avg_improvement DESC;

-- v_compliance_report_with_interventions ビュー
CREATE OR REPLACE VIEW v_compliance_report_with_interventions AS
SELECT 
  bcr.*,
  i.intervention_count,
  i.last_intervention_date,
  i.last_intervention_type,
  io.improvement_percent,
  io.metrics_improved
FROM v_behavior_compliance_report bcr
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) AS intervention_count,
    MAX(executed_at) AS last_intervention_date,
    (ARRAY_AGG(intervention_type ORDER BY executed_at DESC))[1] AS last_intervention_type
  FROM interventions
  WHERE user_id = bcr.user_id
) i ON TRUE
LEFT JOIN LATERAL (
  SELECT 
    AVG(improvement_percent) AS improvement_percent,
    STRING_AGG(DISTINCT metric_name, ', ') AS metrics_improved
  FROM intervention_outcomes io2
  JOIN interventions i2 ON io2.intervention_id = i2.id
  WHERE i2.user_id = bcr.user_id
) io ON TRUE;

-- RLS設定
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage interventions" ON interventions
  FOR ALL USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can view outcomes" ON intervention_outcomes
  FOR SELECT USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage schedules" ON measurement_schedule
  FOR ALL USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
