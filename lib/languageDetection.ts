import { supabase } from './supabaseClient';

export interface LanguageDetectionResult {
  language: string;
  languageName: string;
  confidence: number;
  dialect?: string;
}

export interface EmergencyPhraseMatch {
  phraseType: string;
  priorityLevel: number;
  responseAction: string;
  matchedText: string;
}

class LanguageDetectionService {
  private supportedLanguages = [
    { code: 'en', name: 'English', speechRecognitionCode: 'en-GB' },
    { code: 'en-US', name: 'English (US)', speechRecognitionCode: 'en-US' },
    { code: 'es', name: 'Spanish', speechRecognitionCode: 'es-ES' },
    { code: 'fr', name: 'French', speechRecognitionCode: 'fr-FR' },
    { code: 'de', name: 'German', speechRecognitionCode: 'de-DE' },
    { code: 'it', name: 'Italian', speechRecognitionCode: 'it-IT' },
    { code: 'pt', name: 'Portuguese', speechRecognitionCode: 'pt-PT' },
    { code: 'pl', name: 'Polish', speechRecognitionCode: 'pl-PL' },
    { code: 'hi', name: 'Hindi', speechRecognitionCode: 'hi-IN' },
    { code: 'zh', name: 'Chinese', speechRecognitionCode: 'zh-CN' },
    { code: 'ar', name: 'Arabic', speechRecognitionCode: 'ar-SA' },
    { code: 'ur', name: 'Urdu', speechRecognitionCode: 'ur-PK' },
    { code: 'bn', name: 'Bengali', speechRecognitionCode: 'bn-BD' },
    { code: 'pa', name: 'Punjabi', speechRecognitionCode: 'pa-IN' },
  ];

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    // Simple heuristic-based language detection
    // In production, you'd use a proper language detection API
    const cleanText = text.toLowerCase().trim();

    // Check for common patterns in different languages
    const patterns = {
      es: /\b(hola|gracias|por favor|ayuda|dolor|caí)\b/,
      fr: /\b(bonjour|merci|aide|douleur|tombé)\b/,
      de: /\b(hallo|danke|hilfe|schmerzen|gefallen)\b/,
      it: /\b(ciao|grazie|aiuto|dolore|caduto)\b/,
      pl: /\b(cześć|dziękuję|pomoc|ból|upadłem)\b/,
      hi: /[\u0900-\u097F]/,
      ar: /[\u0600-\u06FF]/,
      zh: /[\u4E00-\u9FFF]/,
      ur: /[\u0600-\u06FF]/,
      bn: /[\u0980-\u09FF]/,
      pa: /[\u0A00-\u0A7F]/,
    };

    for (const [langCode, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanText)) {
        const language = this.supportedLanguages.find((l) => l.code === langCode);
        return {
          language: langCode,
          languageName: language?.name || langCode,
          confidence: 0.8,
        };
      }
    }

    // Default to English with low confidence
    return {
      language: 'en',
      languageName: 'English',
      confidence: 0.3,
    };
  }

  async checkEmergencyPhrases(
    text: string,
    languageCode: string
  ): Promise<EmergencyPhraseMatch | null> {
    try {
      const { data: phrases, error } = await supabase
        .from('emergency_phrases_multilingual')
        .select('*')
        .eq('language_code', languageCode)
        .order('priority_level', { ascending: false });

      if (error) throw error;

      const cleanText = text.toLowerCase().trim();

      for (const phrase of phrases || []) {
        if (cleanText.includes(phrase.phrase_text.toLowerCase())) {
          return {
            phraseType: phrase.phrase_type,
            priorityLevel: phrase.priority_level,
            responseAction: phrase.response_action,
            matchedText: phrase.phrase_text,
          };
        }

        // Check phonetic variations
        for (const variation of phrase.phonetic_variations || []) {
          if (cleanText.includes(variation.toLowerCase())) {
            return {
              phraseType: phrase.phrase_type,
              priorityLevel: phrase.priority_level,
              responseAction: phrase.response_action,
              matchedText: variation,
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking emergency phrases:', error);
      return null;
    }
  }

  async logLanguageEvent(
    userId: string,
    detectedLanguage: string,
    confidence: number,
    options: {
      conversationId?: string;
      previousLanguage?: string;
      triggerType?: 'automatic' | 'manual' | 'emergency' | 'family_request';
      context?: string;
      emotionalState?: string;
      transcriptSnippet?: string;
      durationSeconds?: number;
    } = {}
  ): Promise<void> {
    try {
      const { error } = await supabase.from('conversation_language_events').insert({
        user_id: userId,
        conversation_id: options.conversationId,
        detected_language: detectedLanguage,
        confidence_score: confidence,
        previous_language: options.previousLanguage,
        trigger_type: options.triggerType || 'automatic',
        context: options.context,
        emotional_state: options.emotionalState,
        transcript_snippet: options.transcriptSnippet?.substring(0, 500),
        duration_seconds: options.durationSeconds,
      });

      if (error) throw error;

      // Update user's language history
      const { data: currentHistory } = await supabase
        .from('users')
        .select('detected_languages_history')
        .eq('id', userId)
        .single();

      const history = currentHistory?.detected_languages_history || [];
      if (!history.includes(detectedLanguage)) {
        await supabase
          .from('users')
          .update({
            detected_languages_history: [...history, detectedLanguage],
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error logging language event:', error);
    }
  }

  async getUserLanguagePreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_language_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user language preferences:', error);
      return null;
    }
  }

  async updateUserLanguagePreferences(
    userId: string,
    preferences: {
      primary_language?: string;
      primary_language_name?: string;
      primary_dialect?: string;
      secondary_languages?: string[];
      fluency_levels?: Record<string, string>;
      preferred_voice_id?: Record<string, string>;
      auto_detect_enabled?: boolean;
      cultural_context?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_language_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating language preferences:', error);
      throw error;
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  getSpeechRecognitionLanguage(languageCode: string): string {
    const language = this.supportedLanguages.find((l) => l.code === languageCode);
    return language?.speechRecognitionCode || 'en-GB';
  }

  async getVoiceForLanguage(
    languageCode: string,
    userId?: string
  ): Promise<{ voiceId: string; modelId: string } | null> {
    try {
      // Check user's preferred voice first
      if (userId) {
        const preferences = await this.getUserLanguagePreferences(userId);
        if (preferences?.preferred_voice_id?.[languageCode]) {
          return {
            voiceId: preferences.preferred_voice_id[languageCode],
            modelId: 'eleven_multilingual_v2',
          };
        }
      }

      // Fallback to default voice mapping
      const { data, error } = await supabase
        .from('language_voice_mappings')
        .select('voice_id, model_id')
        .eq('language_code', languageCode)
        .eq('is_default', true)
        .single();

      if (error) throw error;

      return data
        ? {
            voiceId: data.voice_id,
            modelId: data.model_id || 'eleven_multilingual_v2',
          }
        : null;
    } catch (error) {
      console.error('Error getting voice for language:', error);
      return null;
    }
  }

  async analyzeLanguagePatterns(userId: string, dayRange: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dayRange);

      const { data: events, error } = await supabase
        .from('conversation_language_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const languageUsage: Record<string, number> = {};
      const emotionalStates: Record<string, number> = {};
      let totalSwitches = 0;

      events?.forEach((event) => {
        languageUsage[event.detected_language] =
          (languageUsage[event.detected_language] || 0) + 1;

        if (event.emotional_state) {
          emotionalStates[event.emotional_state] =
            (emotionalStates[event.emotional_state] || 0) + 1;
        }

        if (event.previous_language && event.previous_language !== event.detected_language) {
          totalSwitches++;
        }
      });

      return {
        languageUsage,
        emotionalStates,
        totalSwitches,
        totalEvents: events?.length || 0,
        mostUsedLanguage: Object.entries(languageUsage).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0],
        concerningPatterns: this.identifyConcerningPatterns(events || []),
      };
    } catch (error) {
      console.error('Error analyzing language patterns:', error);
      return null;
    }
  }

  private identifyConcerningPatterns(events: any[]): string[] {
    const concerns: string[] = [];

    // Check for sudden increase in native language use
    const recentEvents = events.slice(0, 10);
    const nativeLanguageDominance = recentEvents.filter(
      (e) => e.detected_language !== 'en'
    ).length;

    if (nativeLanguageDominance > 7) {
      concerns.push('Increased native language use may indicate stress or confusion');
    }

    // Check for distressed states
    const distressedStates = events.filter(
      (e) => e.emotional_state === 'distressed' || e.emotional_state === 'confused'
    ).length;

    if (distressedStates > 5) {
      concerns.push('Multiple distressed emotional states detected');
    }

    // Check for emergency triggers
    const emergencyTriggers = events.filter((e) => e.trigger_type === 'emergency').length;

    if (emergencyTriggers > 0) {
      concerns.push(`${emergencyTriggers} emergency phrase(s) detected`);
    }

    return concerns;
  }
}

export const languageDetection = new LanguageDetectionService();
