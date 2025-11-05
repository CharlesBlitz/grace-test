'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Loader2, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SignupData {
  name?: string;
  email?: string;
  password?: string;
  role?: 'elder' | 'nok';
}

interface SignupConversationProps {
  onComplete: (data: SignupData) => void;
  onSwitchToForm: () => void;
}

export default function SignupConversation({
  onComplete,
  onSwitchToForm,
}: SignupConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<SignupData>({});
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

      console.log('Calling ElevenLabs TTS with text:', text.substring(0, 50));

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

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS error response:', errorText);
        throw new Error('Failed to generate speech: ' + errorText);
      }

      const audioBlob = await response.blob();
      console.log('Audio blob received:', audioBlob.size, 'bytes', audioBlob.type);

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      // Set volume to maximum
      audio.volume = 1.0;

      console.log('Attempting to play audio...');

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          console.log('Audio finished playing');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (e) => {
          console.error('Audio error:', e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };

        audio.play()
          .then(() => {
            console.log('Audio started playing successfully');
          })
          .catch((err) => {
            console.error('Play failed:', err);
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            reject(err);
          });
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
      const systemPrompt = `You are Grace, a warm and friendly AI assistant helping someone create an account.
You need to collect: name, email, password, and whether they are an "elder user" or "family member/caregiver".

Be conversational and natural. Ask one question at a time. Be patient and understanding.
When someone provides information, acknowledge it warmly before asking the next question.

Extract information from their responses and format it as JSON.
When you have all required information, respond with "COMPLETE" at the end of your message.

Current data collected: ${JSON.stringify(extractedData)}

Conversation rules:
- Ask for name first
- Then email address
- Then password (at least 6 characters)
- Finally, ask if they are an elder user or family member/caregiver
- Be warm and encouraging throughout
`;

      const conversationHistory = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const mockResponse = generateMockResponse(userMessage, extractedData, messages.length);

      await new Promise(resolve => setTimeout(resolve, 1000));

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

  const generateMockResponse = (userMessage: string, currentData: SignupData, messageCount: number) => {
    const newData = { ...currentData };
    let response = '';
    let isComplete = false;

    if (!newData.name) {
      newData.name = userMessage;
      response = `Lovely to meet you, ${userMessage}! Now, what email address would you like to use for your account?`;
    } else if (!newData.email) {
      newData.email = userMessage;
      response = `Perfect. I've got ${userMessage} as your email. Now, please choose a secure password. It should be at least 6 characters long. What password would you like to use?`;
    } else if (!newData.password) {
      newData.password = userMessage;
      response = `Great, your password is set. Finally, I need to know - are you an elder user who will be using Grace Companion yourself, or are you a family member or caregiver helping to set up an account?`;
    } else if (!newData.role) {
      const lowerMessage = userMessage.toLowerCase();
      if (lowerMessage.includes('elder') || lowerMessage.includes('myself') || lowerMessage.includes('i will')) {
        newData.role = 'elder';
        response = `Wonderful! I've created your account as an elder user. You're all set, ${newData.name}!`;
        isComplete = true;
      } else if (lowerMessage.includes('family') || lowerMessage.includes('caregiver') || lowerMessage.includes('helping')) {
        newData.role = 'nok';
        response = `Excellent! I've created your account as a family member and caregiver. You're all set, ${newData.name}!`;
        isComplete = true;
      } else {
        response = `I didn't quite catch that. Are you an elder user, or are you a family member or caregiver?`;
      }
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
    const greeting = "Hello! I'm Grace, and I'm delighted to help you create your account. Let's have a quick chat. First, what's your name?";

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
          <div className="w-24 h-24 bg-mint-green/20 rounded-full flex items-center justify-center mx-auto">
            <Mic className="w-12 h-12 text-mint-green" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-deep-navy">
            Let's Talk
          </h2>
          <p className="text-xl text-deep-navy/70 leading-relaxed max-w-2xl mx-auto">
            I'll help you create your account through a friendly conversation. Just speak naturally, and I'll guide you through each step.
          </p>
          <div className="bg-sky-blue/20 rounded-[16px] p-6 text-left max-w-xl mx-auto">
            <h3 className="font-semibold text-deep-navy mb-3">For the best experience:</h3>
            <ul className="space-y-2 text-deep-navy/80">
              <li>• Find a quiet space</li>
              <li>• Speak clearly at a comfortable pace</li>
              <li>• Press the microphone when ready to speak</li>
              <li>• I'll ask one question at a time</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 pt-4 max-w-md mx-auto">
            <Button
              onClick={startConversation}
              className="w-full h-16 text-xl font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
            >
              <Mic className="w-6 h-6 mr-3" strokeWidth={1.5} />
              Start Voice Signup
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
            Creating Your Account
          </h2>
          {isSpeaking && (
            <div className="flex items-center gap-2 text-mint-green">
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
                        ? 'bg-sky-blue text-white'
                        : 'bg-mint-green/20 text-deep-navy border-2 border-mint-green/30'
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
          <div className="bg-mint-green/10 border-2 border-mint-green/30 rounded-[16px] p-4">
            <h3 className="font-semibold text-deep-navy mb-2 text-sm">Information Collected:</h3>
            <div className="space-y-1 text-sm text-deep-navy/70">
              {extractedData.name && <p>✓ Name: {extractedData.name}</p>}
              {extractedData.email && <p>✓ Email: {extractedData.email}</p>}
              {extractedData.password && <p>✓ Password: ••••••••</p>}
              {extractedData.role && <p>✓ Account Type: {extractedData.role === 'elder' ? 'Elder User' : 'Family Member/Caregiver'}</p>}
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
