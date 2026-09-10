import type { Domain, LifeArea } from '@/constants/domains';

export type EntryStatus = 'pending' | 'done' | 'archived' | 'snoozed';
export type EntryPriority = 'high' | 'medium' | 'low';

/** Where a capture physically came from. Provenance is part of the record. */
export type EntrySource =
  | 'app_text'
  | 'app_voice'
  | 'brain_dump'
  | 'whatsapp_import'
  | 'share_intent'
  | 'agent';

/**
 * A question the system (or the user) parked on an entry to sharpen it
 * later. Answering is the user's move, on their time — the Follow-ups queue
 * takes the "remember to come back to this" load off them.
 */
export interface FollowUp {
  id: string;
  question: string;
  asked_by: 'system' | 'user';
  asked_at: string;
  answer?: string;
  answered_at?: string;
}

/** Cross-cutting fields available on any entry's metadata. */
interface WithLifeArea {
  life_area?: LifeArea;
  source?: EntrySource;
  /** When the thought was originally written, if it predates capture (imports). */
  original_at?: string;
  /** Groups entries that arrived in the same batch import. */
  import_batch_id?: string;
  /** Practice/period begins here — never "overdue" (classifier `start_at`). */
  start_at?: string;
  follow_ups?: FollowUp[];
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
  /** Relative reminder: fire in N minutes from capture. */
  reminder_in_minutes?: number;
  /** Absolute ISO8601 remind time. */
  remind_at?: string;
  /** When true and due_at is set, schedule a notification at due_at. */
  wants_reminder?: boolean;
  /** Parent entry when this task was spawned from a blocked reminder. */
  linked_entry_id?: string;
  /** Reminder accountability loop state (1.2f). */
  reminder_state?: {
    snooze_count?: number;
    blocked_note?: string;
    last_ack?: 'done' | 'snoozed' | 'blocked' | 'dismissed';
    follow_up_scheduled?: boolean;
  };
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
  /** Named idea thread for grouping (e.g. "LifeOS agents", "MedTracker"). */
  thread?: string;
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
  /** Classifier output domain; `feedback` routes to app_feedback, not entries. */
  domain: Domain | 'feedback';
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

export interface ClassifyResponse {
  items: ClassifiedEntry[];
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
