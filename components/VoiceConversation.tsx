'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { retryWithBackoff, shouldRetry } from '@/lib/retryHelper';
import { TTSCache } from '@/lib/ttsCache';
import { AudioCues } from '@/lib/audioCues';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RegistrationData {
  name?: string;
  email?: string;
  timezone?: string;
  relationship?: string;
  phone?: string;
  elderName?: string;
  elderEmail?: string;
  elderTimezone?: string;
}

interface VoiceConversationProps {
  registrationType: 'elder' | 'nok';
  onComplete: (data: RegistrationData) => void;
  onCancel?: () => void;
}

export default function VoiceConversation({
  registrationType,
  onComplete,
  onCancel,
}: VoiceConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<RegistrationData>({});
  const [error, setError] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-GB';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleUserMessage(transcript);
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

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = async (text: string) => {
    setIsSpeaking(true);

    try {
      const voiceId = 'EXAVITQu4vr4xnSDxMaL';

      let audioBlob = await TTSCache.get(text, { voiceId });

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

        TTSCache.set(text, audioBlob, { voiceId }).catch(err => {
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
      console.error('Error with ElevenLabs TTS:', error);
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

  const sendToAI = async (userMessage: string) => {
    setIsProcessing(true);
    setError('');
    AudioCues.playProcessing();

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const conversationMessages = [
        ...messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const data = await retryWithBackoff(
        async () => {
          const response = await fetch(`${supabaseUrl}/functions/v1/voice-conversation`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: conversationMessages,
              registrationType,
              currentData: extractedData,
            }),
          });

          if (!response.ok) {
            const error: any = new Error('Failed to get AI response');
            error.statusCode = response.status;
            throw error;
          }

          return await response.json();
        },
        {
          maxRetries: 2,
          retryDelay: 1000,
          onRetry: (error, attempt) => {
            console.log(`Retrying AI conversation (attempt ${attempt}):`, error.message);
          },
        }
      );

      if (data.error) {
        throw new Error(data.error);
      }

      setExtractedData(data.extractedData);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await speak(data.response);

      if (data.isComplete) {
        AudioCues.playSuccess();
        setTimeout(() => {
          onComplete(data.extractedData);
        }, 1000);
      }
    } catch (err) {
      console.error('Error communicating with AI:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      AudioCues.playError();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    const userMessage: Message = {
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    await sendToAI(message);
  };

  const startConversation = async () => {
    setHasStarted(true);
    const greeting = registrationType === 'elder'
      ? "Hello! I'm Grace, and I'm delighted to help you get started. What's your name?"
      : "Hello! I'm Grace. Thank you for helping your loved one register. May I start by getting your name?";

    const greetingMessage: Message = {
      role: 'assistant',
      content: greeting,
    };

    setMessages([greetingMessage]);
    await speak(greeting);
  };

  if (!browserSupported) {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-coral-red/10 rounded-full flex items-center justify-center mx-auto">
            <MicOff className="w-12 h-12 text-coral-red" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-deep-navy">
            Browser Not Supported
          </h2>
          <p className="text-xl text-deep-navy/70 leading-relaxed max-w-2xl mx-auto">
            Voice registration requires speech recognition support. Please use Chrome, Edge, or Safari on desktop or mobile.
          </p>
          <div className="bg-sky-blue/20 rounded-[16px] p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-deep-navy mb-3">Supported Browsers:</h3>
            <ul className="space-y-2 text-deep-navy/80">
              <li>• Google Chrome (recommended)</li>
              <li>• Microsoft Edge</li>
              <li>• Safari on iOS/macOS</li>
              <li>• Chrome on Android</li>
            </ul>
          </div>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="h-14 px-8 text-lg rounded-[16px]"
            >
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!hasStarted) {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-coral-red/10 rounded-full flex items-center justify-center mx-auto">
            <Mic className="w-12 h-12 text-coral-red" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-deep-navy">
            Voice Registration
          </h2>
          <p className="text-xl text-deep-navy/70 leading-relaxed max-w-2xl mx-auto">
            I'll guide you through registration with a natural conversation. Just speak naturally, and I'll take care of the rest.
          </p>
          <div className="bg-mint-green/20 rounded-[16px] p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-deep-navy mb-3">Tips for best results:</h3>
            <ul className="space-y-2 text-deep-navy/80">
              <li>• Find a quiet place</li>
              <li>• Speak clearly and at a normal pace</li>
              <li>• Press the microphone button when you want to speak</li>
              <li>• Take your time - I'm patient</li>
            </ul>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="h-14 px-8 text-lg rounded-[16px]"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={startConversation}
              className="h-14 px-8 text-lg font-semibold rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white"
            >
              Start Conversation
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-deep-navy">
            Voice Registration
          </h2>
          {isSpeaking && (
            <div className="flex items-center gap-2 text-coral-red">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Speaking...</span>
            </div>
          )}
        </div>

        <div className="bg-soft-gray/30 rounded-[16px] p-6 max-h-[400px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-deep-navy/60">
              Conversation will appear here...
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-[16px] p-4 ${
                      message.role === 'user'
                        ? 'bg-sky-blue text-white'
                        : 'bg-mint-green/20 text-deep-navy'
                    }`}
                  >
                    <p className="leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {extractedData && Object.keys(extractedData).length > 0 && (
          <div className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-4">
            <h3 className="font-semibold text-deep-navy mb-2 text-sm">Information Collected:</h3>
            <div className="space-y-1 text-sm text-deep-navy/70">
              {extractedData.name && <p>Name: {extractedData.name}</p>}
              {extractedData.email && <p>Email: {extractedData.email}</p>}
              {extractedData.relationship && <p>Relationship: {extractedData.relationship}</p>}
              {extractedData.phone && <p>Phone: {extractedData.phone}</p>}
              {extractedData.elderName && <p>Elder Name: {extractedData.elderName}</p>}
              {extractedData.elderEmail && <p>Elder Email: {extractedData.elderEmail}</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-coral-red/10 border-2 border-coral-red rounded-[16px] p-4">
            <p className="text-coral-red text-center">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 h-14 text-lg rounded-[16px]"
              disabled={isListening || isSpeaking || isProcessing}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || isProcessing}
            className={`flex-1 h-14 text-lg font-semibold rounded-[16px] ${
              isListening
                ? 'bg-coral-red hover:bg-coral-red/90'
                : 'bg-mint-green hover:bg-mint-green/90 text-deep-navy'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                {isSpeaking ? 'Grace is speaking...' : 'Press to Speak'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
