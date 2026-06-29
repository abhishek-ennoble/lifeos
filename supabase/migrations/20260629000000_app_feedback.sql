-- App-improvement feedback (meta, separate from life entries)

CREATE TABLE app_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL,
  body             text NOT NULL,
  theme            text,
  source           text NOT NULL DEFAULT 'capture'
                   CHECK (source IN ('capture', 'backfill', 'chat')),
  source_entry_id  uuid REFERENCES entries(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'triaged', 'done')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_feedback_user_status_created_idx
  ON app_feedback (user_id, status, created_at DESC);

CREATE UNIQUE INDEX app_feedback_backfill_entry_unique_idx
  ON app_feedback (user_id, source_entry_id)
  WHERE source = 'backfill' AND source_entry_id IS NOT NULL;

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_feedback_select_own ON app_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY app_feedback_insert_own ON app_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY app_feedback_update_own ON app_feedback
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY app_feedback_delete_own ON app_feedback
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER app_feedback_updated_at
  BEFORE UPDATE ON app_feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
