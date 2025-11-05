'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, Loader2, Globe, AlertTriangle } from 'lucide-react';
import { retryWithBackoff } from '@/lib/retryHelper';
import { TTSCache } from '@/lib/ttsCache';
import { AudioCues } from '@/lib/audioCues';
import { languageDetection, type EmergencyPhraseMatch } from '@/lib/languageDetection';
import { useAuth } from '@/lib/authContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  language?: string;
  timestamp: Date;
}

interface MultilingualVoiceConversationProps {
  onMessageReceived?: (message: string, language: string) => void;
  onLanguageSwitch?: (newLanguage: string, previousLanguage: string) => void;
  onEmergencyDetected?: (match: EmergencyPhraseMatch) => void;
  initialLanguage?: string;
  autoDetectLanguage?: boolean;
}

export default function MultilingualVoiceConversation({
  onMessageReceived,
  onLanguageSwitch,
  onEmergencyDetected,
  initialLanguage = 'en',
  autoDetectLanguage = true,
}: MultilingualVoiceConversationProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [previousLanguage, setPreviousLanguage] = useState<string | null>(null);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>([initialLanguage]);
  const [languageConfidence, setLanguageConfidence] = useState(1.0);
  const [emergencyAlert, setEmergencyAlert] = useState<EmergencyPhraseMatch | null>(null);
  const [error, setError] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [conversationStartTime, setConversationStartTime] = useState<Date | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const languageSwitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeSpeechRecognition();
    loadUserLanguagePreferences();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (languageSwitchTimeoutRef.current) {
        clearTimeout(languageSwitchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Update speech recognition language when current language changes
    if (recognitionRef.current && currentLanguage) {
      const speechRecognitionLang = languageDetection.getSpeechRecognitionLanguage(currentLanguage);
      recognitionRef.current.lang = speechRecognitionLang;
      console.log('Updated speech recognition language to:', speechRecognitionLang);
    }
  }, [currentLanguage]);

  const initializeSpeechRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = languageDetection.getSpeechRecognitionLanguage(currentLanguage);

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;
          await handleUserMessage(transcript, confidence);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setBrowserSupported(false);
      }
    }
  };

  const loadUserLanguagePreferences = async () => {
    if (!user?.id) return;

    const preferences = await languageDetection.getUserLanguagePreferences(user.id);
    if (preferences) {
      setCurrentLanguage(preferences.primary_language);
      if (preferences.secondary_languages) {
        setDetectedLanguages([preferences.primary_language, ...preferences.secondary_languages]);
      }
    }
  };

  const handleUserMessage = async (transcript: string, speechConfidence: number) => {
    if (!conversationStartTime) {
      setConversationStartTime(new Date());
    }

    // Detect language if auto-detect is enabled
    let detectedLang = currentLanguage;
    let confidence = speechConfidence;

    if (autoDetectLanguage && user?.id) {
      const detection = await languageDetection.detectLanguage(transcript);
      detectedLang = detection.language;
      confidence = Math.min(speechConfidence, detection.confidence);
      setLanguageConfidence(confidence);

      // Check if language has switched
      if (detectedLang !== currentLanguage && confidence > 0.7) {
        handleLanguageSwitch(detectedLang);
      }
    }

    // Check for emergency phrases
    const emergencyMatch = await languageDetection.checkEmergencyPhrases(transcript, detectedLang);
    if (emergencyMatch) {
      setEmergencyAlert(emergencyMatch);
      if (onEmergencyDetected) {
        onEmergencyDetected(emergencyMatch);
      }

      // Log emergency event
      if (user?.id) {
        await languageDetection.logLanguageEvent(user.id, detectedLang, confidence, {
          triggerType: 'emergency',
          context: `Emergency phrase detected: ${emergencyMatch.phraseType}`,
          transcriptSnippet: transcript,
          emotionalState: 'distressed',
        });
      }
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: transcript,
      language: detectedLang,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Log language event
    if (user?.id) {
      await languageDetection.logLanguageEvent(user.id, detectedLang, confidence, {
        previousLanguage: previousLanguage || undefined,
        transcriptSnippet: transcript,
        context: 'conversation',
      });
    }

    // Notify parent component
    if (onMessageReceived) {
      onMessageReceived(transcript, detectedLang);
    }
  };

  const handleLanguageSwitch = (newLanguage: string) => {
    // Debounce language switches to avoid rapid switching
    if (languageSwitchTimeoutRef.current) {
      clearTimeout(languageSwitchTimeoutRef.current);
    }

    languageSwitchTimeoutRef.current = setTimeout(() => {
      console.log(`Language switched from ${currentLanguage} to ${newLanguage}`);
      setPreviousLanguage(currentLanguage);
      setCurrentLanguage(newLanguage);

      if (!detectedLanguages.includes(newLanguage)) {
        setDetectedLanguages((prev) => [...prev, newLanguage]);
      }

      // Notify parent component
      if (onLanguageSwitch) {
        onLanguageSwitch(newLanguage, currentLanguage);
      }
    }, 1000);
  };

  const speak = async (text: string, languageCode?: string) => {
    setIsSpeaking(true);
    const langToUse = languageCode || currentLanguage;

    try {
      // Get voice for language
      const voiceInfo = await languageDetection.getVoiceForLanguage(langToUse, user?.id);
      const voiceId = voiceInfo?.voiceId || 'EXAVITQu4vr4xnSDxMaL';

      let audioBlob = await TTSCache.get(text, { voiceId, language: langToUse });

      if (!audioBlob) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        audioBlob = await retryWithBackoff(
          async () => {
            const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text,
                voiceId,
                languageCode: langToUse,
                userId: user?.id,
              }),
            });

            if (!response.ok) {
              const error: any = new Error('Failed to generate speech');
              error.statusCode = response.status;
              throw error;
            }

            return await response.blob();
          },
          {
            maxRetries: 2,
            retryDelay: 1000,
            onRetry: (error, attempt) => {
              console.log(`Retrying TTS (attempt ${attempt}):`, error.message);
            },
          }
        );

        TTSCache.set(text, audioBlob, { voiceId, language: langToUse }).catch(err => {
          console.error('Failed to cache TTS audio:', err);
        });
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.play();
      });
    } catch (error) {
      console.error('Error with multilingual TTS:', error);
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      AudioCues.playError();
      return;
    }

    setError('');
    setIsListening(true);
    AudioCues.playListeningStart();
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setIsListening(false);
      AudioCues.playError();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    AudioCues.playListeningStop();
  };

  const getLanguageName = (code: string): string => {
    const languages = languageDetection.getSupportedLanguages();
    return languages.find((l) => l.code === code)?.name || code;
  };

  if (!browserSupported) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-semibold">Browser Not Supported</h3>
          <p className="text-gray-600">
            Voice recognition is not supported in this browser. Please use a modern browser like
            Chrome, Edge, or Safari.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Language Status Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm font-medium">Current Language</div>
              <div className="text-xs text-gray-600">{getLanguageName(currentLanguage)}</div>
            </div>
          </div>
          <div className="flex gap-2">
            {detectedLanguages.map((lang) => (
              <Badge
                key={lang}
                variant={lang === currentLanguage ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCurrentLanguage(lang)}
              >
                {getLanguageName(lang)}
              </Badge>
            ))}
          </div>
          {autoDetectLanguage && (
            <Badge variant="secondary" className="ml-2">
              Auto-detect ON
            </Badge>
          )}
        </div>
        {languageConfidence < 0.7 && (
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Low detection confidence ({Math.round(languageConfidence * 100)}%)
          </div>
        )}
      </Card>

      {/* Emergency Alert */}
      {emergencyAlert && (
        <Card className="p-4 border-red-300 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Emergency Phrase Detected</h3>
              <p className="text-sm text-red-800 mt-1">
                Type: {emergencyAlert.phraseType} - Priority Level: {emergencyAlert.priorityLevel}/5
              </p>
              <p className="text-xs text-red-700 mt-1">
                Matched: &quot;{emergencyAlert.matchedText}&quot;
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2"
                onClick={() => setEmergencyAlert(null)}
              >
                Dismiss Alert
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Messages */}
      <Card className="p-4 h-96 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p>{message.content}</p>
                {message.language && (
                  <div className="text-xs opacity-70 mt-1">
                    {getLanguageName(message.language)}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          size="lg"
          onClick={isListening ? stopListening : startListening}
          disabled={isSpeaking || isProcessing}
          className={`w-20 h-20 rounded-full ${
            isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </Button>
        {isSpeaking && (
          <div className="flex items-center gap-2 text-blue-600">
            <Volume2 className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Speaking...</span>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
