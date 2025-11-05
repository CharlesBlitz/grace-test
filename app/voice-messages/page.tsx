'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Mic, Play, Pause, Send, User, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface VoiceMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcription: string | null;
  is_listened: boolean;
  listened_at: string | null;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
}

export default function VoiceMessagesPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadContacts();
      loadMessages();
    }
  }, [profile]);

  const loadContacts = async () => {
    try {
      if (profile?.role === 'elder') {
        const { data: relationships } = await supabase
          .from('elder_nok_relationships')
          .select('nok_id')
          .eq('elder_id', profile.id);

        if (relationships && relationships.length > 0) {
          const nokIds = relationships.map((r) => r.nok_id);
          const { data: noks } = await supabase
            .from('users')
            .select('id, name, role')
            .in('id', nokIds);

          setContacts(noks || []);
        }
      } else if (profile?.role === 'nok') {
        const { data: relationships } = await supabase
          .from('elder_nok_relationships')
          .select('elder_id')
          .eq('nok_id', profile.id);

        if (relationships && relationships.length > 0) {
          const elderIds = relationships.map((r) => r.elder_id);
          const { data: elders } = await supabase
            .from('users')
            .select('id, name, role')
            .in('id', elderIds);

          setContacts(elders || []);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: sent } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('sender_id', profile?.id)
        .order('created_at', { ascending: false });

      const { data: received } = await supabase
        .from('voice_messages')
        .select('*')
        .eq('recipient_id', profile?.id)
        .order('created_at', { ascending: false });

      const allMessages = [...(sent || []), ...(received || [])];
      allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const userIds = Array.from(new Set(allMessages.flatMap(m => [m.sender_id, m.recipient_id])));
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u.name]) || []);

      const messagesWithNames = allMessages.map(msg => ({
        ...msg,
        sender_name: userMap.get(msg.sender_id),
        recipient_name: userMap.get(msg.recipient_id),
      }));

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('Recording started. Speak your message now');

      setTimeout(() => {
        stopRecording();
        clearInterval(interval);
      }, 60000);
    } catch (error) {
      toast.error('Microphone access denied. Please enable microphone permissions');
    }
  };

  const stopRecording = () => {
    setRecording(false);
    setRecordingTime(0);
  };

  const sendMessage = async () => {
    if (!selectedContact) return;

    try {
      const { error } = await supabase.from('voice_messages').insert({
        sender_id: profile?.id,
        recipient_id: selectedContact.id,
        audio_url: 'placeholder_url',
        duration_seconds: recordingTime,
        transcription: null,
        is_listened: false,
      });

      if (error) throw error;

      toast.success(`Message sent! Your voice message was sent to ${selectedContact.name}`);

      setShowNewMessage(false);
      setSelectedContact(null);
      loadMessages();
    } catch (error: any) {
      toast.error(error.message || 'Error sending message');
    }
  };

  const markAsListened = async (messageId: string) => {
    try {
      await supabase
        .from('voice_messages')
        .update({
          is_listened: true,
          listened_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('recipient_id', profile?.id);

      loadMessages();
    } catch (error) {
      console.error('Error marking as listened:', error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading messages...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          <Button
            onClick={() => setShowNewMessage(true)}
            size="lg"
            className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[16px]"
          >
            <Mic className="w-5 h-5 mr-2" strokeWidth={1.5} />
            New Voice Message
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4">
              <Mic className="w-10 h-10 text-sky-blue" strokeWidth={1.5} />
              <div>
                <h1 className="text-4xl font-bold text-deep-navy">Voice Messages</h1>
                <p className="text-xl text-deep-navy/70">Stay connected with your family</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {messages.length === 0 ? (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <Mic className="w-16 h-16 text-deep-navy/40 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-deep-navy mb-2">No Messages Yet</h3>
              <p className="text-lg text-deep-navy/70 mb-6">Send your first voice message to stay connected</p>
              <Button
                onClick={() => setShowNewMessage(true)}
                className="bg-mint-green hover:bg-mint-green/90 text-deep-navy"
              >
                <Mic className="w-5 h-5 mr-2" strokeWidth={1.5} />
                Record Message
              </Button>
            </Card>
          ) : (
            messages.map((message) => {
              const isReceived = message.recipient_id === profile?.id;
              const displayName = isReceived ? message.sender_name : message.recipient_name;

              return (
                <Card key={message.id} className="bg-white rounded-[16px] shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isReceived ? 'bg-sky-blue/20' : 'bg-mint-green/20'}`}>
                          <User className={`w-6 h-6 ${isReceived ? 'text-sky-blue' : 'text-mint-green'}`} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-semibold text-deep-navy">{isReceived ? 'From' : 'To'} {displayName}</p>
                          <p className="text-sm text-deep-navy/60">{formatDate(message.created_at)}</p>
                        </div>
                      </div>
                      {isReceived && !message.is_listened && (
                        <Badge className="bg-coral-red/20 text-coral-red border-coral-red">New</Badge>
                      )}
                      {message.is_listened && (
                        <CheckCircle2 className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="flex items-center gap-4 bg-soft-gray/20 rounded-[12px] p-4">
                      <Button
                        onClick={() => {
                          if (isReceived && !message.is_listened) {
                            markAsListened(message.id);
                          }
                          setPlayingMessageId(playingMessageId === message.id ? null : message.id);
                        }}
                        size="lg"
                        className={`w-14 h-14 rounded-full ${isReceived ? 'bg-sky-blue hover:bg-sky-blue/90' : 'bg-mint-green hover:bg-mint-green/90'} text-white`}
                      >
                        {playingMessageId === message.id ? (
                          <Pause className="w-6 h-6" strokeWidth={1.5} />
                        ) : (
                          <Play className="w-6 h-6" strokeWidth={1.5} />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="w-full h-2 bg-soft-gray/30 rounded-full mb-2">
                          <div className="h-full bg-sky-blue rounded-full" style={{ width: '0%' }}></div>
                        </div>
                        <p className="text-sm text-deep-navy/70">{formatDuration(message.duration_seconds)}</p>
                      </div>
                    </div>

                    {message.transcription && (
                      <div className="mt-3 p-3 bg-soft-gray/10 rounded-[8px]">
                        <p className="text-sm text-deep-navy/80">{message.transcription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Send Voice Message</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {!selectedContact ? (
                <>
                  <p className="text-deep-navy/70">Who would you like to send a message to?</p>
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <Button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        variant="outline"
                        className="w-full h-16 justify-start text-lg rounded-[12px]"
                      >
                        <User className="w-6 h-6 mr-3" strokeWidth={1.5} />
                        {contact.name}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-deep-navy/70 mb-2">Sending to</p>
                    <p className="text-2xl font-bold text-deep-navy">{selectedContact.name}</p>
                  </div>

                  {!recording ? (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="w-full h-24 text-xl rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white"
                    >
                      <Mic className="w-8 h-8 mr-3" strokeWidth={1.5} />
                      Start Recording
                    </Button>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-full bg-coral-red/20 flex items-center justify-center animate-pulse">
                        <Mic className="w-12 h-12 text-coral-red" strokeWidth={1.5} />
                      </div>
                      <p className="text-3xl font-bold text-deep-navy">{formatDuration(recordingTime)}</p>
                      <div className="flex gap-3">
                        <Button onClick={stopRecording} variant="outline" size="lg" className="flex-1 rounded-[12px]">
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            stopRecording();
                            sendMessage();
                          }}
                          size="lg"
                          className="flex-1 bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[12px]"
                        >
                          <Send className="w-5 h-5 mr-2" strokeWidth={1.5} />
                          Send
                        </Button>
                      </div>
                    </div>
                  )}

                  {!recording && (
                    <Button
                      onClick={() => {
                        setSelectedContact(null);
                        setRecordingTime(0);
                      }}
                      variant="outline"
                      className="w-full rounded-[12px]"
                    >
                      Choose Different Person
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
