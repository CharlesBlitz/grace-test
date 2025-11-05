'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Smile, MessageSquare, Volume2, ThumbsUp, Eye, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  subject: string | null;
  message_text: string;
  category: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  priority: string;
  use_cloned_voice_for_tts: boolean;
  sender: {
    id: string;
    name: string;
  };
  reactions: Array<{
    reaction_type: string;
  }>;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            name
          ),
          reactions:message_reactions (
            reaction_type
          )
        `)
        .eq('recipient_id', user?.id)
        .eq('is_draft', false)
        .not('delivered_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('family_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read_at: new Date().toISOString() } : msg
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const addReaction = async (messageId: string, reactionType: string) => {
    try {
      const existingReaction = messages
        .find((m) => m.id === messageId)
        ?.reactions.find((r) => r.reaction_type === reactionType);

      if (existingReaction) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user?.id)
          .eq('reaction_type', reactionType);

        toast.success('Reaction removed');
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .upsert({
            message_id: messageId,
            user_id: user?.id,
            reaction_type: reactionType,
          });

        if (error) throw error;
        toast.success('Reaction added!');
      }

      await fetchMessages();
      await markAsRead(messageId);
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const readAloud = async (message: Message) => {
    if (speakingMessageId === message.id) {
      speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    try {
      const textToSpeak = message.subject
        ? `${message.subject}. ${message.message_text}`
        : message.message_text;

      if (message.use_cloned_voice_for_tts) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: textToSpeak,
            voiceId: 'EXAVITQu4vr4xnSDxMaL',
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          setSpeakingMessageId(message.id);

          audio.onended = () => {
            setSpeakingMessageId(null);
          };

          audio.onerror = () => {
            setSpeakingMessageId(null);
            fallbackTTS(textToSpeak, message.id);
          };

          await audio.play();
          await markAsRead(message.id);
          return;
        }
      }

      fallbackTTS(textToSpeak, message.id);
      await markAsRead(message.id);
    } catch (error) {
      console.error('Error reading message aloud:', error);
      fallbackTTS(message.message_text, message.id);
    }
  };

  const fallbackTTS = (text: string, messageId: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    setSpeakingMessageId(messageId);

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };

    speechSynthesis.speak(utterance);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'encouragement':
        return <Heart className="w-8 h-8" strokeWidth={1.5} />;
      case 'special_occasion':
        return <Smile className="w-8 h-8" strokeWidth={1.5} />;
      default:
        return <MessageSquare className="w-8 h-8" strokeWidth={1.5} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'encouragement':
        return 'bg-coral-red/20 text-coral-red border-coral-red';
      case 'special_occasion':
        return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
      case 'update':
        return 'bg-mint-green/20 text-mint-green border-mint-green';
      default:
        return 'bg-warm-cream text-deep-navy border-soft-gray';
    }
  };

  const hasReaction = (message: Message, reactionType: string) => {
    return message.reactions?.some((r) => r.reaction_type === reactionType);
  };

  const filterMessages = (filter: string) => {
    if (filter === 'all') return messages;
    if (filter === 'unread') return messages.filter((m) => !m.read_at);
    return messages.filter((m) => m.category === filter);
  };

  const reactionButtons = [
    { type: 'heart', icon: Heart, label: 'Love' },
    { type: 'smile', icon: Smile, label: 'Happy' },
    { type: 'thumbsup', icon: ThumbsUp, label: 'Thanks' },
    { type: 'seen', icon: Eye, label: 'Seen' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
        <div className="text-2xl text-deep-navy">Loading your messages...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Messages from Family
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            {messages.filter((m) => !m.read_at).length > 0
              ? `${messages.filter((m) => !m.read_at).length} new message${
                  messages.filter((m) => !m.read_at).length > 1 ? 's' : ''
                }`
              : 'All caught up!'}
          </p>
        </Card>

        {messages.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-md p-12 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <p className="text-xl text-deep-navy/70">No messages yet</p>
            <p className="text-body text-deep-navy/60 mt-4">
              Your family will send you messages here
            </p>
          </Card>
        ) : (
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 bg-white/50 rounded-[20px] p-1">
                <TabsTrigger
                  value="all"
                  className="rounded-[16px] data-[state=active]:bg-mint-green text-base py-3"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="rounded-[16px] data-[state=active]:bg-sky-blue text-base py-3"
                >
                  Unread
                </TabsTrigger>
                <TabsTrigger
                  value="encouragement"
                  className="rounded-[16px] data-[state=active]:bg-coral-red/20 text-base py-3"
                >
                  <Heart className="w-4 h-4 mr-1" strokeWidth={1.5} />
                  Special
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-6">
              {filterMessages(activeTab).map((message) => (
                <Card
                  key={message.id}
                  className={`rounded-[24px] shadow-md transition-all duration-300 ${
                    message.read_at
                      ? 'bg-white hover:shadow-lg'
                      : 'bg-gradient-to-br from-mint-green/30 to-sky-blue/20 border-2 border-mint-green hover:shadow-xl'
                  }`}
                >
                  <div className="p-8">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${getCategoryColor(
                          message.category
                        )}`}
                      >
                        {getCategoryIcon(message.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-deep-navy">
                            From {message.sender.name}
                          </h3>
                          {!message.read_at && (
                            <span className="px-3 py-1 bg-mint-green text-deep-navy rounded-full text-sm font-semibold">
                              New
                            </span>
                          )}
                        </div>
                        {message.subject && (
                          <h4 className="text-lg font-semibold text-deep-navy/90 mb-2">
                            {message.subject}
                          </h4>
                        )}
                        <p className="text-sm text-deep-navy/60">{formatDate(message.created_at)}</p>
                      </div>
                    </div>

                    <div className="bg-white/60 rounded-[16px] p-6 mb-6">
                      <p className="text-lg leading-relaxed text-deep-navy whitespace-pre-wrap">
                        {message.message_text}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Button
                        onClick={() => readAloud(message)}
                        size="lg"
                        className={`flex-1 min-w-[200px] h-16 text-lg font-semibold rounded-[20px] ${
                          speakingMessageId === message.id
                            ? 'bg-sky-blue hover:bg-sky-blue/90'
                            : 'bg-mint-green hover:bg-mint-green/90'
                        } text-deep-navy`}
                      >
                        <Volume2 className="w-6 h-6 mr-2" strokeWidth={1.5} />
                        {speakingMessageId === message.id ? 'Stop Reading' : 'Read to Me'}
                      </Button>

                      <div className="flex gap-3">
                        {reactionButtons.map(({ type, icon: Icon, label }) => {
                          const isActive = hasReaction(message, type);
                          return (
                            <Button
                              key={type}
                              onClick={() => addReaction(message.id, type)}
                              size="lg"
                              variant="outline"
                              className={`h-16 w-16 rounded-full transition-all ${
                                isActive
                                  ? 'bg-coral-red/20 border-coral-red text-coral-red'
                                  : 'hover:bg-mint-green/20'
                              }`}
                              aria-label={label}
                            >
                              <Icon className="w-6 h-6" strokeWidth={1.5} />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
