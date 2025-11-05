'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, User, Activity, MessageSquare, Clock, Calendar, FileText, Bell, AlertTriangle, TrendingUp, Target, Zap, Settings, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { fetchElderAnalytics, fetchReminderStats, type AnalyticsData } from '@/lib/analytics';
import { TaskCompletionChart, SentimentPieChart, EngagementScoreCard, QuickStatsCard } from '@/components/AnalyticsCharts';
import { ActivityTimeline, fetchRecentActivity } from '@/components/ActivityTimeline';
import NotificationCenter from '@/components/NotificationCenter';

interface Elder {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  type: string;
  last_completed_at: string | null;
  status: string;
  created_at: string;
}

interface Conversation {
  id: string;
  transcript: string;
  sentiment: string;
  created_at: string;
}

export default function NOKDashboardPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [reminderStats, setReminderStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      fetchElderData();
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
          .select('id, name, email, created_at')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchElderData = async () => {
    if (!selectedElder) return;

    try {
      const [tasksData, conversationsData, analyticsData, reminderData, activityData] = await Promise.all([
        supabase
          .from('care_tasks')
          .select('*')
          .eq('elder_id', selectedElder.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('conversations')
          .select('*')
          .eq('elder_id', selectedElder.id)
          .order('created_at', { ascending: false })
          .limit(20),
        fetchElderAnalytics(selectedElder.id, 30),
        fetchReminderStats(selectedElder.id),
        fetchRecentActivity(selectedElder.id, 10),
      ]);

      setTasks(tasksData.data || []);
      setConversations(conversationsData.data || []);
      setAnalytics(analyticsData);
      setReminderStats(reminderData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error fetching elder data:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getCompletedTasksToday = () => {
    const today = new Date();
    return tasks.filter((task) => {
      if (!task.last_completed_at) return false;
      const completed = new Date(task.last_completed_at);
      return (
        completed.getDate() === today.getDate() &&
        completed.getMonth() === today.getMonth() &&
        completed.getFullYear() === today.getFullYear()
      );
    }).length;
  };

  const getTotalTasks = () => tasks.length;

  const getRecentConversations = () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return conversations.filter(
      (conv) => new Date(conv.created_at) >= threeDaysAgo
    ).length;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
      </main>
    );
  }

  if (elders.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-deep-navy mb-2">No Elder Accounts Linked</h1>
            <p className="text-body text-deep-navy/70 mb-6">
              You haven't been linked to any elder accounts yet.
            </p>
            <Link href="/register/nok">
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy">
                Register an Elder
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>

          <div className="flex gap-3">
            <NotificationCenter />
            <Link href="/nok-dashboard/settings">
              <Button variant="outline" className="rounded-[16px]">
                <Settings className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Settings
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="rounded-[16px]"
            >
              Sign Out
            </Button>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center mb-2">
            Family Dashboard
          </h1>
          <p className="text-body text-deep-navy/70 text-center">
            Welcome back, {profile?.name}
          </p>
        </Card>

        {elders.length > 1 && (
          <Card className="bg-white rounded-[20px] shadow-md p-6 mb-6">
            <Label className="text-deep-navy font-semibold mb-3 block">Select Elder</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {elders.map((elder) => (
                <Button
                  key={elder.id}
                  onClick={() => setSelectedElder(elder)}
                  variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                  className="justify-start h-auto py-4 px-6 rounded-[16px]"
                >
                  <User className="w-5 h-5 mr-3" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="font-semibold">{elder.name}</p>
                    <p className="text-sm opacity-70">{elder.email}</p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {selectedElder && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Link href="/nok-dashboard/reminders">
                <Button className="w-full h-20 text-lg font-semibold rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md">
                  <Bell className="w-6 h-6 mr-3" strokeWidth={1.5} />
                  Manage Reminders
                </Button>
              </Link>
              <Link href="/nok-dashboard/medication-reports">
                <Button className="w-full h-20 text-lg font-semibold rounded-[20px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md">
                  <Pill className="w-6 h-6 mr-3" strokeWidth={1.5} />
                  Medication Reports
                </Button>
              </Link>
              <Link href="/nok-dashboard/escalation">
                <Button className="w-full h-20 text-lg font-semibold rounded-[20px] bg-coral-red/20 hover:bg-coral-red/30 text-deep-navy border-2 border-coral-red shadow-md">
                  <AlertTriangle className="w-6 h-6 mr-3" strokeWidth={1.5} />
                  Emergency Contacts
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <QuickStatsCard
                title="Tasks Today"
                value={`${analytics?.completedToday || 0}/${analytics?.totalTasks || 0}`}
                subtitle="Completed today"
                icon={Activity}
                colorClass="bg-mint-green/20 text-mint-green"
                trend={analytics && analytics.completedToday > 0 ? 'up' : 'stable'}
              />
              <QuickStatsCard
                title="Completion Rate"
                value={`${analytics?.completionRate || 0}%`}
                subtitle="Overall success rate"
                icon={Target}
                colorClass="bg-sky-blue/20 text-sky-blue"
                trend={analytics && analytics.completionRate >= 80 ? 'up' : analytics && analytics.completionRate >= 60 ? 'stable' : 'down'}
              />
              <QuickStatsCard
                title="Conversations"
                value={analytics?.conversationsThisWeek || 0}
                subtitle="This week"
                icon={MessageSquare}
                colorClass="bg-warm-cream text-deep-navy"
                trend={analytics && analytics.conversationsThisWeek >= 3 ? 'up' : 'stable'}
              />
              <QuickStatsCard
                title="Engagement"
                value={`${analytics?.engagementScore || 0}%`}
                subtitle="Activity score"
                icon={Zap}
                colorClass="bg-mint-green/20 text-mint-green"
                trend={analytics && analytics.engagementScore >= 70 ? 'up' : analytics && analytics.engagementScore >= 50 ? 'stable' : 'down'}
              />
            </div>

            {reminderStats && reminderStats.highRisk > 0 && (
              <Card className="bg-coral-red/10 border-2 border-coral-red rounded-[20px] shadow-md p-6 mb-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-coral-red flex-shrink-0 mt-1" strokeWidth={1.5} />
                  <div>
                    <h3 className="text-lg font-semibold text-deep-navy mb-1">Attention Needed</h3>
                    <p className="text-deep-navy/80">
                      {reminderStats.highRisk} reminder{reminderStats.highRisk > 1 ? 's are' : ' is'} at risk of escalation.
                      {selectedElder.name} may need additional support.
                    </p>
                    <Link href="/nok-dashboard/reminders">
                      <Button className="mt-3 bg-coral-red hover:bg-coral-red/90 text-white">
                        Review Reminders
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-white/50 rounded-[20px] p-1">
                <TabsTrigger
                  value="overview"
                  className="rounded-[16px] data-[state=active]:bg-sky-blue data-[state=active]:text-deep-navy text-lg py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="rounded-[16px] data-[state=active]:bg-mint-green data-[state=active]:text-deep-navy text-lg py-3"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="rounded-[16px] data-[state=active]:bg-warm-cream data-[state=active]:text-deep-navy text-lg py-3"
                >
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="conversations"
                  className="rounded-[16px] data-[state=active]:bg-sky-blue/50 data-[state=active]:text-deep-navy text-lg py-3"
                >
                  Conversations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2">
                    <ActivityTimeline events={recentActivity} />
                  </div>
                  <Card className="bg-white rounded-[20px] shadow-md p-6">
                    <h3 className="text-lg font-semibold text-deep-navy mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <Link href="/nok-dashboard/reminders" className="block">
                        <button className="w-full p-4 text-left bg-mint-green/10 hover:bg-mint-green/20 rounded-[12px] transition-colors">
                          <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                            <div>
                              <p className="font-semibold text-deep-navy">Manage Reminders</p>
                              <p className="text-sm text-deep-navy/60">Create or edit reminders</p>
                            </div>
                          </div>
                        </button>
                      </Link>
                      <Link href="/nok-dashboard/messages" className="block">
                        <button className="w-full p-4 text-left bg-sky-blue/10 hover:bg-sky-blue/20 rounded-[12px] transition-colors">
                          <div className="flex items-center gap-3">
                            <MessageSquare className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                            <div>
                              <p className="font-semibold text-deep-navy">Send Message</p>
                              <p className="text-sm text-deep-navy/60">Write to your elder</p>
                            </div>
                          </div>
                        </button>
                      </Link>
                      <Link href="/nok-dashboard/medication-reports" className="block">
                        <button className="w-full p-4 text-left bg-sky-blue/10 hover:bg-sky-blue/20 rounded-[12px] transition-colors">
                          <div className="flex items-center gap-3">
                            <Pill className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                            <div>
                              <p className="font-semibold text-deep-navy">Medication Reports</p>
                              <p className="text-sm text-deep-navy/60">View adherence data</p>
                            </div>
                          </div>
                        </button>
                      </Link>
                      <Link href="/nok-dashboard/escalation" className="block">
                        <button className="w-full p-4 text-left bg-coral-red/10 hover:bg-coral-red/20 rounded-[12px] transition-colors">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-coral-red" strokeWidth={1.5} />
                            <div>
                              <p className="font-semibold text-deep-navy">Emergency Contacts</p>
                              <p className="text-sm text-deep-navy/60">Update contact list</p>
                            </div>
                          </div>
                        </button>
                      </Link>
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-white rounded-[20px] shadow-md p-6">
                    <h3 className="text-xl font-bold text-deep-navy mb-4">Recent Tasks</h3>
                    <div className="space-y-3">
                      {tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between bg-soft-gray/20 rounded-[12px] p-3">
                          <p className="font-medium text-deep-navy">{task.title}</p>
                          <span className="text-sm text-deep-navy/60">
                            {task.last_completed_at ? formatDate(task.last_completed_at) : 'Pending'}
                          </span>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <p className="text-deep-navy/60 text-center py-4">No tasks yet</p>
                      )}
                    </div>
                  </Card>

                  <Card className="bg-white rounded-[20px] shadow-md p-6">
                    <h3 className="text-xl font-bold text-deep-navy mb-4">Recent Conversations</h3>
                    <div className="space-y-3">
                      {conversations.slice(0, 5).map((conv) => (
                        <div key={conv.id} className="bg-soft-gray/20 rounded-[12px] p-3">
                          <p className="text-sm text-deep-navy/80 line-clamp-2 mb-2">
                            {conv.transcript.split('\n')[0].replace('User:', '').trim()}
                          </p>
                          <span className="text-xs text-deep-navy/60">{formatDate(conv.created_at)}</span>
                        </div>
                      ))}
                      {conversations.length === 0 && (
                        <p className="text-deep-navy/60 text-center py-4">No conversations yet</p>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                {analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <TaskCompletionChart data={analytics.taskTrends} />
                      </div>
                      <EngagementScoreCard score={analytics.engagementScore} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <SentimentPieChart data={analytics.sentimentBreakdown} />

                      <Card className="bg-white rounded-[20px] shadow-md p-6">
                        <h3 className="text-lg font-semibold text-deep-navy mb-4">Reminder Performance</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-mint-green/10 rounded-[12px]">
                            <span className="text-deep-navy font-medium">Success Rate</span>
                            <span className="text-2xl font-bold text-mint-green">
                              {reminderStats?.successRate || 0}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-sky-blue/10 rounded-[12px]">
                            <span className="text-deep-navy font-medium">Total Reminders</span>
                            <span className="text-2xl font-bold text-sky-blue">
                              {reminderStats?.totalReminders || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-coral-red/10 rounded-[12px]">
                            <span className="text-deep-navy font-medium">Escalated</span>
                            <span className="text-2xl font-bold text-coral-red">
                              {reminderStats?.escalated || 0}
                            </span>
                          </div>
                          {reminderStats && reminderStats.highRisk > 0 && (
                            <div className="flex justify-between items-center p-4 bg-orange-100 rounded-[12px]">
                              <span className="text-deep-navy font-medium">At Risk</span>
                              <span className="text-2xl font-bold text-orange-600">
                                {reminderStats.highRisk}
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>

                    <Card className="bg-white rounded-[20px] shadow-md p-6">
                      <h3 className="text-lg font-semibold text-deep-navy mb-4">Key Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-soft-gray/20 rounded-[12px]">
                          <p className="text-sm text-deep-navy/60 mb-1">Average Response Time</p>
                          <p className="text-2xl font-bold text-deep-navy">
                            {analytics.avgResponseTime} <span className="text-base font-normal">min</span>
                          </p>
                        </div>
                        <div className="p-4 bg-soft-gray/20 rounded-[12px]">
                          <p className="text-sm text-deep-navy/60 mb-1">Missed Reminders</p>
                          <p className="text-2xl font-bold text-deep-navy">{analytics.missedReminders}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                    <p className="text-lg text-deep-navy/70">Loading analytics...</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tasks">
                <Card className="bg-white rounded-[20px] shadow-md p-6">
                  <h3 className="text-xl font-bold text-deep-navy mb-6">All Tasks</h3>
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between bg-soft-gray/20 rounded-[16px] p-4 hover:bg-soft-gray/30 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-deep-navy mb-1">{task.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-deep-navy/60">
                            <span className="capitalize">{task.type}</span>
                            {task.last_completed_at && (
                              <>
                                <span>•</span>
                                <span>Last completed: {formatDate(task.last_completed_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-mint-green/20 rounded-full">
                          <span className="text-sm font-medium text-mint-green capitalize">
                            {task.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {tasks.length === 0 && (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                        <p className="text-lg text-deep-navy/70">No tasks scheduled</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="conversations">
                <Card className="bg-white rounded-[20px] shadow-md p-6">
                  <h3 className="text-xl font-bold text-deep-navy mb-6">Conversation History</h3>
                  <div className="space-y-4">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="bg-soft-gray/20 rounded-[16px] p-4 hover:bg-soft-gray/30 transition-colors"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              conv.sentiment === 'pos'
                                ? 'bg-mint-green/20'
                                : conv.sentiment === 'neg'
                                ? 'bg-coral-red/20'
                                : 'bg-sky-blue/20'
                            }`}
                          >
                            <MessageSquare
                              className={`w-5 h-5 ${
                                conv.sentiment === 'pos'
                                  ? 'text-mint-green'
                                  : conv.sentiment === 'neg'
                                  ? 'text-coral-red'
                                  : 'text-sky-blue'
                              }`}
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-deep-navy/80 whitespace-pre-wrap">{conv.transcript}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-deep-navy/60 pl-13">
                          <Clock className="w-4 h-4" strokeWidth={1.5} />
                          <span>{formatDate(conv.created_at)}</span>
                        </div>
                      </div>
                    ))}
                    {conversations.length === 0 && (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                        <p className="text-lg text-deep-navy/70">No conversations yet</p>
                      </div>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
