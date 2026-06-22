export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string;
          user_id: string;
          raw_input: string | null;
          domain: string;
          title: string;
          description: string | null;
          metadata: Json | null;
          priority: string;
          status: string;
          is_recurring: boolean;
          recurrence_rule: string | null;
          due_at: string | null;
          expires_at: string | null;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_input?: string | null;
          domain: string;
          title: string;
          description?: string | null;
          metadata?: Json | null;
          priority?: string;
          status?: string;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          due_at?: string | null;
          expires_at?: string | null;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          raw_input?: string | null;
          domain?: string;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
          priority?: string;
          status?: string;
          is_recurring?: boolean;
          recurrence_rule?: string | null;
          due_at?: string | null;
          expires_at?: string | null;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string;
          fire_at: string;
          sent_at: string | null;
          acknowledged_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_id: string;
          fire_at: string;
          sent_at?: string | null;
          acknowledged_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_id?: string;
          fire_at?: string;
          sent_at?: string | null;
          acknowledged_at?: string | null;
        };
        Relationships: [];
      };
      briefings: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          date: string;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          date: string;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          date?: string;
          generated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
