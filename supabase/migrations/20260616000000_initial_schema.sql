-- LifeOS initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input        text,
  -- 'journal' is a manual reflective type (not an AI routing target); see
  -- docs/product/UX_AND_ROADMAP.md §4. No expiry, no action, never nags.
  domain           text NOT NULL CHECK (domain IN ('health', 'task', 'learning', 'idea', 'note', 'journal')),
  title            text NOT NULL,
  description      text,
  metadata         jsonb,
  priority         text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'archived', 'snoozed')),
  is_recurring     boolean NOT NULL DEFAULT false,
  recurrence_rule  text,
  due_at           timestamptz,
  expires_at       timestamptz,
  last_reviewed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reminders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id         uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  fire_at          timestamptz NOT NULL,
  sent_at          timestamptz,
  acknowledged_at  timestamptz
);

CREATE TABLE briefings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       text NOT NULL,
  date          date NOT NULL,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX entries_user_domain_status_idx ON entries (user_id, domain, status);
CREATE INDEX entries_user_updated_idx ON entries (user_id, updated_at DESC);
CREATE INDEX reminders_user_fire_at_idx ON reminders (user_id, fire_at);
CREATE INDEX briefings_user_date_idx ON briefings (user_id, date);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY entries_select_own ON entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY entries_insert_own ON entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY entries_update_own ON entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY entries_delete_own ON entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY reminders_select_own ON reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reminders_insert_own ON reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reminders_update_own ON reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY reminders_delete_own ON reminders FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY briefings_select_own ON briefings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY briefings_insert_own ON briefings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY briefings_update_own ON briefings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY briefings_delete_own ON briefings FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
