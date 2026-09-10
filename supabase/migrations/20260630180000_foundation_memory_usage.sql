-- Foundation: user memory, preferences, AI usage tracking, journal feedback source

CREATE TABLE user_preferences (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_memory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     text NOT NULL CHECK (category IN ('pattern', 'preference', 'context')),
  content      text NOT NULL,
  confidence   real NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_memory_user_updated_idx ON user_memory (user_id, updated_at DESC);

CREATE TABLE ai_usage (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name  text NOT NULL,
  model          text NOT NULL,
  input_tokens   int NOT NULL DEFAULT 0,
  output_tokens  int NOT NULL DEFAULT 0,
  est_cost_usd   numeric(10, 6) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_usage_user_created_idx ON ai_usage (user_id, created_at DESC);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_own ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_preferences_insert_own ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_update_own ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_memory_select_own ON user_memory
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_memory_insert_own ON user_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_memory_update_own ON user_memory
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY user_memory_delete_own ON user_memory
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY ai_usage_select_own ON ai_usage
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE app_feedback DROP CONSTRAINT IF EXISTS app_feedback_source_check;
ALTER TABLE app_feedback ADD CONSTRAINT app_feedback_source_check
  CHECK (source IN ('capture', 'backfill', 'chat', 'journal'));

CREATE UNIQUE INDEX IF NOT EXISTS app_feedback_journal_entry_unique_idx
  ON app_feedback (user_id, source_entry_id)
  WHERE source = 'journal' AND source_entry_id IS NOT NULL;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_memory_updated_at
  BEFORE UPDATE ON user_memory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
