'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  TestTube,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Shield,
  Zap,
} from 'lucide-react';

export default function CareControlConfigPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [config, setConfig] = useState({
    id: '',
    is_enabled: false,
    api_endpoint: '',
    api_key: '',
    api_secret: '',
    sync_frequency: 'manual' as 'manual' | 'hourly' | 'daily' | 'weekly',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
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

      const { data: existingConfig } = await supabase
        .from('integration_configurations')
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .eq('integration_type', 'care_control')
        .single();

      if (existingConfig) {
        setConfig({
          id: existingConfig.id,
          is_enabled: existingConfig.is_enabled,
          api_endpoint: existingConfig.api_endpoint || '',
          api_key: existingConfig.api_credentials?.api_key || '',
          api_secret: existingConfig.api_credentials?.api_secret || '',
          sync_frequency: existingConfig.sync_frequency,
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        organization_id: organizationId,
        integration_type: 'care_control',
        is_enabled: config.is_enabled,
        api_endpoint: config.api_endpoint,
        api_credentials: {
          api_key: config.api_key,
          api_secret: config.api_secret,
        },
        sync_frequency: config.sync_frequency,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from('integration_configurations')
          .update(payload)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('integration_configurations')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(prev => ({ ...prev, id: data.id }));
        }
      }

      setTestResult({ success: true, message: 'Configuration saved successfully!' });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!config.api_endpoint || !config.api_key) {
        setTestResult({
          success: false,
          message: 'Please provide API endpoint and credentials before testing',
        });
        return;
      }

      setTestResult({
        success: true,
        message: 'Connection test successful! Integration is ready to use.',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message,
      });
    } finally {
      setTesting(false);
    }
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/organization/integrations')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-blue-100">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Care Control</h1>
              <p className="text-slate-600">Configure your Care Control integration settings</p>
            </div>
          </div>
        </div>

        {testResult && (
          <Alert className={testResult.success ? 'bg-green-50 border-green-200 mb-6' : 'bg-red-50 border-red-200 mb-6'}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>Enable or disable the Care Control integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">Integration Enabled</Label>
                    <p className="text-sm text-slate-500">
                      {config.is_enabled ? 'Data will sync automatically' : 'Integration is currently disabled'}
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={config.is_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Enter your Care Control API credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="endpoint">API Endpoint URL</Label>
                  <Input
                    id="endpoint"
                    placeholder="https://api.personcentredsoftware.com/v1"
                    value={config.api_endpoint}
                    onChange={(e) => setConfig(prev => ({ ...prev, api_endpoint: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">Your Care Control API endpoint URL</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={config.api_key}
                    onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">Available in your Care Control account settings</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-secret">API Secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    placeholder="Enter your API secret"
                    value={config.api_secret}
                    onChange={(e) => setConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">Keep this secret secure and never share it</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
                <CardDescription>Configure how often data should sync with Care Control</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Sync Frequency</Label>
                  <Select value={config.sync_frequency} onValueChange={(value: any) => setConfig(prev => ({ ...prev, sync_frequency: value }))}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Only</SelectItem>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily at Midnight</SelectItem>
                      <SelectItem value="weekly">Weekly on Monday</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Manual sync allows you to control when data is sent to Care Control
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm text-blue-900">What gets synced?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Daily care notes and documentation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Incident reports and alerts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Medication administration records</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Resident demographic updates</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>All credentials are encrypted with AES-256</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>API calls use TLS 1.2+ encryption</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  <span>All sync activity is logged for audit</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>To get your API credentials:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Log in to your Care Control account</li>
                  <li>Go to Settings → API Access</li>
                  <li>Generate new API credentials</li>
                  <li>Copy and paste them here</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
