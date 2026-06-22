import type { Domain, LifeArea } from '@/constants/domains';

export type EntryStatus = 'pending' | 'done' | 'archived' | 'snoozed';
export type EntryPriority = 'high' | 'medium' | 'low';

/** Cross-cutting life-area tag available on any entry's metadata. */
interface WithLifeArea {
  life_area?: LifeArea;
}

export interface HealthMetadata extends WithLifeArea {
  name: string;
  dose?: string;
  frequency: string;
  times: string[];
}

export interface TaskMetadata extends WithLifeArea {
  subdomain: 'errand' | 'work' | 'personal';
  ephemeral: boolean;
}

export interface LearningMetadata extends WithLifeArea {
  horizon: 'lifetime' | 'long' | 'short';
  daily_target_mins?: number;
  resource?: string;
  interval_days?: number;
}

export interface IdeaMetadata extends WithLifeArea {
  tag: 'personal' | 'business' | 'product';
  research_ready: boolean;
  voice_note_url?: string;
}

export interface NoteMetadata extends WithLifeArea {
  expires_in_hours: 12 | 24 | 48 | 168;
}

/** Reflective journal entry — no expiry, no action, never nags. */
export interface JournalMetadata extends WithLifeArea {
  mood?: string;
  /** Structured prompts from the evening reflection ritual. */
  highlight?: string;
  gratitude?: string;
  tomorrow_anchor?: string;
}

export type EntryMetadata =
  | HealthMetadata
  | TaskMetadata
  | LearningMetadata
  | IdeaMetadata
  | NoteMetadata
  | JournalMetadata;

export interface Entry {
  id: string;
  user_id: string;
  raw_input: string | null;
  domain: Domain;
  title: string;
  description: string | null;
  metadata: EntryMetadata | null;
  priority: EntryPriority;
  status: EntryStatus;
  is_recurring: boolean;
  recurrence_rule: string | null;
  due_at: string | null;
  expires_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassifiedEntry {
  domain: Domain;
  title: string;
  description: string | null;
  priority: EntryPriority;
  is_recurring: boolean;
  recurrence_rule: string | null;
  metadata: EntryMetadata | null;
  /** Optional cross-cutting life-area tag inferred by the classifier. */
  life_area: LifeArea | null;
  expires_at: string | null;
  due_at: string | null;
  confidence: number;
}

export interface Reminder {
  id: string;
  user_id: string;
  entry_id: string;
  fire_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
}

export interface Briefing {
  id: string;
  user_id: string;
  content: string;
  date: string;
  generated_at: string;
}
