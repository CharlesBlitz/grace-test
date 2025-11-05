import { supabase } from './supabaseClient';

export interface AnalyticsData {
  completionRate: number;
  totalTasks: number;
  completedToday: number;
  missedReminders: number;
  avgResponseTime: number;
  conversationsThisWeek: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  taskTrends: {
    date: string;
    completed: number;
    missed: number;
  }[];
  engagementScore: number;
}

export async function fetchElderAnalytics(elderId: string, days: number = 30): Promise<AnalyticsData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [tasksData, conversationsData, notificationsData] = await Promise.all([
    supabase
      .from('care_tasks')
      .select('id, status, last_completed_at, created_at, reminder_attempts, escalation_threshold')
      .eq('elder_id', elderId),
    supabase
      .from('conversations')
      .select('sentiment, created_at')
      .eq('elder_id', elderId)
      .gte('created_at', startDate.toISOString()),
    supabase
      .from('notification_log')
      .select('status, created_at, sent_at, delivered_at')
      .eq('elder_id', elderId)
      .gte('created_at', startDate.toISOString())
  ]);

  const tasks = tasksData.data || [];
  const conversations = conversationsData.data || [];
  const notifications = notificationsData.data || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = tasks.filter(task => {
    if (!task.last_completed_at) return false;
    const completedDate = new Date(task.last_completed_at);
    return completedDate >= today;
  }).length;

  const totalCompleted = tasks.filter(t => t.last_completed_at).length;
  const completionRate = tasks.length > 0 ? (totalCompleted / tasks.length) * 100 : 0;

  const missedReminders = tasks.reduce((sum, task) => {
    return sum + (task.reminder_attempts || 0);
  }, 0);

  const sentimentBreakdown = {
    positive: conversations.filter(c => c.sentiment === 'pos').length,
    neutral: conversations.filter(c => c.sentiment === 'neu').length,
    negative: conversations.filter(c => c.sentiment === 'neg').length,
  };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const conversationsThisWeek = conversations.filter(
    c => new Date(c.created_at) >= oneWeekAgo
  ).length;

  const deliveredNotifications = notifications.filter(
    n => n.status === 'delivered' && n.sent_at && n.delivered_at
  );

  const avgResponseTime = deliveredNotifications.length > 0
    ? deliveredNotifications.reduce((sum, n) => {
        const sent = new Date(n.sent_at!).getTime();
        const delivered = new Date(n.delivered_at!).getTime();
        return sum + (delivered - sent);
      }, 0) / deliveredNotifications.length / 1000 / 60
    : 0;

  const taskTrends = generateTaskTrends(tasks, days);

  const engagementScore = calculateEngagementScore(
    completionRate,
    conversationsThisWeek,
    missedReminders,
    tasks.length
  );

  return {
    completionRate: Math.round(completionRate),
    totalTasks: tasks.length,
    completedToday,
    missedReminders,
    avgResponseTime: Math.round(avgResponseTime),
    conversationsThisWeek,
    sentimentBreakdown,
    taskTrends,
    engagementScore,
  };
}

function generateTaskTrends(tasks: any[], days: number) {
  const trends: { date: string; completed: number; missed: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayTasks = tasks.filter(task => {
      if (!task.last_completed_at) return false;
      const completedDate = new Date(task.last_completed_at);
      return completedDate >= date && completedDate < nextDate;
    });

    trends.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: dayTasks.length,
      missed: 0,
    });
  }

  return trends.slice(-7);
}

function calculateEngagementScore(
  completionRate: number,
  conversationsThisWeek: number,
  missedReminders: number,
  totalTasks: number
): number {
  let score = 0;

  score += Math.min(completionRate * 0.4, 40);

  score += Math.min(conversationsThisWeek * 5, 30);

  const missRate = totalTasks > 0 ? (missedReminders / totalTasks) * 100 : 0;
  score += Math.max(30 - missRate, 0);

  return Math.min(Math.round(score), 100);
}

export async function fetchReminderStats(elderId: string) {
  const { data: tasks } = await supabase
    .from('care_tasks')
    .select('reminder_attempts, escalation_threshold, escalated_at, status')
    .eq('elder_id', elderId);

  const totalReminders = tasks?.length || 0;
  const escalated = tasks?.filter(t => t.escalated_at).length || 0;
  const highRisk = tasks?.filter(
    t => (t.reminder_attempts || 0) >= (t.escalation_threshold || 3) * 0.7
  ).length || 0;

  const successRate = totalReminders > 0
    ? ((totalReminders - escalated) / totalReminders) * 100
    : 100;

  return {
    totalReminders,
    escalated,
    highRisk,
    successRate: Math.round(successRate),
  };
}
