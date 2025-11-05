'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Settings, Building2, Bell, Shield, Palette } from 'lucide-react';

interface OrganizationSettings {
  id: string;
  name: string;
  organization_type: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website: string;
  primary_color: string;
}

interface FacilitySettings {
  timezone: string;
  default_language: string;
  enable_voice_reminders: boolean;
  enable_family_portal: boolean;
  enable_video_calls: boolean;
  daily_summary_time: string;
  default_reminder_methods: string[];
}

export default function OrganizationSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>('');

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    id: '',
    name: '',
    organization_type: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    website: '',
    primary_color: '#3b82f6',
  });

  const [facilitySettings, setFacilitySettings] = useState<FacilitySettings>({
    timezone: 'America/New_York',
    default_language: 'en',
    enable_voice_reminders: true,
    enable_family_portal: true,
    enable_video_calls: false,
    daily_summary_time: '17:00',
    default_reminder_methods: ['app', 'sms'],
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(*)')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      const org = orgUser.organizations as any;
      setOrganizationId(orgUser.organization_id);
      setOrgSettings({
        id: org.id,
        name: org.name,
        organization_type: org.organization_type,
        email: org.email,
        phone: org.phone,
        address: org.address,
        city: org.city,
        state: org.state,
        zip_code: org.zip_code,
        website: org.website,
        primary_color: org.primary_color || '#3b82f6',
      });

      const { data: settings } = await supabase
        .from('facility_settings')
        .select('*')
        .eq('organization_id', orgUser.organization_id)
        .single();

      if (settings) {
        setFacilitySettings({
          timezone: settings.timezone,
          default_language: settings.default_language,
          enable_voice_reminders: settings.enable_voice_reminders,
          enable_family_portal: settings.enable_family_portal,
          enable_video_calls: settings.enable_video_calls,
          daily_summary_time: settings.daily_summary_time,
          default_reminder_methods: settings.default_reminder_methods || ['app', 'sms'],
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const saveOrganizationSettings = async () => {
    setSaving(true);
    try {
      await supabase
        .from('organizations')
        .update({
          name: orgSettings.name,
          email: orgSettings.email,
          phone: orgSettings.phone,
          address: orgSettings.address,
          city: orgSettings.city,
          state: orgSettings.state,
          zip_code: orgSettings.zip_code,
          website: orgSettings.website,
          primary_color: orgSettings.primary_color,
        })
        .eq('id', orgSettings.id);

      toast.success('Settings saved. Organization settings have been updated');
    } catch (error: any) {
      toast.error(error.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const saveFacilitySettings = async () => {
    setSaving(true);
    try {
      await supabase
        .from('facility_settings')
        .update({
          timezone: facilitySettings.timezone,
          default_language: facilitySettings.default_language,
          enable_voice_reminders: facilitySettings.enable_voice_reminders,
          enable_family_portal: facilitySettings.enable_family_portal,
          enable_video_calls: facilitySettings.enable_video_calls,
          daily_summary_time: facilitySettings.daily_summary_time,
          default_reminder_methods: facilitySettings.default_reminder_methods,
        })
        .eq('organization_id', organizationId);

      toast.success('Settings saved. Facility preferences have been updated');
    } catch (error: any) {
      toast.error(error.message || 'Error saving settings');
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            Organization Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your facility configuration and preferences</p>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList>
            <TabsTrigger value="organization">
              <Building2 className="h-4 w-4 mr-2" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Bell className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Update your facility's basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={orgSettings.name}
                      onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orgSettings.email}
                      onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={orgSettings.phone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={orgSettings.address}
                      onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={orgSettings.city}
                        onChange={(e) => setOrgSettings({ ...orgSettings, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={orgSettings.state}
                        onChange={(e) => setOrgSettings({ ...orgSettings, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={orgSettings.zip_code}
                        onChange={(e) => setOrgSettings({ ...orgSettings, zip_code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={orgSettings.website}
                      onChange={(e) => setOrgSettings({ ...orgSettings, website: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={saveOrganizationSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Facility Preferences</CardTitle>
                <CardDescription>Configure care and notification settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={facilitySettings.timezone}
                      onValueChange={(value) => setFacilitySettings({ ...facilitySettings, timezone: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="summary_time">Daily Summary Time</Label>
                    <Input
                      id="summary_time"
                      type="time"
                      value={facilitySettings.daily_summary_time}
                      onChange={(e) => setFacilitySettings({ ...facilitySettings, daily_summary_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Voice Reminders</Label>
                        <p className="text-sm text-gray-600">Enable voice-based reminders for residents</p>
                      </div>
                      <Switch
                        checked={facilitySettings.enable_voice_reminders}
                        onCheckedChange={(checked) =>
                          setFacilitySettings({ ...facilitySettings, enable_voice_reminders: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Family Portal</Label>
                        <p className="text-sm text-gray-600">Allow families to access resident updates</p>
                      </div>
                      <Switch
                        checked={facilitySettings.enable_family_portal}
                        onCheckedChange={(checked) =>
                          setFacilitySettings({ ...facilitySettings, enable_family_portal: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Video Calls</Label>
                        <p className="text-sm text-gray-600">Enable video calling features</p>
                      </div>
                      <Switch
                        checked={facilitySettings.enable_video_calls}
                        onCheckedChange={(checked) =>
                          setFacilitySettings({ ...facilitySettings, enable_video_calls: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={saveFacilitySettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Customize your facility's appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex gap-4 items-center mt-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={orgSettings.primary_color}
                      onChange={(e) => setOrgSettings({ ...orgSettings, primary_color: e.target.value })}
                      className="w-24 h-12"
                    />
                    <Input
                      type="text"
                      value={orgSettings.primary_color}
                      onChange={(e) => setOrgSettings({ ...orgSettings, primary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <Button onClick={saveOrganizationSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Branding'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security & Compliance</CardTitle>
                <CardDescription>Manage security settings and access controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      Security settings require administrator approval. Contact support to modify these settings.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Current Security Features</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>Role-based access control (RBAC)</li>
                      <li>Audit logging for all actions</li>
                      <li>Encrypted data storage</li>
                      <li>GDPR-compliant data retention</li>
                      <li>Two-factor authentication available</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
