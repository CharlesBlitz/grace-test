'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pill, Camera, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/ProtectedRoute';

interface MedicationLog {
  id: string;
  medication_name: string;
  dosage: string;
  scheduled_time: string;
  administered_at: string | null;
  status: string;
  photo_url: string | null;
  notes: string | null;
}

function MedicationsPageContent() {
  const { profile } = useAuth();
  const [medications, setMedications] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingPhoto, setTakingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadMedications();
    }
  }, [profile]);

  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('elder_id', profile?.id)
        .gte('scheduled_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async (medicationId: string) => {
    setTakingPhoto(medicationId);

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setTakingPhoto(null);
          return;
        }

        const photoUrl = URL.createObjectURL(file);

        await markAsTaken(medicationId, photoUrl);
        setTakingPhoto(null);
      };

      input.click();
    } catch (error) {
      console.error('Error taking photo:', error);
      setTakingPhoto(null);
    }
  };

  const markAsTaken = async (medicationId: string, photoUrl?: string) => {
    try {
      const { error } = await supabase
        .from('medication_logs')
        .update({
          status: 'taken',
          administered_at: new Date().toISOString(),
          photo_url: photoUrl || null,
          photo_taken_at: photoUrl ? new Date().toISOString() : null,
        })
        .eq('id', medicationId);

      if (error) throw error;

      const { error: activityError } = await supabase
        .from('activity_log')
        .insert({
          elder_id: profile?.id,
          activity_type: 'medication',
          activity_title: 'Took Medication',
          activity_description: medications.find(m => m.id === medicationId)?.medication_name || 'Medication',
          completed_at: new Date().toISOString(),
          icon: 'pill',
          color: 'mint-green',
          related_task_id: null,
        });

      toast.success('Medication recorded! Great job taking your medication!');

      loadMedications();
    } catch (error: any) {
      toast.error(error.message || 'Error recording medication');
    }
  };

  const markAsSkipped = async (medicationId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('medication_logs')
        .update({
          status: 'missed',
          missed_reason: reason,
        })
        .eq('id', medicationId);

      if (error) throw error;

      toast.success('Medication skipped. Your family has been notified');

      loadMedications();
    } catch (error: any) {
      toast.error(error.message || 'Error updating medication');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return 'bg-mint-green/20 text-mint-green border-mint-green';
      case 'missed':
        return 'bg-coral-red/20 text-coral-red border-coral-red';
      case 'late':
        return 'bg-orange-100 text-orange-600 border-orange-600';
      default:
        return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return <CheckCircle2 className="w-6 h-6" />;
      case 'missed':
        return <XCircle className="w-6 h-6" />;
      case 'late':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isPending = (med: MedicationLog) => {
    return med.status === 'pending' && new Date(med.scheduled_time) <= new Date();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading medications...</div>
      </main>
    );
  }

  const pendingMeds = medications.filter(isPending);
  const upcomingMeds = medications.filter(m => m.status === 'pending' && new Date(m.scheduled_time) > new Date());
  const completedMeds = medications.filter(m => m.status === 'taken');

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
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Pill className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              <CardTitle className="text-3xl">My Medications</CardTitle>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {pendingMeds.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-deep-navy mb-4">Take Now</h2>
              <div className="space-y-4">
                {pendingMeds.map((med) => (
                  <Card key={med.id} className="bg-white rounded-[20px] shadow-md border-2 border-coral-red">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-sky-blue/20 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-deep-navy mb-1">{med.medication_name}</h3>
                          <p className="text-xl text-deep-navy/70 mb-2">{med.dosage}</p>
                          <div className="flex items-center gap-2 text-lg text-deep-navy/60">
                            <Clock className="w-5 h-5" />
                            <span>Scheduled for {formatTime(med.scheduled_time)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          onClick={() => handleTakePhoto(med.id)}
                          disabled={takingPhoto === med.id}
                          size="lg"
                          className="h-20 text-xl rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold"
                        >
                          <Camera className="w-6 h-6 mr-3" strokeWidth={1.5} />
                          {takingPhoto === med.id ? 'Taking Photo...' : 'Take Photo & Mark as Taken'}
                        </Button>

                        <Button
                          onClick={() => markAsTaken(med.id)}
                          size="lg"
                          variant="outline"
                          className="h-16 text-lg rounded-[16px]"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" strokeWidth={1.5} />
                          Mark as Taken (No Photo)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {upcomingMeds.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-deep-navy mb-4">Coming Up</h2>
              <div className="space-y-4">
                {upcomingMeds.map((med) => (
                  <Card key={med.id} className="bg-white rounded-[20px] shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-sky-blue/20 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-deep-navy">{med.medication_name}</h3>
                          <p className="text-lg text-deep-navy/70">{med.dosage}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-sky-blue">{formatTime(med.scheduled_time)}</p>
                          <Badge className={`${getStatusColor(med.status)} border mt-1`}>
                            {med.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedMeds.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-deep-navy mb-4">Completed Today</h2>
              <div className="space-y-4">
                {completedMeds.map((med) => (
                  <Card key={med.id} className="bg-white rounded-[20px] shadow-md opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-mint-green/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-deep-navy">{med.medication_name}</h3>
                          <p className="text-lg text-deep-navy/70">{med.dosage}</p>
                          {med.administered_at && (
                            <p className="text-sm text-deep-navy/60 mt-1">
                              Taken at {formatTime(med.administered_at)}
                            </p>
                          )}
                        </div>
                        {med.photo_url && (
                          <div className="text-mint-green text-sm flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            Photo
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {medications.length === 0 && (
            <Card className="bg-white rounded-[20px] shadow-md p-12 text-center">
              <Pill className="w-16 h-16 text-deep-navy/40 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold text-deep-navy mb-2">No Medications Scheduled</h3>
              <p className="text-lg text-deep-navy/70">
                Your medications will appear here when scheduled
              </p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MedicationsPage() {
  return (
    <ProtectedRoute>
      <MedicationsPageContent />
    </ProtectedRoute>
  );
}
