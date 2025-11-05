'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/authContext';
import { languageDetection } from '@/lib/languageDetection';
import { supabase } from '@/lib/supabaseClient';
import {
  Globe,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  ArrowLeft,
  Heart,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';

interface ElderInfo {
  id: string;
  name: string;
}

export default function LanguageInsightsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [elders, setElders] = useState<ElderInfo[]>([]);
  const [selectedElder, setSelectedElder] = useState<string>('');
  const [dayRange, setDayRange] = useState(30);
  const [languageAnalytics, setLanguageAnalytics] = useState<any>(null);
  const [languagePreferences, setLanguagePreferences] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadElders();
  }, [user]);

  useEffect(() => {
    if (selectedElder) {
      loadLanguageInsights();
    }
  }, [selectedElder, dayRange]);

  const loadElders = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('elder_nok_relationships')
        .select(`
          elder_id,
          users!elder_nok_relationships_elder_id_fkey(
            id,
            name
          )
        `)
        .eq('nok_id', user.id);

      if (error) throw error;

      const eldersList = data?.map((rel: any) => ({
        id: rel.elder_id,
        name: rel.users?.name || 'Unknown',
      })) || [];

      setElders(eldersList);
      if (eldersList.length > 0) {
        setSelectedElder(eldersList[0].id);
      }
    } catch (error) {
      console.error('Error loading elders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguageInsights = async () => {
    if (!selectedElder) return;

    setLoading(true);
    try {
      // Load analytics
      const analytics = await languageDetection.analyzeLanguagePatterns(selectedElder, dayRange);
      setLanguageAnalytics(analytics);

      // Load preferences
      const preferences = await languageDetection.getUserLanguagePreferences(selectedElder);
      setLanguagePreferences(preferences);

      // Load recent events
      const startDate = subDays(new Date(), 7);
      const { data: events, error } = await supabase
        .from('conversation_language_events')
        .select('*')
        .eq('user_id', selectedElder)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentEvents(events || []);
    } catch (error) {
      console.error('Error loading language insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const languages = languageDetection.getSupportedLanguages();
    return languages.find((l) => l.code === code)?.name || code;
  };

  const getEmotionalStateColor = (state: string): string => {
    switch (state) {
      case 'calm':
        return 'bg-green-100 text-green-800';
      case 'happy':
        return 'bg-blue-100 text-blue-800';
      case 'distressed':
        return 'bg-red-100 text-red-800';
      case 'confused':
        return 'bg-amber-100 text-amber-800';
      case 'sad':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading && elders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (elders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12">
            <div className="text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Elders Found</h3>
              <p className="text-gray-600">
                You don't have any elder relationships set up yet.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/nok-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Globe className="h-8 w-8 text-blue-600" />
              Language Insights
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor language patterns and communication preferences
            </p>
          </div>
        </div>

        {/* Elder & Date Range Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Family Member
                </label>
                <Select value={selectedElder} onValueChange={setSelectedElder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {elders.map((elder) => (
                      <SelectItem key={elder.id} value={elder.id}>
                        {elder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Time Period
                </label>
                <Select value={dayRange.toString()} onValueChange={(v) => setDayRange(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Concerning Patterns Alert */}
            {languageAnalytics?.concerningPatterns &&
              languageAnalytics.concerningPatterns.length > 0 && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-900 mb-2">Patterns Requiring Attention</h3>
                        <ul className="space-y-1 text-sm text-amber-800">
                          {languageAnalytics.concerningPatterns.map((pattern: string, index: number) => (
                            <li key={index}>• {pattern}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {languageAnalytics?.totalEvents || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Conversations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Globe className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {languageAnalytics?.mostUsedLanguage
                          ? getLanguageName(languageAnalytics.mostUsedLanguage)
                          : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Most Used Language</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {languageAnalytics?.totalSwitches || 0}
                      </div>
                      <div className="text-sm text-gray-600">Language Switches</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {languageAnalytics?.emotionalStates?.distressed || 0}
                      </div>
                      <div className="text-sm text-gray-600">Distressed Moments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Language Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Language Usage Breakdown</CardTitle>
                <CardDescription>
                  Distribution of languages used in the last {dayRange} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {languageAnalytics?.languageUsage &&
                Object.keys(languageAnalytics.languageUsage).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(languageAnalytics.languageUsage)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([lang, count]) => {
                        const percentage =
                          ((count as number) / languageAnalytics.totalEvents) * 100;
                        return (
                          <div key={lang}>
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">{getLanguageName(lang)}</span>
                              <span className="text-gray-600">
                                {String(count)} ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-600">No language data available for this period</p>
                )}
              </CardContent>
            </Card>

            {/* Configured Languages */}
            <Card>
              <CardHeader>
                <CardTitle>Configured Language Preferences</CardTitle>
                <CardDescription>
                  Languages {elders.find((e) => e.id === selectedElder)?.name} has configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {languagePreferences ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Primary Language
                      </label>
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {languagePreferences.primary_language_name}
                      </Badge>
                    </div>

                    {languagePreferences.secondary_languages &&
                      languagePreferences.secondary_languages.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Secondary Languages
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {languagePreferences.secondary_languages.map((lang: string) => (
                              <Badge key={lang} variant="secondary" className="px-3 py-1">
                                {getLanguageName(lang)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={languagePreferences.auto_detect_enabled ? 'default' : 'outline'}>
                        {languagePreferences.auto_detect_enabled ? 'Auto-detect ON' : 'Auto-detect OFF'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No language preferences configured yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Language Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Language Activity</CardTitle>
                <CardDescription>Last 7 days of language usage</CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {getLanguageName(event.detected_language)}
                              </Badge>
                              {event.emotional_state && (
                                <Badge className={getEmotionalStateColor(event.emotional_state)}>
                                  {event.emotional_state}
                                </Badge>
                              )}
                              {event.trigger_type === 'emergency' && (
                                <Badge variant="destructive">Emergency</Badge>
                              )}
                            </div>
                            {event.transcript_snippet && (
                              <p className="text-sm text-gray-700 italic mb-2">
                                &quot;{event.transcript_snippet}&quot;
                              </p>
                            )}
                            {event.context && (
                              <p className="text-xs text-gray-600 mb-1">{event.context}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.created_at), 'PPp')}
                              <span className="text-gray-400">•</span>
                              <span>Confidence: {Math.round(event.confidence_score * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No recent language events</p>
                )}
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Understanding Language Patterns</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Language switches:</strong> It's normal for bilingual individuals to
                  switch languages. However, a sudden increase in native language use might
                  indicate stress or confusion.
                </p>
                <p>
                  <strong>Emotional states:</strong> Pay attention to conversations marked as
                  "distressed" or "confused" - these may require follow-up.
                </p>
                <p>
                  <strong>Emergency detection:</strong> Grace automatically detects emergency
                  phrases in all configured languages and alerts appropriate contacts.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
