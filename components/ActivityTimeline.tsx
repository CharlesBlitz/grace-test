'use client';

import { Clock, CheckCircle, AlertCircle, MessageSquare, Bell, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ActivityEvent {
  id: string;
  type: 'task_completed' | 'reminder_sent' | 'conversation' | 'escalation' | 'missed_reminder';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
        <Clock className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
        <p className="text-lg text-deep-navy/70">No recent activity</p>
      </Card>
    );
  }

  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-mint-green" strokeWidth={1.5} />;
      case 'reminder_sent':
        return <Bell className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />;
      case 'conversation':
        return <MessageSquare className="w-5 h-5 text-warm-cream" strokeWidth={1.5} />;
      case 'escalation':
        return <Phone className="w-5 h-5 text-coral-red" strokeWidth={1.5} />;
      case 'missed_reminder':
        return <AlertCircle className="w-5 h-5 text-orange-500" strokeWidth={1.5} />;
      default:
        return <Clock className="w-5 h-5 text-deep-navy" strokeWidth={1.5} />;
    }
  };

  const getBackgroundColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'task_completed':
        return 'bg-mint-green/20';
      case 'reminder_sent':
        return 'bg-sky-blue/20';
      case 'conversation':
        return 'bg-warm-cream';
      case 'escalation':
        return 'bg-coral-red/20';
      case 'missed_reminder':
        return 'bg-orange-100';
      default:
        return 'bg-soft-gray/20';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6">
      <h3 className="text-xl font-bold text-deep-navy mb-6">Recent Activity</h3>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="relative">
            {index < events.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-soft-gray/30" />
            )}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full ${getBackgroundColor(event.type)} flex items-center justify-center flex-shrink-0`}>
                {getIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-deep-navy">{event.title}</h4>
                  <span className="text-sm text-deep-navy/60 flex-shrink-0">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                {event.description && (
                  <p className="text-sm text-deep-navy/70">{event.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export async function fetchRecentActivity(elderId: string, limit: number = 10) {
  const { supabase } = await import('@/lib/supabaseClient');

  const [tasks, notifications, conversations] = await Promise.all([
    supabase
      .from('care_tasks')
      .select('id, title, last_completed_at, status')
      .eq('elder_id', elderId)
      .not('last_completed_at', 'is', null)
      .order('last_completed_at', { ascending: false })
      .limit(5),
    supabase
      .from('notification_log')
      .select('id, notification_type, delivery_method, created_at, status')
      .eq('elder_id', elderId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('conversations')
      .select('id, created_at, sentiment')
      .eq('elder_id', elderId)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const events: ActivityEvent[] = [];

  tasks.data?.forEach(task => {
    if (task.last_completed_at) {
      events.push({
        id: `task-${task.id}`,
        type: 'task_completed',
        title: task.title,
        description: 'Task completed successfully',
        timestamp: task.last_completed_at,
      });
    }
  });

  notifications.data?.forEach(notif => {
    const isEscalation = notif.notification_type === 'escalation';
    events.push({
      id: `notif-${notif.id}`,
      type: isEscalation ? 'escalation' : 'reminder_sent',
      title: isEscalation ? 'Escalation Alert Sent' : 'Reminder Sent',
      description: `Via ${notif.delivery_method}`,
      timestamp: notif.created_at,
    });
  });

  conversations.data?.forEach(conv => {
    events.push({
      id: `conv-${conv.id}`,
      type: 'conversation',
      title: 'Had a conversation',
      description: `Sentiment: ${conv.sentiment === 'pos' ? 'Positive' : conv.sentiment === 'neg' ? 'Negative' : 'Neutral'}`,
      timestamp: conv.created_at,
    });
  });

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events.slice(0, limit);
}
