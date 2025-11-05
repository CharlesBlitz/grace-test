'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pill, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Elder {
  id: string;
  name: string;
}

interface MedicationLog {
  id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string;
  administered_at: string | null;
  status: string;
  photo_url: string | null;
  missed_reason: string | null;
}

interface AdherenceStats {
  totalScheduled: number;
  taken: number;
  missed: number;
  late: number;
  adherenceRate: number;
  trend: 'up' | 'down' | 'stable';
}

export default function MedicationReportsPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [medications, setMedications] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  const [stats, setStats] = useState<AdherenceStats>({
    totalScheduled: 0,
    taken: 0,
    missed: 0,
    late: 0,
    adherenceRate: 0,
    trend: 'stable',
  });

  useEffect(() => {
    if (profile?.id) {
      loadElders();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedElder) {
      loadMedicationData();
    }
  }, [selectedElder, timeRange]);

  const loadElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicationData = async () => {
    if (!selectedElder) return;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('elder_id', selectedElder.id)
        .gte('scheduled_time', startDate.toISOString())
        .order('scheduled_time', { ascending: false });

      if (error) throw error;

      setMedications(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading medication data:', error);
    }
  };

  const calculateStats = (meds: MedicationLog[]) => {
    const totalScheduled = meds.length;
    const taken = meds.filter((m) => m.status === 'taken').length;
    const missed = meds.filter((m) => m.status === 'missed').length;
    const late = meds.filter((m) => m.status === 'late').length;
    const adherenceRate = totalScheduled > 0 ? Math.round((taken / totalScheduled) * 100) : 0;

    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - timeRange * 2);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - timeRange);

    const previousPeriodMeds = meds.filter((m) => {
      const scheduledDate = new Date(m.scheduled_time);
      return scheduledDate >= previousPeriodStart && scheduledDate < previousPeriodEnd;
    });

    const previousAdherenceRate =
      previousPeriodMeds.length > 0
        ? (previousPeriodMeds.filter((m) => m.status === 'taken').length / previousPeriodMeds.length) * 100
        : adherenceRate;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (adherenceRate > previousAdherenceRate + 5) trend = 'up';
    if (adherenceRate < previousAdherenceRate - 5) trend = 'down';

    setStats({
      totalScheduled,
      taken,
      missed,
      late,
      adherenceRate,
      trend,
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-mint-green/20 text-mint-green border-mint-green';
      case 'missed':
        return 'bg-coral-red/20 text-coral-red border-coral-red';
      case 'late':
        return 'bg-orange-100 text-orange-600 border-orange-300';
      default:
        return 'bg-soft-gray/20 text-deep-navy border-soft-gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return CheckCircle2;
      case 'missed':
        return XCircle;
      case 'late':
        return Clock;
      default:
        return Clock;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading...</div>
      </main>
    );
  }

  if (elders.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-12 text-center">
            <Pill className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-deep-navy mb-2">No Elder Accounts</h1>
            <p className="text-body text-deep-navy/70 mb-6">You haven't been linked to any elder accounts yet.</p>
            <Link href="/nok-dashboard">
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy">Go to Dashboard</Button>
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
          <Link href="/nok-dashboard">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <Pill className="w-10 h-10 text-sky-blue" strokeWidth={1.5} />
              <div>
                <h1 className="text-4xl font-bold text-deep-navy">Medication Adherence Report</h1>
                <p className="text-xl text-deep-navy/70">Track medication compliance over time</p>
              </div>
            </div>

            {elders.length > 1 && (
              <div className="flex gap-3 flex-wrap">
                {elders.map((elder) => (
                  <Button
                    key={elder.id}
                    onClick={() => setSelectedElder(elder)}
                    variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                    className="rounded-[16px]"
                  >
                    {elder.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mb-6">
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              onClick={() => setTimeRange(days)}
              variant={timeRange === days ? 'default' : 'outline'}
              className="rounded-[16px]"
            >
              <Calendar className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Last {days} Days
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-deep-navy/70">Adherence Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold text-deep-navy">{stats.adherenceRate}%</p>
                {stats.trend === 'up' && <TrendingUp className="w-6 h-6 text-mint-green" strokeWidth={1.5} />}
                {stats.trend === 'down' && <TrendingDown className="w-6 h-6 text-coral-red" strokeWidth={1.5} />}
              </div>
              {stats.adherenceRate < 70 && (
                <div className="flex items-center gap-2 mt-3 text-coral-red">
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Needs attention</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-deep-navy/70">Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
                <p className="text-4xl font-bold text-deep-navy">{stats.taken}</p>
              </div>
              <p className="text-sm text-deep-navy/60 mt-2">of {stats.totalScheduled} scheduled</p>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-deep-navy/70">Missed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
                <p className="text-4xl font-bold text-deep-navy">{stats.missed}</p>
              </div>
              {stats.missed > 0 && (
                <p className="text-sm text-coral-red font-medium mt-2">Requires follow-up</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-deep-navy/70">Late</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
                <p className="text-4xl font-bold text-deep-navy">{stats.late}</p>
              </div>
              <p className="text-sm text-deep-navy/60 mt-2">Timing may need adjustment</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white rounded-[20px] shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-deep-navy">Medication Log</CardTitle>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-deep-navy mb-2">No Medication Data</h3>
                <p className="text-lg text-deep-navy/70">No medications scheduled for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.map((med) => {
                  const StatusIcon = getStatusIcon(med.status);
                  return (
                    <Card key={med.id} className="bg-soft-gray/10 border-2 rounded-[16px] shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(med.status)}`}>
                              <StatusIcon className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-deep-navy">{med.medication_name}</h3>
                              <p className="text-deep-navy/70">{med.dosage}</p>
                              <p className="text-sm text-deep-navy/60 mt-1">Scheduled: {formatDate(med.scheduled_time)}</p>
                              {med.administered_at && (
                                <p className="text-sm text-deep-navy/60">Taken: {formatDate(med.administered_at)}</p>
                              )}
                              {med.missed_reason && (
                                <p className="text-sm text-coral-red mt-2">Reason: {med.missed_reason}</p>
                              )}
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(med.status)} border`}>
                            {med.status.toUpperCase()}
                          </Badge>
                        </div>
                        {med.photo_url && (
                          <div className="mt-3 pl-16">
                            <p className="text-sm text-deep-navy/60 mb-2">Photo verification available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
