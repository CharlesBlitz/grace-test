'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  Plug,
  Settings,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  TrendingUp,
  Shield,
  Zap,
  Database,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IntegrationConfig {
  id: string;
  integration_type: string;
  is_enabled: boolean;
  api_endpoint: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  sync_frequency: string;
}

interface SyncHistory {
  id: string;
  sync_type: string;
  data_type: string;
  sync_status: string;
  record_count: number;
  created_at: string;
  error_message: string | null;
}

const INTEGRATION_INFO = {
  person_centred_software: {
    name: 'Person Centred Software',
    description: 'Leading care management platform used by over 8,000 care providers',
    features: [
      'Sync daily care notes to PCS care records',
      'Push incident reports to PCS incident management',
      'Synchronize medication administration records',
      'Two-way resident demographic updates',
    ],
    icon: Database,
    color: 'blue',
    website: 'https://personcentredsoftware.com',
  },
  care_control: {
    name: 'Care Control',
    description: 'Comprehensive care management system with FHIR compatibility',
    features: [
      'Export documentation to Care Control records',
      'Sync care plans and assessments',
      'Push staff task completions',
      'Receive updates via webhooks',
    ],
    icon: Shield,
    color: 'green',
    website: 'https://www.carecontrolsystems.com',
  },
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
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

      const { data: configs } = await supabase
        .from('integration_configurations')
        .select('*')
        .eq('organization_id', orgUser.organization_id);

      setIntegrations(configs || []);

      const { data: history } = await supabase
        .from('integration_sync_history')
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setSyncHistory(history || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationConfig = (type: string): IntegrationConfig | undefined => {
    return integrations.find(i => i.integration_type === type);
  };

  const getStatusBadge = (config: IntegrationConfig | undefined) => {
    if (!config) {
      return <Badge variant="outline">Not Configured</Badge>;
    }

    if (!config.is_enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }

    if (config.last_sync_status === 'success') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }

    if (config.last_sync_status === 'failed') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    }

    return <Badge variant="outline">Ready</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Plug className="h-8 w-8 text-blue-600" />
            System Integrations
          </h1>
          <p className="text-slate-600">
            Connect Grace Companion with external care management systems for seamless data flow
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Integrations</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {integrations.filter(i => i.is_enabled).length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                of {Object.keys(INTEGRATION_INFO).length} available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Recent Syncs</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{syncHistory.length}</div>
              <p className="text-xs text-slate-500 mt-1">Last 10 sync events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {syncHistory.length > 0
                  ? Math.round(
                      (syncHistory.filter(s => s.sync_status === 'success').length / syncHistory.length) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-slate-500 mt-1">Integration reliability</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Object.entries(INTEGRATION_INFO).map(([type, info]) => {
            const config = getIntegrationConfig(type);
            const Icon = info.icon;

            return (
              <Card key={type} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-${info.color}-100`}>
                        <Icon className={`h-6 w-6 text-${info.color}-600`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{info.name}</CardTitle>
                        <CardDescription className="mt-1">{info.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(config)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Key Features:</h4>
                    <ul className="space-y-2">
                      {info.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {config && config.last_sync_at && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          Last sync: {formatDistanceToNow(new Date(config.last_sync_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/organization/integrations/${type}`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {config ? 'Configure' : 'Set Up Integration'}
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={info.website} target="_blank" rel="noopener noreferrer">
                        Visit Website
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {syncHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync Activity</CardTitle>
              <CardDescription>Last 10 synchronization events across all integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {syncHistory.map(sync => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          sync.sync_status === 'success'
                            ? 'bg-green-500'
                            : sync.sync_status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-slate-900 capitalize">
                          {sync.data_type.replace('_', ' ')} Sync
                        </p>
                        <p className="text-sm text-slate-500">
                          {sync.record_count} records • {formatDistanceToNow(new Date(sync.created_at), { addSuffix: true })}
                        </p>
                        {sync.error_message && (
                          <p className="text-sm text-red-600 mt-1">{sync.error_message}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={sync.sync_status === 'success' ? 'default' : 'destructive'} className="capitalize">
                      {sync.sync_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-50 border-blue-200 mt-6">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>All API credentials are encrypted at rest using AES-256 encryption</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Integration activity is fully audited for compliance requirements</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Data transfers use secure HTTPS connections with TLS 1.2+</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Webhook endpoints verify signatures to prevent unauthorized access</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
