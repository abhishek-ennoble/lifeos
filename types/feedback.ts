export type FeedbackSource = 'capture' | 'backfill' | 'chat';
export type FeedbackStatus = 'new' | 'triaged' | 'done';

export interface AppFeedback {
  id: string;
  user_id: string;
  title: string;
  body: string;
  theme: string | null;
  source: FeedbackSource;
  source_entry_id: string | null;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}
