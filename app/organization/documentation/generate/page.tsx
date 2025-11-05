'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Resident {
  id: string;
  name: string;
  avatar_url?: string;
  metadata?: any;
}

interface InteractionSummary {
  residentId: string;
  residentName: string;
  count: number;
  concerns: string[];
  lastInteraction: string;
  hasExistingNote: boolean;
}

export default function GenerateDailyNotesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [residents, setResidents] = useState<InteractionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      setOrganizationId(orgUser.organization_id);

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: interactions } = await supabase
        .from('care_interaction_logs')
        .select(`
          id,
          resident_id,
          detected_concerns,
          interaction_start,
          users!care_interaction_logs_resident_id_fkey(id, name, avatar_url)
        `)
        .eq('organization_id', orgUser.organization_id)
        .gte('interaction_start', startOfDay.toISOString())
        .lte('interaction_start', endOfDay.toISOString())
        .order('interaction_start', { ascending: false });

      const { data: existingNotes } = await supabase
        .from('care_documentation')
        .select('resident_id')
        .eq('organization_id', orgUser.organization_id)
        .eq('document_date', selectedDate)
        .eq('document_type', 'daily_note');

      const existingNoteResidents = new Set(
        existingNotes?.map((note) => note.resident_id) || []
      );

      const residentMap = new Map<string, InteractionSummary>();

      interactions?.forEach((interaction: any) => {
        const residentId = interaction.resident_id;
        const residentName = interaction.users?.name || 'Unknown Resident';

        if (!residentMap.has(residentId)) {
          residentMap.set(residentId, {
            residentId,
            residentName,
            count: 0,
            concerns: [],
            lastInteraction: interaction.interaction_start,
            hasExistingNote: existingNoteResidents.has(residentId),
          });
        }

        const summary = residentMap.get(residentId)!;
        summary.count++;

        if (interaction.detected_concerns?.length > 0) {
          summary.concerns.push(...interaction.detected_concerns);
        }
      });

      const residentSummaries = Array.from(residentMap.values()).sort((a, b) => {
        if (a.concerns.length > 0 && b.concerns.length === 0) return -1;
        if (a.concerns.length === 0 && b.concerns.length > 0) return 1;
        return b.count - a.count;
      });

      setResidents(residentSummaries);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (residentId: string) => {
    if (!organizationId) return;

    setGenerating(residentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-daily-notes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            residentId,
            organizationId,
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        router.push(`/organization/documentation/review/${result.documentation.id}`);
      } else {
        alert(result.message || 'Failed to generate note');
      }
    } catch (error) {
      console.error('Error generating note:', error);
      alert('Failed to generate note. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    const toGenerate = residents.filter(r => !r.hasExistingNote);

    if (toGenerate.length === 0) {
      alert('All residents already have notes for this date');
      return;
    }

    if (!confirm(`Generate daily notes for ${toGenerate.length} residents? This may take a few minutes.`)) {
      return;
    }

    for (const resident of toGenerate) {
      await handleGenerate(resident.residentId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading residents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Generate Daily Notes
              </h1>
              <p className="text-slate-600">
                AI-powered documentation from captured interactions
              </p>
            </div>
            <Button onClick={() => router.push('/organization/documentation')}>
              <FileText className="h-4 w-4 mr-2" />
              View All Notes
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {residents.some(r => !r.hasExistingNote) && (
              <Button onClick={handleGenerateAll} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate All
              </Button>
            )}
          </div>
        </div>

        {residents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No Interactions Found
              </h3>
              <p className="text-slate-600 mb-4">
                No resident interactions were captured for {new Date(selectedDate).toLocaleDateString('en-GB')}
              </p>
              <p className="text-sm text-slate-500">
                Interactions from voice conversations, reminders, and wellness checks will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {residents.map((resident) => (
              <Card key={resident.residentId}>
                <CardContent className="py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                          {resident.residentName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {resident.count} {resident.count === 1 ? 'interaction' : 'interactions'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Last: {formatDistanceToNow(new Date(resident.lastInteraction), { addSuffix: true })}
                          </span>
                        </div>
                        {resident.concerns.length > 0 && (
                          <Alert className="mb-0">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(resident.concerns)).map((concern, idx) => (
                                  <Badge key={idx} variant="destructive">
                                    {concern}
                                  </Badge>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {resident.hasExistingNote ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Note Generated</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleGenerate(resident.residentId)}
                          disabled={generating === resident.residentId}
                        >
                          {generating === resident.residentId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate Note
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
              <Sparkles className="h-5 w-5" />
              How Daily Note Generation Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>AI analyzes all captured interactions for each resident</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Generates professional, CQC-compliant care notes</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Automatically detects concerns and flags for review</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Staff review and approve before saving to care records</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
