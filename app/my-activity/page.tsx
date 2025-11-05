'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, Pill, Heart, CheckCircle2, Star, Trophy } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  activity_type: string;
  activity_title: string;
  activity_description: string;
  completed_at: string;
  icon: string | null;
  color: string | null;
  achievement_unlocked: string | null;
  streak_count: number;
}

export default function MyActivityPage() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      loadActivities();
      calculateStreak();
    }
  }, [profile]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('elder_id', profile?.id)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('completed_at')
        .eq('elder_id', profile?.id)
        .order('completed_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setStreakCount(0);
        return;
      }

      let streak = 1;
      const dates = data.map(a => new Date(a.completed_at).toDateString());
      const uniqueDates = Array.from(new Set(dates));

      for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = new Date(uniqueDates[i]);
        const next = new Date(uniqueDates[i + 1]);
        const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      setStreakCount(streak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    switch (iconName) {
      case 'pill':
        return Pill;
      case 'heart':
        return Heart;
      case 'star':
        return Star;
      default:
        return CheckCircle2;
    }
  };

  const getColorClass = (color: string | null) => {
    switch (color) {
      case 'mint-green':
        return 'bg-mint-green/20 text-mint-green';
      case 'sky-blue':
        return 'bg-sky-blue/20 text-sky-blue';
      case 'coral-red':
        return 'bg-coral-red/20 text-coral-red';
      default:
        return 'bg-soft-gray/20 text-deep-navy';
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
      return date.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const groups: { [key: string]: ActivityItem[] } = {};

    activities.forEach(activity => {
      const date = new Date(activity.completed_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading activities...</div>
      </main>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <Activity className="w-10 h-10 text-sky-blue" strokeWidth={1.5} />
              <div>
                <h1 className="text-4xl font-bold text-deep-navy">My Activity</h1>
                <p className="text-xl text-deep-navy/70">Look how well you're doing!</p>
              </div>
            </div>

            {streakCount > 0 && (
              <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-mint-green/20 to-sky-blue/20 rounded-[20px] border-2 border-mint-green">
                <Trophy className="w-12 h-12 text-mint-green" strokeWidth={1.5} />
                <div>
                  <p className="text-3xl font-bold text-deep-navy">{streakCount} Day Streak!</p>
                  <p className="text-lg text-deep-navy/70">Keep up the great work!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {Object.keys(groupedActivities).length === 0 && (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <Activity className="w-16 h-16 text-deep-navy/40 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-deep-navy mb-2">No Activities Yet</h3>
              <p className="text-lg text-deep-navy/70">
                Your completed activities will appear here
              </p>
            </Card>
          )}

          {Object.keys(groupedActivities).map((dateString) => (
            <div key={dateString}>
              <h2 className="text-2xl font-bold text-deep-navy mb-4">{getDateLabel(dateString)}</h2>
              <div className="space-y-3">
                {groupedActivities[dateString].map((activity) => {
                  const Icon = getIconComponent(activity.icon);
                  return (
                    <Card key={activity.id} className="bg-white rounded-[16px] shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${getColorClass(activity.color)}`}>
                            <Icon className="w-7 h-7" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-xl font-bold text-deep-navy">{activity.activity_title}</h3>
                                {activity.activity_description && (
                                  <p className="text-lg text-deep-navy/70 mt-1">{activity.activity_description}</p>
                                )}
                              </div>
                              <CheckCircle2 className="w-6 h-6 text-mint-green flex-shrink-0" strokeWidth={1.5} />
                            </div>
                            <p className="text-sm text-deep-navy/60">{formatDate(activity.completed_at)}</p>
                            {activity.achievement_unlocked && (
                              <Badge className="mt-3 bg-mint-green/20 text-mint-green border-mint-green">
                                <Star className="w-4 h-4 mr-1" strokeWidth={1.5} />
                                {activity.achievement_unlocked}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
