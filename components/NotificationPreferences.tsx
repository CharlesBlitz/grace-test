'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Phone, Save, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface NotificationPrefs {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  escalationAlerts: boolean;
  dailySummary: boolean;
  summaryTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface NotificationPreferencesProps {
  nokId: string;
  elderId: string;
}

export function NotificationPreferences({ nokId, elderId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPrefs>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    escalationAlerts: true,
    dailySummary: false,
    summaryTime: '18:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [nokId, elderId]);

  const loadPreferences = async () => {
    try {
      const { data } = await supabase
        .from('elder_nok_relationships')
        .select('notification_preferences')
        .eq('nok_id', nokId)
        .eq('elder_id', elderId)
        .maybeSingle();

      if (data && data.notification_preferences) {
        setPreferences({ ...preferences, ...data.notification_preferences });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('elder_nok_relationships')
        .update({ notification_preferences: preferences })
        .eq('nok_id', nokId)
        .eq('elder_id', elderId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPrefs, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="bg-white rounded-[20px] shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-deep-navy">Notification Settings</h3>
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-mint-green hover:bg-mint-green/90 text-deep-navy"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-deep-navy mb-4">Alert Methods</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-soft-gray/10 rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-blue/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                </div>
                <div>
                  <Label className="text-deep-navy font-medium">Email Notifications</Label>
                  <p className="text-sm text-deep-navy/60">Receive updates via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-soft-gray/10 rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-mint-green/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                </div>
                <div>
                  <Label className="text-deep-navy font-medium">SMS Notifications</Label>
                  <p className="text-sm text-deep-navy/60">Receive text messages</p>
                </div>
              </div>
              <Switch
                checked={preferences.smsNotifications}
                onCheckedChange={(checked) => updatePreference('smsNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-soft-gray/10 rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warm-cream flex items-center justify-center">
                  <Bell className="w-5 h-5 text-deep-navy" strokeWidth={1.5} />
                </div>
                <div>
                  <Label className="text-deep-navy font-medium">Push Notifications</Label>
                  <p className="text-sm text-deep-navy/60">App notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-soft-gray/30 pt-6">
          <h4 className="text-lg font-semibold text-deep-navy mb-4">Alert Preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-coral-red/10 rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-coral-red/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-coral-red" strokeWidth={1.5} />
                </div>
                <div>
                  <Label className="text-deep-navy font-medium">Escalation Alerts</Label>
                  <p className="text-sm text-deep-navy/60">Critical missed reminders</p>
                </div>
              </div>
              <Switch
                checked={preferences.escalationAlerts}
                onCheckedChange={(checked) => updatePreference('escalationAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-soft-gray/10 rounded-[12px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-blue/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <Label className="text-deep-navy font-medium">Daily Summary</Label>
                  <p className="text-sm text-deep-navy/60">Daily activity report</p>
                  {preferences.dailySummary && (
                    <div className="mt-2">
                      <Input
                        type="time"
                        value={preferences.summaryTime}
                        onChange={(e) => updatePreference('summaryTime', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </div>
              <Switch
                checked={preferences.dailySummary}
                onCheckedChange={(checked) => updatePreference('dailySummary', checked)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-soft-gray/30 pt-6">
          <h4 className="text-lg font-semibold text-deep-navy mb-4">Quiet Hours</h4>
          <p className="text-sm text-deep-navy/60 mb-4">
            No non-urgent notifications during these hours
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-deep-navy/70 mb-2 block">Start Time</Label>
              <Input
                type="time"
                value={preferences.quietHoursStart}
                onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm text-deep-navy/70 mb-2 block">End Time</Label>
              <Input
                type="time"
                value={preferences.quietHoursEnd}
                onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
