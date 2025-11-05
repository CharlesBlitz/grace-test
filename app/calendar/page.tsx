'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pill, Heart, Clock } from 'lucide-react';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: 'medication' | 'wellness' | 'reminder' | 'activity';
  color: string;
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<{ [key: string]: CalendarEvent[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadEvents();
    }
  }, [profile, currentDate]);

  const loadEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [medicationsData, checkInsData, tasksData] = await Promise.all([
        supabase
          .from('medication_logs')
          .select('*')
          .eq('elder_id', profile?.id)
          .gte('scheduled_time', startOfMonth.toISOString())
          .lte('scheduled_time', endOfMonth.toISOString())
          .order('scheduled_time', { ascending: true }),

        supabase
          .from('wellness_check_ins')
          .select('*')
          .eq('elder_id', profile?.id)
          .gte('check_in_date', startOfMonth.toISOString().split('T')[0])
          .lte('check_in_date', endOfMonth.toISOString().split('T')[0]),

        supabase
          .from('care_tasks')
          .select('*')
          .eq('elder_id', profile?.id),
      ]);

      const eventsByDate: { [key: string]: CalendarEvent[] } = {};

      medicationsData.data?.forEach(med => {
        const date = new Date(med.scheduled_time).toDateString();
        if (!eventsByDate[date]) eventsByDate[date] = [];
        eventsByDate[date].push({
          id: med.id,
          title: med.medication_name,
          time: new Date(med.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          type: 'medication',
          color: 'sky-blue',
        });
      });

      checkInsData.data?.forEach(checkIn => {
        const date = new Date(checkIn.check_in_date).toDateString();
        if (!eventsByDate[date]) eventsByDate[date] = [];
        eventsByDate[date].push({
          id: checkIn.id,
          title: 'Wellness Check-In',
          time: checkIn.check_in_time || 'Morning',
          type: 'wellness',
          color: 'mint-green',
        });
      });

      setEvents(eventsByDate);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events[date.toDateString()] || [];
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'medication':
        return Pill;
      case 'wellness':
        return Heart;
      default:
        return Clock;
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth();

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading calendar...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CalendarIcon className="w-10 h-10 text-sky-blue" strokeWidth={1.5} />
                <h1 className="text-4xl font-bold text-deep-navy">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={previousMonth}
                  size="lg"
                  variant="outline"
                  className="h-14 w-14 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
                </Button>
                <Button
                  onClick={nextMonth}
                  size="lg"
                  variant="outline"
                  className="h-14 w-14 rounded-full"
                >
                  <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-[20px] shadow-lg p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-bold text-xl text-deep-navy py-4">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const dateEvents = getEventsForDate(date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={index}
                  className={`min-h-[140px] p-3 rounded-[16px] border-2 transition-all ${
                    date
                      ? isTodayDate
                        ? 'bg-mint-green/20 border-mint-green'
                        : 'bg-white border-soft-gray hover:border-sky-blue'
                      : 'bg-transparent border-transparent'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-2xl font-bold mb-2 ${isTodayDate ? 'text-mint-green' : 'text-deep-navy'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dateEvents.slice(0, 3).map((event) => {
                          const Icon = getEventIcon(event.type);
                          return (
                            <div
                              key={event.id}
                              className={`text-xs p-2 rounded-[8px] bg-${event.color}/20 border border-${event.color}`}
                            >
                              <div className="flex items-center gap-1">
                                <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                                <span className="truncate font-medium">{event.time}</span>
                              </div>
                              <div className="truncate text-deep-navy/80 mt-1">{event.title}</div>
                            </div>
                          );
                        })}
                        {dateEvents.length > 3 && (
                          <div className="text-xs text-deep-navy/60 font-medium text-center py-1">
                            +{dateEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-white rounded-[16px] shadow-md p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-sky-blue/20 border-2 border-sky-blue"></div>
              <span className="text-lg font-semibold text-deep-navy">Medications</span>
            </div>
          </Card>
          <Card className="bg-white rounded-[16px] shadow-md p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-mint-green/20 border-2 border-mint-green"></div>
              <span className="text-lg font-semibold text-deep-navy">Wellness Check-Ins</span>
            </div>
          </Card>
          <Card className="bg-white rounded-[16px] shadow-md p-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-coral-red/20 border-2 border-coral-red"></div>
              <span className="text-lg font-semibold text-deep-navy">Reminders</span>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
