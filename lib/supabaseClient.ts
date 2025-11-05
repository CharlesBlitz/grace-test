import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Use placeholder values during build time if env vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
  }
});

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce',
    }
  });
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'elder' | 'nok' | 'admin';
          timezone: string;
          consent_on: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role: 'elder' | 'nok' | 'admin';
          timezone: string;
          consent_on?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: 'elder' | 'nok' | 'admin';
          timezone?: string;
          consent_on?: string | null;
        };
      };
      voice_profiles: {
        Row: {
          id: string;
          elder_id: string;
          nok_id: string | null;
          eleven_voice_id: string;
          display_name: string;
          role: 'reminder' | 'checkin' | 'general';
        };
        Insert: {
          id?: string;
          elder_id: string;
          nok_id?: string | null;
          eleven_voice_id: string;
          display_name: string;
          role: 'reminder' | 'checkin' | 'general';
        };
        Update: {
          id?: string;
          elder_id?: string;
          nok_id?: string | null;
          eleven_voice_id?: string;
          display_name?: string;
          role?: 'reminder' | 'checkin' | 'general';
        };
      };
      care_tasks: {
        Row: {
          id: string;
          elder_id: string;
          title: string;
          type: 'med' | 'walk' | 'hydrate' | 'custom';
          schedule_cron: string;
          last_completed_at: string | null;
          status: string;
        };
        Insert: {
          id?: string;
          elder_id: string;
          title: string;
          type: 'med' | 'walk' | 'hydrate' | 'custom';
          schedule_cron: string;
          last_completed_at?: string | null;
          status?: string;
        };
        Update: {
          id?: string;
          elder_id?: string;
          title?: string;
          type?: 'med' | 'walk' | 'hydrate' | 'custom';
          schedule_cron?: string;
          last_completed_at?: string | null;
          status?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          elder_id: string;
          transcript: string;
          sentiment: 'pos' | 'neu' | 'neg';
          created_at: string;
        };
        Insert: {
          id?: string;
          elder_id: string;
          transcript: string;
          sentiment: 'pos' | 'neu' | 'neg';
          created_at?: string;
        };
        Update: {
          id?: string;
          elder_id?: string;
          transcript?: string;
          sentiment?: 'pos' | 'neu' | 'neg';
          created_at?: string;
        };
      };
      memory_facts: {
        Row: {
          id: string;
          elder_id: string;
          category: 'preference' | 'mood' | 'health' | 'other';
          content: string;
          conversation_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          elder_id: string;
          category: 'preference' | 'mood' | 'health' | 'other';
          content: string;
          conversation_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          elder_id?: string;
          category?: 'preference' | 'mood' | 'health' | 'other';
          content?: string;
          conversation_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
