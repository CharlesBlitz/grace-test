'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Pill, Droplet, Footprints, ListTodo, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import FeatureGate from '@/components/FeatureGate';

interface Task {
  id: string;
  title: string;
  type: 'med' | 'walk' | 'hydrate' | 'custom';
  schedule_cron: string;
  last_completed_at: string | null;
  status: string;
}

export default function RemindersPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('care_tasks')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('care_tasks')
        .update({
          last_completed_at: new Date().toISOString(),
          status: 'on_time',
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, last_completed_at: new Date().toISOString(), status: 'on_time' }
            : task
        )
      );
    } catch (error) {
      console.error('Error marking task done:', error);
    }
  };

  const readScheduleAloud = () => {
    setReading(true);
    const text = tasks
      .map(task => {
        const time = getTaskTime(task.schedule_cron);
        return `${task.title} at ${time}`;
      })
      .join('. ');

    const utterance = new SpeechSynthesisUtterance(`Today's plan: ${text}`);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => setReading(false);

    speechSynthesis.speak(utterance);
  };

  const getTaskTime = (cron: string): string => {
    return '9:00 AM';
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'med':
        return <Pill className="w-8 h-8 text-deep-navy" strokeWidth={1.5} />;
      case 'walk':
        return <Footprints className="w-8 h-8 text-deep-navy" strokeWidth={1.5} />;
      case 'hydrate':
        return <Droplet className="w-8 h-8 text-deep-navy" strokeWidth={1.5} />;
      default:
        return <ListTodo className="w-8 h-8 text-deep-navy" strokeWidth={1.5} />;
    }
  };

  const isCompleted = (task: Task) => {
    if (!task.last_completed_at) return false;
    const lastCompleted = new Date(task.last_completed_at);
    const today = new Date();
    return (
      lastCompleted.getDate() === today.getDate() &&
      lastCompleted.getMonth() === today.getMonth() &&
      lastCompleted.getFullYear() === today.getFullYear()
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <FeatureGate
          featureKey="reminders"
          upgradeMessage="Reminders are limited in your current plan. Upgrade to Essential or higher for unlimited reminders."
        >
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

          <Button
            onClick={readScheduleAloud}
            disabled={reading || tasks.length === 0}
            className="bg-sky-blue hover:bg-sky-blue/90 text-deep-navy rounded-[20px] px-6"
            aria-label="Read today's schedule aloud"
          >
            <Volume2 className="w-5 h-5 mr-2" strokeWidth={1.5} />
            {reading ? 'Reading...' : 'Read My Schedule'}
          </Button>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Today's Plan
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </Card>

        {loading ? (
          <div className="text-center text-deep-navy text-xl">Loading your tasks...</div>
        ) : tasks.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-md p-12 text-center">
            <p className="text-xl text-deep-navy/70">No tasks scheduled for today</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {tasks.map(task => {
              const completed = isCompleted(task);
              return (
                <Card
                  key={task.id}
                  className={`rounded-[24px] shadow-md p-6 transition-all duration-300 ${
                    completed
                      ? 'bg-mint-green/50 border-2 border-mint-green'
                      : 'bg-white hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">{getTaskIcon(task.type)}</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-deep-navy mb-1">
                          {task.title}
                        </h3>
                        <p className="text-body text-deep-navy/60">
                          {getTaskTime(task.schedule_cron)}
                        </p>
                      </div>
                    </div>

                    {completed ? (
                      <div className="flex items-center gap-2 text-deep-navy font-semibold">
                        <Check className="w-8 h-8 text-mint-green" strokeWidth={2.5} />
                        <span className="text-lg">Done</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => markDone(task.id)}
                        size="lg"
                        className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-full w-24 h-24 text-xl font-bold shadow-lg hover:scale-105 transition-transform"
                        aria-label={`Mark ${task.title} as done`}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        </FeatureGate>
      </div>
    </main>
  );
}
