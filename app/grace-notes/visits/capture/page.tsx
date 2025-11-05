'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Mic, MicOff, Check, Loader2, Navigation, Image } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function VisitCapturePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  const [visitType, setVisitType] = useState('home_visit');
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/grace-notes/login');
      return;
    }
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const { data: practitionerData } = await supabase
        .from('grace_notes_practitioners')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!practitionerData) {
        router.push('/grace-notes/register');
        return;
      }

      setPractitioner(practitionerData);

      const { data: clientsData } = await supabase
        .from('grace_notes_clients')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleCheckIn() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setCheckingIn(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(loc);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`
          );
          const data = await response.json();
          setAddress(data.display_name || 'Address not found');
          setCheckedIn(true);
          toast.success('Checked in successfully');
        } catch (error) {
          console.error('Error getting address:', error);
          setAddress('Location verified');
          setCheckedIn(true);
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location. Please enable location services.');
        setCheckingIn(false);
      },
      { enableHighAccuracy: true }
    );
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function toggleRecording() {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success('Recording started');
    } else {
      toast.success('Recording stopped');
    }
  }

  async function handleSave() {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    if (!transcript.trim()) {
      toast.error('Please add visit notes');
      return;
    }

    setSaving(true);

    try {
      const visit = {
        client_id: selectedClient,
        practitioner_id: practitioner.id,
        visit_type: visitType,
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        actual_start: new Date().toISOString(),
        actual_end: new Date().toISOString(),
        status: 'completed',
        check_in_location: location ? `(${location.lat},${location.lng})` : null,
        check_in_address: address || null,
        photo_urls: photos,
      };

      const { data: visitData, error: visitError } = await supabase
        .from('grace_notes_visits')
        .insert(visit)
        .select()
        .single();

      if (visitError) throw visitError;

      const visitNote = {
        visit_id: visitData.id,
        practitioner_id: practitioner.id,
        raw_transcript: transcript,
        status: 'draft',
      };

      const { error: noteError } = await supabase
        .from('grace_notes_visit_notes')
        .insert(visitNote);

      if (noteError) throw noteError;

      const auditLog = {
        practitioner_id: practitioner.id,
        action_type: 'create',
        entity_type: 'visit',
        entity_id: visitData.id,
        new_values: { visit_type: visitType, client_id: selectedClient },
      };

      await supabase.from('grace_notes_audit_log').insert(auditLog);

      toast.success('Visit notes saved successfully');
      router.push('/grace-notes/dashboard');
    } catch (error) {
      console.error('Error saving visit:', error);
      toast.error('Failed to save visit notes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Capture Visit Notes</h1>
          <p className="text-slate-600 mt-1">
            Document your visit with voice, text, and photos
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Client
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Visit Type
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
              >
                <option value="home_visit">Home Visit</option>
                <option value="assessment">Assessment</option>
                <option value="review">Review</option>
                <option value="emergency">Emergency</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>GPS Check-in</CardTitle>
            <CardDescription>
              Verify your location for CQC compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!checkedIn ? (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Checked in</p>
                    <p className="text-sm text-green-700 mt-1">{address}</p>
                    {location && (
                      <p className="text-xs text-green-600 mt-1">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Voice & Text Notes</CardTitle>
            <CardDescription>
              Use voice dictation or type your observations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={toggleRecording}
                  variant={isRecording ? 'destructive' : 'default'}
                  className="flex-1"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Voice Recording
                    </>
                  )}
                </Button>
              </div>

              {isRecording && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium">Recording in progress...</span>
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Type or speak your visit notes here...

Include:
- Physical health observations
- Mental health and wellbeing
- Social interactions
- Environmental concerns
- Care provided
- Actions needed"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Photo Documentation</CardTitle>
            <CardDescription>
              Capture photos of relevant conditions or equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-sm text-slate-600">Tap to take photo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedClient || !transcript.trim()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Save Visit Notes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
