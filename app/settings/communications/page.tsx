"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MessageSquare, Clock, Bell, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";

export default function CommunicationPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState({
    sms_enabled: true,
    voice_enabled: true,
    preferred_method: "sms",
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
    emergency_override: true,
    phone_number: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", user.id)
        .single();

      const { data: prefs } = await supabase
        .from("communication_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prefs) {
        setPreferences({
          sms_enabled: prefs.sms_enabled,
          voice_enabled: prefs.voice_enabled,
          preferred_method: prefs.preferred_method,
          quiet_hours_start: prefs.quiet_hours_start || "22:00",
          quiet_hours_end: prefs.quiet_hours_end || "08:00",
          emergency_override: prefs.emergency_override,
          phone_number: prefs.phone_number || userProfile?.phone_number || "",
        });
      } else if (userProfile?.phone_number) {
        setPreferences((prev) => ({
          ...prev,
          phone_number: userProfile.phone_number,
        }));
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("communication_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <p className="text-slate-600">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Communication Preferences</h1>
          <p className="text-slate-600">Manage how you receive SMS and voice notifications</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Your phone number for receiving SMS and voice communications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="+44XXXXXXXXXX"
                  value={preferences.phone_number}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, phone_number: e.target.value }))
                  }
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter your phone number in international format
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Methods</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">SMS Messages</p>
                    <p className="text-sm text-slate-600">Receive text message notifications</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.sms_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, sms_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Voice Calls</p>
                    <p className="text-sm text-slate-600">Receive voice call reminders</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.voice_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, voice_enabled: checked }))
                  }
                />
              </div>

              <div>
                <Label>Preferred Method</Label>
                <Select
                  value={preferences.preferred_method}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({ ...prev, preferred_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS (Text Messages)</SelectItem>
                    <SelectItem value="voice">Voice (Phone Calls)</SelectItem>
                    <SelectItem value="both">Both SMS and Voice</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Your preferred communication method for routine notifications
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive non-urgent notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, quiet_hours_start: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, quiet_hours_end: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Emergency Override</p>
                    <p className="text-sm text-slate-600">
                      Allow urgent notifications during quiet hours
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emergency_override}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, emergency_override: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {saved && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your communication preferences have been saved successfully!
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
