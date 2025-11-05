'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Settings as SettingsIcon, Volume2, Eye, Bell, Shield, Palette, Fingerprint, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ElderSettings {
  font_size: string;
  voice_speed: number;
  contrast_mode: string;
  enable_voice_control: boolean;
  enable_screen_reader: boolean;
  reminder_sound: string;
  vibration_enabled: boolean;
  notification_volume: number;
  preferred_language: string;
  time_format: string;
  date_format: string;
  emergency_button_enabled: boolean;
  auto_location_sharing: boolean;
  theme: string;
  reduce_motion: boolean;
  large_buttons: boolean;
}

export default function ElderSettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ElderSettings>({
    font_size: 'large',
    voice_speed: 1.0,
    contrast_mode: 'normal',
    enable_voice_control: true,
    enable_screen_reader: false,
    reminder_sound: 'gentle',
    vibration_enabled: true,
    notification_volume: 80,
    preferred_language: 'en',
    time_format: '12h',
    date_format: 'MDY',
    emergency_button_enabled: true,
    auto_location_sharing: true,
    theme: 'light',
    reduce_motion: false,
    large_buttons: true,
  });

  useEffect(() => {
    if (profile?.id) {
      loadSettings();
    }
  }, [profile]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('elder_settings')
        .select('*')
        .eq('elder_id', profile?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          font_size: data.font_size,
          voice_speed: data.voice_speed,
          contrast_mode: data.contrast_mode,
          enable_voice_control: data.enable_voice_control,
          enable_screen_reader: data.enable_screen_reader,
          reminder_sound: data.reminder_sound,
          vibration_enabled: data.vibration_enabled,
          notification_volume: data.notification_volume,
          preferred_language: data.preferred_language,
          time_format: data.time_format,
          date_format: data.date_format,
          emergency_button_enabled: data.emergency_button_enabled,
          auto_location_sharing: data.auto_location_sharing,
          theme: data.theme,
          reduce_motion: data.reduce_motion,
          large_buttons: data.large_buttons,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('elder_settings')
        .upsert({
          elder_id: profile?.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Settings saved. Your preferences have been updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-2xl text-deep-navy">Loading settings...</div>
      </main>
    );
  }

  const fontSize = settings.font_size === 'extra_large' ? 'text-2xl' : settings.font_size === 'large' ? 'text-xl' : 'text-base';

  return (
    <main className={`min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 ${fontSize}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size={settings.large_buttons ? 'lg' : 'default'} className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              <CardTitle className="text-3xl">My Settings</CardTitle>
            </div>
            <CardDescription className={fontSize}>Customize how Grace works for you</CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <Card
            className="bg-white rounded-[20px] shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push('/settings/biometric')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-sky-blue/20 flex items-center justify-center">
                    <Fingerprint className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-deep-navy">Biometric Security</h3>
                    <p className="text-base text-deep-navy/60">Fingerprint & Face ID login</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-deep-navy/40" strokeWidth={1.5} />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white rounded-[20px] shadow-md ${settings.contrast_mode === 'high' ? 'border-4 border-deep-navy' : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Display & Accessibility</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="font-size" className="text-lg font-semibold mb-3 block">Text Size</Label>
                <Select value={settings.font_size} onValueChange={(value) => setSettings({ ...settings, font_size: value })}>
                  <SelectTrigger className={`h-16 ${settings.large_buttons ? 'text-xl' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal" className="text-lg py-4">Normal</SelectItem>
                    <SelectItem value="large" className="text-xl py-4">Large</SelectItem>
                    <SelectItem value="extra_large" className="text-2xl py-4">Extra Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contrast" className="text-lg font-semibold mb-3 block">Contrast Mode</Label>
                <Select value={settings.contrast_mode} onValueChange={(value) => setSettings({ ...settings, contrast_mode: value })}>
                  <SelectTrigger className={`h-16 ${settings.large_buttons ? 'text-xl' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal" className="text-lg py-4">Normal Contrast</SelectItem>
                    <SelectItem value="high" className="text-lg py-4">High Contrast</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="theme" className="text-lg font-semibold mb-3 block">Theme</Label>
                <Select value={settings.theme} onValueChange={(value) => setSettings({ ...settings, theme: value })}>
                  <SelectTrigger className={`h-16 ${settings.large_buttons ? 'text-xl' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light" className="text-lg py-4">Light</SelectItem>
                    <SelectItem value="dark" className="text-lg py-4">Dark</SelectItem>
                    <SelectItem value="auto" className="text-lg py-4">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-4 border-t">
                <div>
                  <Label className="text-lg font-semibold">Large Buttons</Label>
                  <p className="text-sm text-deep-navy/60">Easier to tap and see</p>
                </div>
                <Switch
                  checked={settings.large_buttons}
                  onCheckedChange={(checked) => setSettings({ ...settings, large_buttons: checked })}
                  className="scale-150"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-lg font-semibold">Reduce Motion</Label>
                  <p className="text-sm text-deep-navy/60">Minimize animations</p>
                </div>
                <Switch
                  checked={settings.reduce_motion}
                  onCheckedChange={(checked) => setSettings({ ...settings, reduce_motion: checked })}
                  className="scale-150"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-lg font-semibold">Screen Reader Support</Label>
                  <p className="text-sm text-deep-navy/60">Enhanced voice guidance</p>
                </div>
                <Switch
                  checked={settings.enable_screen_reader}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_screen_reader: checked })}
                  className="scale-150"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Volume2 className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Voice & Sound</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">Voice Speed: {settings.voice_speed.toFixed(1)}x</Label>
                <Slider
                  value={[settings.voice_speed]}
                  onValueChange={(value) => setSettings({ ...settings, voice_speed: value[0] })}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="py-4"
                />
                <div className="flex justify-between text-sm text-deep-navy/60 mt-2">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">Notification Volume: {settings.notification_volume}%</Label>
                <Slider
                  value={[settings.notification_volume]}
                  onValueChange={(value) => setSettings({ ...settings, notification_volume: value[0] })}
                  min={0}
                  max={100}
                  step={5}
                  className="py-4"
                />
                <div className="flex justify-between text-sm text-deep-navy/60 mt-2">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-t">
                <div>
                  <Label className="text-lg font-semibold">Voice Control</Label>
                  <p className="text-sm text-deep-navy/60">Talk to Grace hands-free</p>
                </div>
                <Switch
                  checked={settings.enable_voice_control}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_voice_control: checked })}
                  className="scale-150"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-lg font-semibold">Vibration</Label>
                  <p className="text-sm text-deep-navy/60">Feel notifications</p>
                </div>
                <Switch
                  checked={settings.vibration_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, vibration_enabled: checked })}
                  className="scale-150"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-coral-red" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Reminders</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="reminder-sound" className="text-lg font-semibold mb-3 block">Reminder Sound</Label>
                <Select value={settings.reminder_sound} onValueChange={(value) => setSettings({ ...settings, reminder_sound: value })}>
                  <SelectTrigger className={`h-16 ${settings.large_buttons ? 'text-xl' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle" className="text-lg py-4">Gentle Chime</SelectItem>
                    <SelectItem value="bell" className="text-lg py-4">Bell</SelectItem>
                    <SelectItem value="beep" className="text-lg py-4">Beep</SelectItem>
                    <SelectItem value="voice" className="text-lg py-4">Voice Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Emergency & Safety</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-lg font-semibold">Emergency Button</Label>
                  <p className="text-sm text-deep-navy/60">Show help button on home</p>
                </div>
                <Switch
                  checked={settings.emergency_button_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, emergency_button_enabled: checked })}
                  className="scale-150"
                />
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label className="text-lg font-semibold">Auto Location Sharing</Label>
                  <p className="text-sm text-deep-navy/60">Share location in emergencies</p>
                </div>
                <Switch
                  checked={settings.auto_location_sharing}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_location_sharing: checked })}
                  className="scale-150"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Palette className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                <CardTitle className="text-2xl">Language & Format</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="time-format" className="text-lg font-semibold mb-3 block">Time Format</Label>
                <Select value={settings.time_format} onValueChange={(value) => setSettings({ ...settings, time_format: value })}>
                  <SelectTrigger className={`h-16 ${settings.large_buttons ? 'text-xl' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h" className="text-lg py-4">12-hour (3:00 PM)</SelectItem>
                    <SelectItem value="24h" className="text-lg py-4">24-hour (15:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              size={settings.large_buttons ? 'lg' : 'default'}
              className={`flex-1 ${settings.large_buttons ? 'h-20 text-xl' : 'h-16 text-lg'} rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold`}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
