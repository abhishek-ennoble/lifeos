-- On-demand feedback digest artifacts (2.1-lite)

CREATE TABLE feedback_digests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      text NOT NULL,
  item_count   int NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_digests_user_generated_idx
  ON feedback_digests (user_id, generated_at DESC);

ALTER TABLE feedback_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_digests_select_own ON feedback_digests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY feedback_digests_insert_own ON feedback_digests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
