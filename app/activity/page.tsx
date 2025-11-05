'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Clock, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface Task {
  id: string;
  title: string;
  type: string;
  last_completed_at: string;
  status: string;
}

interface Conversation {
  id: string;
  transcript: string;
  sentiment: string;
  created_at: string;
}

export default function ActivityPage() {
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      const { data: tasksData } = await supabase
        .from('care_tasks')
        .select('*')
        .not('last_completed_at', 'is', null)
        .order('last_completed_at', { ascending: false })
        .limit(20);

      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setCompletedTasks(tasksData || []);
      setConversations(conversationsData || []);
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
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
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'pos':
        return 'text-mint-green';
      case 'neg':
        return 'text-coral-red';
      default:
        return 'text-sky-blue';
    }
  };

  const extractConversationSummary = (transcript: string) => {
    const lines = transcript.split('\n');
    const userLine = lines.find(line => line.startsWith('User:'));
    return userLine ? userLine.replace('User:', '').trim() : 'Conversation';
  };

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
            My Activity
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            Your recent tasks and conversations
          </p>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 rounded-[20px] p-1">
            <TabsTrigger
              value="tasks"
              className="rounded-[16px] data-[state=active]:bg-mint-green data-[state=active]:text-deep-navy text-lg py-3"
            >
              <Check className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Completed Tasks
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="rounded-[16px] data-[state=active]:bg-sky-blue data-[state=active]:text-deep-navy text-lg py-3"
            >
              <MessageSquare className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Conversations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            {loading ? (
              <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
            ) : completedTasks.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                <p className="text-xl text-deep-navy/70">No completed tasks yet</p>
                <p className="text-body text-deep-navy/60 mt-2">
                  Your completed tasks will appear here
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-full bg-mint-green/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-mint-green" strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-deep-navy mb-1">
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 text-deep-navy/60">
                            <Clock className="w-4 h-4" strokeWidth={1.5} />
                            <span className="text-sm">
                              {formatDate(task.last_completed_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-mint-green/20 rounded-full">
                        <span className="text-sm font-medium text-mint-green">
                          {task.status === 'on_time' ? 'On Time' : 'Complete'}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations">
            {loading ? (
              <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
            ) : conversations.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-md p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                <p className="text-xl text-deep-navy/70">No conversations yet</p>
                <p className="text-body text-deep-navy/60 mt-2">
                  Start chatting to see your conversation history
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full ${
                          conversation.sentiment === 'pos'
                            ? 'bg-mint-green/20'
                            : conversation.sentiment === 'neg'
                            ? 'bg-coral-red/20'
                            : 'bg-sky-blue/20'
                        } flex items-center justify-center flex-shrink-0`}
                      >
                        <MessageSquare
                          className={`w-5 h-5 ${getSentimentColor(conversation.sentiment)}`}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-deep-navy mb-2">
                          {extractConversationSummary(conversation.transcript)}
                        </h3>
                        <p className="text-body text-deep-navy/70 mb-3 line-clamp-2">
                          {conversation.transcript.replace(/User:|Assistant:/g, '').trim()}
                        </p>
                        <div className="flex items-center gap-2 text-deep-navy/60">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          <span className="text-sm">
                            {formatDate(conversation.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
