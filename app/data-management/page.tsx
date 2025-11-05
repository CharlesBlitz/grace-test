'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import {
  Database,
  Download,
  Trash2,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Archive,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface ConversationData {
  id: string;
  created_at: string;
  sentiment: string;
  retention_category: string;
  legal_basis: string;
  archive_after: string;
  delete_after: string;
  is_archived: boolean;
  flagged_for_safeguarding: boolean;
  contains_health_data: boolean;
}

interface RetentionPolicy {
  retention_period_months: number;
  safeguarding_retention_years: number;
  analytics_consent: boolean;
  analytics_consent_date: string | null;
}

interface DataStats {
  total: number;
  archived: number;
  safeguarding: number;
  health_data: number;
  days_until_next_deletion: number;
}

export default function DataManagementPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    // Load conversations
    const { data: convData } = await supabase
      .from('conversations')
      .select('*')
      .eq('elder_id', user.id)
      .order('created_at', { ascending: false });

    if (convData) {
      setConversations(convData);

      // Calculate stats
      const total = convData.length;
      const archived = convData.filter(c => c.is_archived).length;
      const safeguarding = convData.filter(c => c.flagged_for_safeguarding).length;
      const health_data = convData.filter(c => c.contains_health_data).length;

      // Find next deletion date
      const deletionDates = convData
        .filter(c => c.delete_after)
        .map(c => new Date(c.delete_after).getTime());

      const nextDeletion = deletionDates.length > 0 ? Math.min(...deletionDates) : null;
      const days_until_next_deletion = nextDeletion
        ? Math.ceil((nextDeletion - Date.now()) / (1000 * 60 * 60 * 24))
        : -1;

      setStats({
        total,
        archived,
        safeguarding,
        health_data,
        days_until_next_deletion,
      });
    }

    // Load retention policy
    const { data: policyData } = await supabase
      .from('conversation_retention_policies')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (policyData) {
      setRetentionPolicy(policyData);
      setSelectedPeriod(policyData.retention_period_months);
    }

    setLoading(false);
  };

  const updateRetentionPeriod = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('conversation_retention_policies')
      .upsert({
        user_id: user.id,
        retention_period_months: selectedPeriod,
        last_modified_at: new Date().toISOString(),
        last_modified_by: user.id,
      });

    if (!error) {
      await supabase
        .from('users')
        .update({ conversation_retention_preference: selectedPeriod })
        .eq('id', user.id);

      alert('Retention period updated successfully');
      loadData();
    }
  };

  const updateAnalyticsConsent = async (consent: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversation_retention_policies')
      .upsert({
        user_id: user.id,
        analytics_consent: consent,
        analytics_consent_date: consent ? new Date().toISOString() : null,
        last_modified_at: new Date().toISOString(),
        last_modified_by: user.id,
      });

    if (!error) {
      await supabase
        .from('users')
        .update({
          analytics_consent: consent,
          analytics_consent_date: consent ? new Date().toISOString() : null,
        })
        .eq('id', user.id);

      alert('Analytics consent updated');
      loadData();
    }
  };

  const requestDataExport = async () => {
    if (!user) return;

    // Create data subject request
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await supabase
      .from('data_subject_requests')
      .insert({
        user_id: user.id,
        request_type: 'portability',
        request_details: 'User requested full data export via dashboard',
        status: 'pending',
        response_due_date: dueDate.toISOString(),
      });

    alert('Data export requested. You will receive an email with your data within 30 days.');
  };

  const requestDataDeletion = async () => {
    if (!user) return;

    const confirmed = confirm(
      'Are you sure you want to request deletion of your conversation data? ' +
      'Note: Conversations flagged for safeguarding purposes may be retained due to legal obligations.'
    );

    if (!confirmed) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    await supabase
      .from('data_subject_requests')
      .insert({
        user_id: user.id,
        request_type: 'erasure',
        request_details: 'User requested data deletion via dashboard',
        status: 'pending',
        response_due_date: dueDate.toISOString(),
      });

    alert('Deletion request submitted. We will process this within 30 days and notify you of any data retained for legal reasons.');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="max-w-4xl mx-auto py-12 text-center">
          <p className="text-deep-navy/70 mb-4">Please log in to manage your data</p>
          <Link href="/login">
            <Button>Log In</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="max-w-6xl mx-auto py-12">
          <p className="text-center text-deep-navy/70">Loading your data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-6xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Data Management & Privacy
          </h1>
          <p className="text-lg text-deep-navy/70">
            View and control your conversation data and privacy settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white rounded-[16px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-deep-navy/60 mb-1">Total Conversations</p>
                <p className="text-3xl font-bold text-deep-navy">{stats?.total || 0}</p>
              </div>
              <Database className="w-8 h-8 text-sky-blue" />
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-[16px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-deep-navy/60 mb-1">Archived</p>
                <p className="text-3xl font-bold text-deep-navy">{stats?.archived || 0}</p>
              </div>
              <Archive className="w-8 h-8 text-mint-green" />
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-[16px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-deep-navy/60 mb-1">Safeguarding</p>
                <p className="text-3xl font-bold text-deep-navy">{stats?.safeguarding || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-coral-red" />
            </div>
          </Card>

          <Card className="p-6 bg-white rounded-[16px]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-deep-navy/60 mb-1">Next Deletion</p>
                <p className="text-3xl font-bold text-deep-navy">
                  {stats?.days_until_next_deletion && stats.days_until_next_deletion > 0
                    ? `${stats.days_until_next_deletion}d`
                    : 'None'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-deep-navy/40" />
            </div>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white rounded-[16px] p-1">
            <TabsTrigger value="overview" className="rounded-[12px]">Overview</TabsTrigger>
            <TabsTrigger value="conversations" className="rounded-[12px]">Conversations</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-[12px]">Settings</TabsTrigger>
            <TabsTrigger value="rights" className="rounded-[12px]">Your Rights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-8 bg-white rounded-[24px]">
                <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-mint-green" />
                  Data Retention Policy
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-deep-navy mb-1">Current Retention Period</p>
                    <p className="text-lg text-deep-navy/80">{retentionPolicy?.retention_period_months || 12} months</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-deep-navy mb-1">Safeguarding Data</p>
                    <p className="text-lg text-deep-navy/80">{retentionPolicy?.safeguarding_retention_years || 7} years</p>
                    <p className="text-xs text-deep-navy/60 mt-1">Required by law for vulnerable adult protection</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-deep-navy mb-1">Analytics Consent</p>
                    <Badge variant={retentionPolicy?.analytics_consent ? 'default' : 'secondary'}>
                      {retentionPolicy?.analytics_consent ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-white rounded-[24px]">
                <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-sky-blue" />
                  Legal Basis for Processing
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mint-green mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-navy">Legitimate Interest</p>
                      <p className="text-sm text-deep-navy/70">Monitoring your wellbeing and safety</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mint-green mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-navy">Vital Interests</p>
                      <p className="text-sm text-deep-navy/70">Protecting your life and physical integrity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mint-green mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-navy">Legal Obligation</p>
                      <p className="text-sm text-deep-navy/70">Safeguarding duties under UK law</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <Card className="p-8 bg-white rounded-[24px]">
              <h2 className="text-2xl font-bold text-deep-navy mb-6">Your Conversations</h2>

              {conversations.length === 0 ? (
                <p className="text-center text-deep-navy/60 py-8">No conversations yet</p>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 20).map((conv) => {
                    const archiveDate = new Date(conv.archive_after);
                    const deleteDate = new Date(conv.delete_after);
                    const now = new Date();
                    const daysUntilArchive = Math.ceil((archiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const daysUntilDelete = Math.ceil((deleteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={conv.id}
                        className="border border-deep-navy/10 rounded-[12px] p-4 hover:bg-soft-gray/30 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-sm text-deep-navy/80">
                                {new Date(conv.created_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              {conv.is_archived && <Badge variant="secondary">Archived</Badge>}
                              {conv.flagged_for_safeguarding && (
                                <Badge className="bg-coral-red/10 text-coral-red border-coral-red/20">
                                  Safeguarding
                                </Badge>
                              )}
                              {conv.contains_health_data && (
                                <Badge variant="outline">Health Data</Badge>
                              )}
                            </div>
                            <p className="text-xs text-deep-navy/60">
                              Sentiment: <span className="capitalize">{conv.sentiment}</span> •
                              Category: <span className="capitalize">{conv.retention_category.replace('_', ' ')}</span>
                            </p>
                            <p className="text-xs text-deep-navy/50 mt-1">
                              {conv.is_archived
                                ? `Deletes in ${daysUntilDelete} days`
                                : `Archives in ${daysUntilArchive} days, deletes in ${daysUntilDelete} days`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {conversations.length > 20 && (
                    <p className="text-center text-sm text-deep-navy/60 pt-4">
                      Showing 20 of {conversations.length} conversations
                    </p>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="p-8 bg-white rounded-[24px]">
                <h2 className="text-2xl font-bold text-deep-navy mb-6 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-sky-blue" />
                  Retention Settings
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-deep-navy mb-3">
                      Conversation Retention Period: {selectedPeriod} months
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="24"
                      step="3"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-deep-navy/60 mt-1">
                      <span>12 months</span>
                      <span>24 months</span>
                    </div>
                    <p className="text-sm text-deep-navy/60 mt-3">
                      Controls how long normal wellbeing conversations are kept. Safeguarding data is always kept for 7 years as required by law.
                    </p>
                  </div>

                  <Button onClick={updateRetentionPeriod} className="w-full rounded-[12px]">
                    Update Retention Period
                  </Button>
                </div>
              </Card>

              <Card className="p-8 bg-white rounded-[24px]">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">Analytics Consent</h2>
                <p className="text-deep-navy/70 mb-6">
                  We can use anonymized conversation data to improve our AI responses. Your conversations will be stripped of all personal information and cannot be linked back to you.
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-deep-navy">Allow anonymized data use</p>
                    <p className="text-sm text-deep-navy/60">Consent expires annually and must be renewed</p>
                  </div>
                  <Button
                    onClick={() => updateAnalyticsConsent(!retentionPolicy?.analytics_consent)}
                    variant={retentionPolicy?.analytics_consent ? 'default' : 'outline'}
                    className="rounded-[12px]"
                  >
                    {retentionPolicy?.analytics_consent ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rights">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-8 bg-white rounded-[24px]">
                <div className="flex items-start gap-4 mb-4">
                  <Download className="w-8 h-8 text-sky-blue flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-deep-navy mb-2">Right to Data Portability</h3>
                    <p className="text-deep-navy/70 text-sm mb-4">
                      Request a copy of all your data in a portable format (JSON). We will provide this within 30 days.
                    </p>
                    <Button onClick={requestDataExport} variant="outline" className="rounded-[12px]">
                      Request Data Export
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-white rounded-[24px]">
                <div className="flex items-start gap-4 mb-4">
                  <Trash2 className="w-8 h-8 text-coral-red flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-deep-navy mb-2">Right to Erasure</h3>
                    <p className="text-deep-navy/70 text-sm mb-4">
                      Request deletion of your conversation data. Note: Safeguarding data may be retained due to legal obligations.
                    </p>
                    <Button
                      onClick={requestDataDeletion}
                      variant="outline"
                      className="rounded-[12px] border-coral-red text-coral-red hover:bg-coral-red hover:text-white"
                    >
                      Request Data Deletion
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-8 bg-white rounded-[24px] lg:col-span-2">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-8 h-8 text-coral-red flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-deep-navy mb-2">Important Information</h3>
                    <div className="space-y-2 text-sm text-deep-navy/70">
                      <p>
                        • <strong>Safeguarding data retention:</strong> Conversations flagged for safeguarding purposes must be kept for 7 years under UK law to protect vulnerable adults.
                      </p>
                      <p>
                        • <strong>Response time:</strong> We will respond to all data requests within 30 days as required by GDPR.
                      </p>
                      <p>
                        • <strong>Legal basis:</strong> Some data processing is necessary for our legitimate interests in providing safe care or to comply with legal obligations.
                      </p>
                      <p>
                        • <strong>Complaints:</strong> You have the right to lodge a complaint with the Information Commissioner's Office (ICO) at{' '}
                        <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-sky-blue hover:underline">
                          ico.org.uk
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
