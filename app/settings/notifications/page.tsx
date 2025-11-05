'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, BellOff, Moon, Vibrate, Volume2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  showLocalNotification,
  createMedicationNotification,
} from '@/lib/pushNotifications';
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt';

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const [preferences, setPreferences] = useState({
    medication_reminders: true,
    wellness_checkins: true,
    family_messages: true,
    emergency_alerts: true,
    incident_alerts: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    vibration_enabled: true,
    vibration_intensity: 'medium' as 'gentle' | 'medium' | 'strong',
    notification_sound: 'default',
  });

  useEffect(() => {
    if (!user) return;

    const checkSupport = isPushNotificationSupported();
    setSupported(checkSupport);

    if (checkSupport) {
      setPermission(getNotificationPermission());
    }

    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const prefs = await getNotificationPreferences(user.id);
      if (prefs) {
        setPreferences({
          medication_reminders: prefs.medication_reminders,
          wellness_checkins: prefs.wellness_checkins,
          family_messages: prefs.family_messages,
          emergency_alerts: prefs.emergency_alerts,
          incident_alerts: prefs.incident_alerts,
          quiet_hours_enabled: prefs.quiet_hours_enabled,
          quiet_hours_start: prefs.quiet_hours_start || '22:00',
          quiet_hours_end: prefs.quiet_hours_end || '08:00',
          vibration_enabled: prefs.vibration_enabled,
          vibration_intensity: prefs.vibration_intensity || 'medium',
          notification_sound: prefs.notification_sound || 'default',
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!user) return;

    try {
      const result = await requestNotificationPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeToPushNotifications(user.id);
        toast.success('Notifications enabled! You\'ll now receive alerts and reminders');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const handleDisableNotifications = async () => {
    if (!user) return;

    try {
      await unsubscribeFromPushNotifications(user.id);
      toast.success('Notifications disabled. You will no longer receive push notifications');
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateNotificationPreferences(user.id, preferences);
      toast.success('Settings saved. Your notification preferences have been updated');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    const { title, options } = createMedicationNotification(
      'Test Medication',
      '1 tablet',
      'test-123',
      preferences.vibration_intensity
    );

    await showLocalNotification(title, options);

    toast.success('Test notification sent. Check your notifications');
  };

  const updatePreference = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/settings">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              <div>
                <CardTitle className="text-3xl">Notification Settings</CardTitle>
                <CardDescription className="text-lg">
                  Manage how and when you receive notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!supported && (
          <Card className="bg-coral-red/10 border-coral-red/30 rounded-[20px] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <BellOff className="w-6 h-6 text-coral-red" strokeWidth={1.5} />
                <div>
                  <p className="font-semibold text-deep-navy">
                    Notifications Not Supported
                  </p>
                  <p className="text-sm text-deep-navy/70">
                    Your browser doesn't support push notifications
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {supported && permission !== 'granted' && (
          <Card className="bg-sky-blue/10 border-sky-blue/30 rounded-[20px] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                  <div>
                    <p className="font-semibold text-deep-navy">
                      Enable Push Notifications
                    </p>
                    <p className="text-sm text-deep-navy/70">
                      Get medication reminders and important alerts
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleEnableNotifications}
                  className="bg-sky-blue hover:bg-sky-blue/90 text-white rounded-[12px]"
                >
                  <Bell className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {permission === 'granted' && (
          <Card className="bg-mint-green/10 border-mint-green/30 rounded-[20px] mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                  <div>
                    <p className="font-semibold text-deep-navy">
                      Notifications Enabled
                    </p>
                    <p className="text-sm text-deep-navy/70">
                      You're receiving push notifications
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleTestNotification}
                    variant="outline"
                    className="rounded-[12px]"
                  >
                    Test
                  </Button>
                  <Button
                    onClick={handleDisableNotifications}
                    variant="outline"
                    className="rounded-[12px] text-coral-red hover:bg-coral-red/10"
                  >
                    Disable
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Notification Types</CardTitle>
              <CardDescription>Choose which notifications to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-[12px] hover:bg-soft-gray/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💊</span>
                  <div>
                    <Label htmlFor="medication" className="text-lg font-semibold cursor-pointer">
                      Medication Reminders
                    </Label>
                    <p className="text-sm text-deep-navy/70">
                      Alerts for scheduled medications
                    </p>
                  </div>
                </div>
                <Switch
                  id="medication"
                  checked={preferences.medication_reminders}
                  onCheckedChange={(checked) => updatePreference('medication_reminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-[12px] hover:bg-soft-gray/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">❤️</span>
                  <div>
                    <Label htmlFor="wellness" className="text-lg font-semibold cursor-pointer">
                      Wellness Check-Ins
                    </Label>
                    <p className="text-sm text-deep-navy/70">
                      Daily reminders to log how you feel
                    </p>
                  </div>
                </div>
                <Switch
                  id="wellness"
                  checked={preferences.wellness_checkins}
                  onCheckedChange={(checked) => updatePreference('wellness_checkins', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-[12px] hover:bg-soft-gray/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <Label htmlFor="messages" className="text-lg font-semibold cursor-pointer">
                      Family Messages
                    </Label>
                    <p className="text-sm text-deep-navy/70">
                      New messages from family members
                    </p>
                  </div>
                </div>
                <Switch
                  id="messages"
                  checked={preferences.family_messages}
                  onCheckedChange={(checked) => updatePreference('family_messages', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-[12px] hover:bg-soft-gray/20 bg-coral-red/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <Label htmlFor="emergency" className="text-lg font-semibold cursor-pointer">
                      Emergency Alerts
                    </Label>
                    <p className="text-sm text-deep-navy/70">
                      Critical alerts (cannot be disabled)
                    </p>
                  </div>
                </div>
                <Switch
                  id="emergency"
                  checked={preferences.emergency_alerts}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Moon className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Quiet Hours</CardTitle>
              </div>
              <CardDescription>Pause non-urgent notifications during certain times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet" className="text-lg">Enable Quiet Hours</Label>
                <Switch
                  id="quiet"
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-soft-gray/10 rounded-[12px]">
                  <div>
                    <Label className="text-sm mb-2 block">Start Time</Label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                      className="w-full p-2 rounded-[8px] border border-soft-gray"
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">End Time</Label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                      className="w-full p-2 rounded-[8px] border border-soft-gray"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Vibrate className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Vibration</CardTitle>
              </div>
              <CardDescription>Customize vibration patterns for alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="vibration" className="text-lg">Enable Vibration</Label>
                <Switch
                  id="vibration"
                  checked={preferences.vibration_enabled}
                  onCheckedChange={(checked) => updatePreference('vibration_enabled', checked)}
                />
              </div>

              {preferences.vibration_enabled && (
                <div>
                  <Label className="text-sm mb-2 block">Vibration Intensity</Label>
                  <Select
                    value={preferences.vibration_intensity}
                    onValueChange={(value) => updatePreference('vibration_intensity', value)}
                  >
                    <SelectTrigger className="rounded-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gentle">Gentle - Single short pulse</SelectItem>
                      <SelectItem value="medium">Medium - Double pulse (recommended)</SelectItem>
                      <SelectItem value="strong">Strong - Triple pulse with pauses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full h-16 text-xl rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>

      {showPermissionPrompt && (
        <NotificationPermissionPrompt
          onPermissionGranted={() => {
            setShowPermissionPrompt(false);
            setPermission('granted');
          }}
          onDismiss={() => setShowPermissionPrompt(false)}
        />
      )}
    </main>
  );
}
