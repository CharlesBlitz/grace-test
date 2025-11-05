'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import FeatureGate from '@/components/FeatureGate';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/authContext';
import { logInteraction } from '@/lib/interactionLogger';
import { detectIncident } from '@/lib/incidentDetector';
import { supabase } from '@/lib/supabaseClient';
import { showLocalNotification, createConversationNotification } from '@/lib/pushNotifications';
import { sendEmergencyAlert, sendIncidentAlertToOrganization } from '@/lib/notificationScheduler';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function ChatPageContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);
  const [conversationStart, setConversationStart] = useState<Date | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        handleUserMessage(text);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    loadOrganizationId();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const loadOrganizationId = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('organization_residents')
      .select('organization_id')
      .eq('resident_id', user.id)
      .single();

    if (data) {
      setOrganizationId(data.organization_id);
    }
  };

  const startListening = async () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setConversationStart(new Date());
      recognitionRef.current.start();

      // Show persistent notification during conversation
      const { title, options } = createConversationNotification();
      await showLocalNotification(title, options);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleUserMessage = async (text: string) => {
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const elderId = user?.id || 'demo-elder-id';
      const response = await fetch('/api/conv/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, elderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.limitReached) {
          setLimitError(data.error);
          const errorMessage: Message = {
            role: 'assistant',
            content: data.error + ' Please upgrade your plan to continue chatting.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.replyText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      logConversationInteraction(text, data.replyText);

      if (volumeOn) {
        await generateAndPlayAudio(data.replyText);
      }
    } catch (error) {
      console.error('Error getting response:', error);
    }
  };

  const logConversationInteraction = async (userText: string, assistantText: string) => {
    if (!user) return;

    const conversationEnd = new Date();
    const durationSeconds = conversationStart
      ? Math.floor((conversationEnd.getTime() - conversationStart.getTime()) / 1000)
      : 0;

    const fullTranscript = `User: ${userText}\nAssistant: ${assistantText}`;

    const incidentDetection = detectIncident(fullTranscript);

    const interactionType = incidentDetection.isIncident && incidentDetection.confidence >= 0.6
      ? 'incident'
      : 'conversation';

    const { data: interactionLog } = await logInteraction({
      resident_id: user.id,
      organization_id: organizationId || undefined,
      interaction_type: interactionType,
      interaction_source: 'voice_chat',
      raw_transcript: fullTranscript,
      duration_seconds: durationSeconds,
      detected_concerns: incidentDetection.detectedKeywords,
      interaction_start: conversationStart || conversationEnd,
      interaction_end: conversationEnd,
      metadata: {
        user_message_length: userText.length,
        assistant_message_length: assistantText.length,
        incident_detection: incidentDetection.isIncident ? {
          severity: incidentDetection.severity,
          confidence: incidentDetection.confidence,
          categories: incidentDetection.categories,
          requires_immediate_alert: incidentDetection.requiresImmediateAlert,
        } : null,
      },
    });

    if (incidentDetection.requiresImmediateAlert && interactionLog) {
      // Send emergency alert to family members
      await sendEmergencyAlert(
        user.id,
        incidentDetection.categories.join(', '),
        incidentDetection.severity,
        incidentDetection.detectedKeywords
      );

      // If resident is in an organization, alert staff too
      if (organizationId) {
        await sendIncidentAlertToOrganization(
          organizationId,
          user.id,
          incidentDetection.categories.join(', '),
          incidentDetection.severity,
          incidentDetection.detectedKeywords
        );
      }

      if (organizationId) {
        await triggerIncidentAlert(interactionLog.id, organizationId, incidentDetection);
      }
    }
  };

  const triggerIncidentAlert = async (
    interactionId: string,
    orgId: string,
    detection: any
  ) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await fetch(`${supabaseUrl}/functions/v1/incident-alert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interactionId,
          organizationId: orgId,
          residentId: user?.id,
          severity: detection.severity,
          categories: detection.categories,
          detectedKeywords: detection.detectedKeywords,
        }),
      });
    } catch (error) {
      console.error('Error triggering incident alert:', error);
    }
  };

  const generateAndPlayAudio = async (text: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      playAudio(audioUrl);
    } catch (error) {
      console.error('Error generating audio:', error);
    }
  };

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    audioRef.current = new Audio(url);
    setIsSpeaking(true);

    audioRef.current.onended = () => {
      setIsSpeaking(false);
    };

    audioRef.current.onerror = () => {
      setIsSpeaking(false);
    };

    audioRef.current.play();
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  const readLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      const utterance = new SpeechSynthesisUtterance(lastAssistantMessage.content);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-deep-navy via-[#1a3d5c] to-[#2a4d6c] p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="waves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M0 50 Q 25 30, 50 50 T 100 50" stroke="white" strokeWidth="2" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#waves)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <FeatureGate
          featureKey="voice_conversations"
          upgradeMessage="Voice conversations are not available in your current plan. Upgrade to Essential or higher to chat with Grace."
        >
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={() => setVolumeOn(!volumeOn)}
              className="text-white hover:bg-white/10"
              aria-label={volumeOn ? "Mute audio" : "Unmute audio"}
            >
              {volumeOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                onClick={readLastMessage}
                className="text-white hover:bg-white/10"
                aria-label="Read last message aloud"
              >
                Read Aloud
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-12 space-y-8">
          <div
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening || isSpeaking
                ? 'bg-gradient-to-br from-mint-green to-sky-blue animate-pulse-gentle shadow-2xl'
                : 'bg-white/10 backdrop-blur-sm'
            }`}
            role="status"
            aria-live="polite"
          >
            {isSpeaking ? (
              <div className="flex gap-2">
                <div className="w-3 h-12 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="w-3 h-16 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-10 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              </div>
            ) : (
              <Mic className={`w-24 h-24 ${isListening ? 'text-deep-navy' : 'text-white'}`} strokeWidth={1.5} />
            )}
          </div>

          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-2">
              {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Ready to Chat'}
            </p>
            {transcript && (
              <p className="text-lg text-white/80 italic">"{transcript}"</p>
            )}
          </div>

          <div className="flex gap-4">
            {!isListening && !isSpeaking ? (
              <Button
                onClick={startListening}
                size="lg"
                className="h-16 px-8 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-lg"
                aria-label="Start listening"
              >
                <Mic className="w-6 h-6 mr-2" strokeWidth={1.5} />
                Start Talking
              </Button>
            ) : (
              <Button
                onClick={isListening ? stopListening : stopSpeaking}
                size="lg"
                className="h-16 px-8 text-xl font-semibold rounded-[24px] bg-coral-red hover:bg-coral-red/90 text-white shadow-lg"
                aria-label="Stop"
              >
                <Square className="w-6 h-6 mr-2" strokeWidth={1.5} />
                Stop
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <Card
              key={idx}
              className={`p-6 rounded-[24px] shadow-md ${
                msg.role === 'user'
                  ? 'bg-warm-cream text-deep-navy ml-auto max-w-[80%]'
                  : 'bg-mint-green text-deep-navy mr-auto max-w-[80%]'
              }`}
            >
              <p className="text-lg leading-relaxed">{msg.content}</p>
              <p className="text-sm text-deep-navy/60 mt-2">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </Card>
          ))}
        </div>
        </FeatureGate>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
