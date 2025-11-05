'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LoginData {
  email?: string;
  password?: string;
}

interface LoginConversationProps {
  onComplete: (data: LoginData) => void;
  onSwitchToForm: () => void;
}

export default function LoginConversation({
  onComplete,
  onSwitchToForm,
}: LoginConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<LoginData>({});
  const [error, setError] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

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
      return;
    }

    setError('');
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const sendToAI = async (userMessage: string) => {
    setIsProcessing(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockResponse = generateMockResponse(userMessage, extractedData);

      const assistantMessage: Message = {
        role: 'assistant',
        content: mockResponse.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setExtractedData(mockResponse.extractedData);

      await speak(mockResponse.response);

      if (mockResponse.isComplete) {
        setTimeout(() => {
          onComplete(mockResponse.extractedData);
        }, 1000);
      }
    } catch (err) {
      console.error('Error communicating with AI:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockResponse = (userMessage: string, currentData: LoginData) => {
    const newData = { ...currentData };
    let response = '';
    let isComplete = false;

    if (!newData.email) {
      newData.email = userMessage;
      response = `Thank you. Now, what's your password?`;
    } else if (!newData.password) {
      newData.password = userMessage;
      response = `Perfect! Let me sign you in now.`;
      isComplete = true;
    }

    return { response, extractedData: newData, isComplete };
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
    const greeting = "Hello! Welcome back to Grace Companion. What's your email address?";

    const greetingMessage: Message = {
      role: 'assistant',
      content: greeting,
    };

    setMessages([greetingMessage]);
    await speak(greeting);
  };

  if (!hasStarted) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-lg p-8 md:p-12">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-sky-blue/20 rounded-full flex items-center justify-center mx-auto">
            <Mic className="w-12 h-12 text-sky-blue" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-deep-navy">
            Sign In with Voice
          </h2>
          <p className="text-xl text-deep-navy/70 leading-relaxed max-w-2xl mx-auto">
            Welcome back! I can help you sign in using your voice. Just tell me your email and password.
          </p>
          <div className="bg-mint-green/20 rounded-[16px] p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-deep-navy mb-3">Quick tips:</h3>
            <ul className="space-y-2 text-deep-navy/80">
              <li>• Make sure you're in a quiet place</li>
              <li>• Speak your email clearly (e.g., "john at email dot com")</li>
              <li>• Press the microphone when ready</li>
              <li>• You can switch to the form anytime</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 pt-4 max-w-md mx-auto">
            <Button
              onClick={startConversation}
              className="w-full h-16 text-xl font-semibold rounded-[16px] bg-sky-blue hover:bg-sky-blue/90 text-white"
            >
              <Mic className="w-6 h-6 mr-3" strokeWidth={1.5} />
              Sign In with Voice
            </Button>
            <Button
              onClick={onSwitchToForm}
              variant="outline"
              className="w-full h-14 text-lg rounded-[16px] border-2"
            >
              <FileText className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Use Form Instead
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-lg p-8 md:p-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-deep-navy">
            Signing You In
          </h2>
          {isSpeaking && (
            <div className="flex items-center gap-2 text-sky-blue">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Grace is speaking...</span>
            </div>
          )}
        </div>

        <div className="bg-soft-gray/30 rounded-[16px] p-6 max-h-[400px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-deep-navy/60">
              Your conversation will appear here...
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
                        ? 'bg-mint-green text-white'
                        : 'bg-sky-blue/20 text-deep-navy border-2 border-sky-blue/30'
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
          <div className="bg-sky-blue/10 border-2 border-sky-blue/30 rounded-[16px] p-4">
            <h3 className="font-semibold text-deep-navy mb-2 text-sm">Information Collected:</h3>
            <div className="space-y-1 text-sm text-deep-navy/70">
              {extractedData.email && <p>✓ Email: {extractedData.email}</p>}
              {extractedData.password && <p>✓ Password: ••••••••</p>}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-coral-red/10 border-2 border-coral-red rounded-[16px] p-4">
            <p className="text-coral-red text-center">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onSwitchToForm}
            variant="outline"
            className="h-14 px-6 text-base rounded-[16px]"
            disabled={isListening || isSpeaking || isProcessing}
          >
            <FileText className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Use Form
          </Button>
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || isProcessing}
            className={`flex-1 h-14 text-lg font-semibold rounded-[16px] ${
              isListening
                ? 'bg-coral-red hover:bg-coral-red/90 text-white'
                : 'bg-sky-blue hover:bg-sky-blue/90 text-white'
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
