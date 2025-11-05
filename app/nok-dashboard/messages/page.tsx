'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Calendar, Heart, Smile, MessageSquare, Plus, Mic, Image as ImageIcon, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';

interface Elder {
  id: string;
  name: string;
  email: string;
}

interface Message {
  id: string;
  subject: string;
  message_text: string;
  category: string;
  scheduled_for: string | null;
  delivered_at: string | null;
  read_at: string | null;
  is_draft: boolean;
  created_at: string;
  recipient: Elder;
}

export default function NOKMessagesPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('compose');

  const [messageForm, setMessageForm] = useState({
    subject: '',
    message_text: '',
    category: 'note',
    scheduled_for: '',
    notify_via_sms: false,
    notify_via_push: true,
    notify_via_email: false,
    use_cloned_voice_for_tts: false,
    priority: 'normal',
  });

  useEffect(() => {
    if (profile?.id) {
      fetchElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      fetchMessages();
    }
  }, [selectedElder]);

  const fetchElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
      toast.error('Failed to load elders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedElder) return;

    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select(`
          *,
          recipient:recipient_id (
            id,
            name,
            email
          )
        `)
        .eq('sender_id', profile?.id)
        .eq('recipient_id', selectedElder)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (isDraft = false) => {
    if (!selectedElder) {
      toast.error('Please select a recipient');
      return;
    }

    if (!messageForm.message_text.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      const messageData = {
        sender_id: profile?.id,
        recipient_id: selectedElder,
        subject: messageForm.subject || null,
        message_text: messageForm.message_text,
        category: messageForm.category,
        scheduled_for: messageForm.scheduled_for || null,
        notify_via_sms: messageForm.notify_via_sms,
        notify_via_push: messageForm.notify_via_push,
        notify_via_email: messageForm.notify_via_email,
        use_cloned_voice_for_tts: messageForm.use_cloned_voice_for_tts,
        priority: messageForm.priority,
        is_draft: isDraft,
        delivered_at: isDraft || messageForm.scheduled_for ? null : new Date().toISOString(),
      };

      const { error } = await supabase
        .from('family_messages')
        .insert([messageData]);

      if (error) throw error;

      toast.success(isDraft ? 'Draft saved!' : 'Message sent!');

      setMessageForm({
        subject: '',
        message_text: '',
        category: 'note',
        scheduled_for: '',
        notify_via_sms: false,
        notify_via_push: true,
        notify_via_email: false,
        use_cloned_voice_for_tts: false,
        priority: 'normal',
      });

      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not delivered';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'encouragement':
        return <Heart className="w-4 h-4" strokeWidth={1.5} />;
      case 'special_occasion':
        return <Smile className="w-4 h-4" strokeWidth={1.5} />;
      default:
        return <MessageSquare className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'encouragement':
        return 'bg-coral-red/20 text-coral-red';
      case 'special_occasion':
        return 'bg-sky-blue/20 text-sky-blue';
      case 'update':
        return 'bg-mint-green/20 text-mint-green';
      default:
        return 'bg-warm-cream text-deep-navy';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
        <div className="text-2xl text-deep-navy">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/nok-dashboard">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-deep-navy">Family Messages</h1>
          <div className="w-16"></div>
        </div>

        {elders.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] p-12 text-center">
            <p className="text-xl text-deep-navy/70">No elders linked to your account</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6">
              <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                Send message to:
              </Label>
              <Select value={selectedElder} onValueChange={setSelectedElder}>
                <SelectTrigger className="w-full h-14 text-lg rounded-[16px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {elders.map((elder) => (
                    <SelectItem key={elder.id} value={elder.id}>
                      {elder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-white/50 rounded-[20px] p-1">
                <TabsTrigger
                  value="compose"
                  className="rounded-[16px] data-[state=active]:bg-mint-green text-lg py-3"
                >
                  <Plus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Compose
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-[16px] data-[state=active]:bg-sky-blue text-lg py-3"
                >
                  <MessageSquare className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="mt-6">
                <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] p-8">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                        Message Category
                      </Label>
                      <Select
                        value={messageForm.category}
                        onValueChange={(value) =>
                          setMessageForm({ ...messageForm, category: value })
                        }
                      >
                        <SelectTrigger className="w-full h-14 text-lg rounded-[16px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="encouragement">Encouragement</SelectItem>
                          <SelectItem value="update">Family Update</SelectItem>
                          <SelectItem value="special_occasion">Special Occasion</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="question">Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                        Subject (Optional)
                      </Label>
                      <Input
                        type="text"
                        placeholder="Message subject..."
                        value={messageForm.subject}
                        onChange={(e) =>
                          setMessageForm({ ...messageForm, subject: e.target.value })
                        }
                        className="h-14 text-lg rounded-[16px]"
                      />
                    </div>

                    <div>
                      <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                        Your Message
                      </Label>
                      <Textarea
                        placeholder="Write your message here..."
                        value={messageForm.message_text}
                        onChange={(e) =>
                          setMessageForm({ ...messageForm, message_text: e.target.value })
                        }
                        className="min-h-[200px] text-lg rounded-[16px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                          Schedule for Later (Optional)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={messageForm.scheduled_for}
                          onChange={(e) =>
                            setMessageForm({ ...messageForm, scheduled_for: e.target.value })
                          }
                          className="h-14 text-lg rounded-[16px]"
                        />
                      </div>

                      <div>
                        <Label className="text-lg font-semibold text-deep-navy mb-2 block">
                          Priority
                        </Label>
                        <Select
                          value={messageForm.priority}
                          onValueChange={(value) =>
                            setMessageForm({ ...messageForm, priority: value })
                          }
                        >
                          <SelectTrigger className="w-full h-14 text-lg rounded-[16px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-soft-gray/10 rounded-[16px]">
                      <Label className="text-lg font-semibold text-deep-navy block">
                        Notification Options
                      </Label>

                      <div className="flex items-center justify-between">
                        <Label className="text-base text-deep-navy">App Notification</Label>
                        <Switch
                          checked={messageForm.notify_via_push}
                          onCheckedChange={(checked) =>
                            setMessageForm({ ...messageForm, notify_via_push: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-base text-deep-navy">SMS Notification</Label>
                        <Switch
                          checked={messageForm.notify_via_sms}
                          onCheckedChange={(checked) =>
                            setMessageForm({ ...messageForm, notify_via_sms: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-base text-deep-navy">Email Notification</Label>
                        <Switch
                          checked={messageForm.notify_via_email}
                          onCheckedChange={(checked) =>
                            setMessageForm({ ...messageForm, notify_via_email: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-base text-deep-navy">
                          Read aloud in your voice
                        </Label>
                        <Switch
                          checked={messageForm.use_cloned_voice_for_tts}
                          onCheckedChange={(checked) =>
                            setMessageForm({ ...messageForm, use_cloned_voice_for_tts: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleSendMessage(false)}
                        size="lg"
                        className="flex-1 h-14 text-xl font-semibold rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
                      >
                        <Send className="w-5 h-5 mr-2" strokeWidth={1.5} />
                        {messageForm.scheduled_for ? 'Schedule Message' : 'Send Now'}
                      </Button>

                      <Button
                        onClick={() => handleSendMessage(true)}
                        size="lg"
                        variant="outline"
                        className="h-14 px-8 text-lg rounded-[20px]"
                      >
                        <Save className="w-5 h-5 mr-2" strokeWidth={1.5} />
                        Save Draft
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] p-12 text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                      <p className="text-xl text-deep-navy/70">No messages yet</p>
                      <p className="text-body text-deep-navy/60 mt-2">
                        Compose your first message to get started
                      </p>
                    </Card>
                  ) : (
                    messages.map((message) => (
                      <Card
                        key={message.id}
                        className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className={`px-3 py-1 rounded-full flex items-center gap-2 ${getCategoryColor(
                                  message.category
                                )}`}
                              >
                                {getCategoryIcon(message.category)}
                                <span className="text-sm font-medium capitalize">
                                  {message.category.replace('_', ' ')}
                                </span>
                              </div>
                              {message.is_draft && (
                                <span className="px-3 py-1 bg-soft-gray rounded-full text-sm">
                                  Draft
                                </span>
                              )}
                            </div>

                            {message.subject && (
                              <h3 className="text-lg font-semibold text-deep-navy mb-2">
                                {message.subject}
                              </h3>
                            )}

                            <p className="text-body text-deep-navy/70 mb-3 line-clamp-2">
                              {message.message_text}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-deep-navy/60">
                              <span>Sent: {formatDate(message.created_at)}</span>
                              {message.scheduled_for && !message.delivered_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" strokeWidth={1.5} />
                                  Scheduled: {formatDate(message.scheduled_for)}
                                </span>
                              )}
                              {message.delivered_at && (
                                <span className="text-mint-green">
                                  Delivered: {formatDate(message.delivered_at)}
                                </span>
                              )}
                              {message.read_at && (
                                <span className="text-sky-blue font-medium">Read ✓</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </main>
  );
}
