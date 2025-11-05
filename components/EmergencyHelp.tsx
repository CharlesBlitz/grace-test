'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { Heart, Phone, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyHelpProps {
  autoLocationSharing?: boolean;
}

export default function EmergencyHelp({ autoLocationSharing = true }: EmergencyHelpProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);

  const getLocation = async () => {
    if (!autoLocationSharing || !navigator.geolocation) {
      return null;
    }

    return new Promise<GeolocationPosition | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          resolve(position);
        },
        (error) => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const handleEmergency = async () => {
    setShowConfirm(true);
  };

  const confirmEmergency = async () => {
    setRequesting(true);
    try {
      const locationData = await getLocation();

      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('nok_id')
        .eq('elder_id', profile?.id);

      const nokIds = relationships?.map(r => r.nok_id) || [];

      const { data: request, error } = await supabase
        .from('emergency_requests')
        .insert({
          elder_id: profile?.id,
          request_type: 'help',
          urgency_level: 'high',
          location_latitude: locationData?.coords.latitude || null,
          location_longitude: locationData?.coords.longitude || null,
          location_accuracy_meters: locationData?.coords.accuracy || null,
          location_description: locationData ? `Lat: ${locationData.coords.latitude.toFixed(6)}, Lon: ${locationData.coords.longitude.toFixed(6)}` : 'Location unavailable',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      const { data: escalationContacts } = await supabase
        .from('escalation_contacts')
        .select('*')
        .eq('elder_id', profile?.id)
        .eq('active', true)
        .order('priority_order', { ascending: true });

      if (escalationContacts && escalationContacts.length > 0) {
        for (const contact of escalationContacts) {
          if (contact.notification_methods.includes('sms') && contact.phone_number) {
            await supabase.from('notification_log').insert({
              elder_id: profile?.id,
              notification_type: 'escalation',
              delivery_method: 'sms',
              recipient: contact.phone_number,
              message_content: `EMERGENCY: ${profile?.name} has requested help. ${locationData ? `Location: ${locationData.coords.latitude.toFixed(6)}, ${locationData.coords.longitude.toFixed(6)}` : 'Location unavailable'}`,
              status: 'pending',
            });
          }

          if (contact.notification_methods.includes('call') && contact.phone_number) {
            await supabase.from('notification_log').insert({
              elder_id: profile?.id,
              notification_type: 'escalation',
              delivery_method: 'call',
              recipient: contact.phone_number,
              message_content: `Emergency call from ${profile?.name}`,
              status: 'pending',
            });
          }
        }
      }

      await supabase
        .from('activity_log')
        .insert({
          elder_id: profile?.id,
          activity_type: 'emergency',
          activity_title: 'Emergency Help Requested',
          activity_description: 'Help button pressed',
          completed_at: new Date().toISOString(),
          icon: 'alert',
          color: 'coral-red',
        });

      toast({
        title: 'Help is on the way!',
        description: 'Your family has been notified',
      });

      setShowConfirm(false);
    } catch (error: any) {
      toast({
        title: 'Error requesting help',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleEmergency}
        size="lg"
        className="w-20 h-20 rounded-full bg-coral-red hover:bg-coral-red/90 text-white shadow-2xl animate-pulse-gentle transition-all duration-200 hover:scale-110 focus:ring-4 focus:ring-coral-red/50"
        aria-label="Emergency help - contact your family now"
      >
        <Heart className="w-10 h-10" strokeWidth={1.5} fill="currentColor" />
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-coral-red" />
              Need Help?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Alert className="bg-coral-red/10 border-coral-red">
              <Phone className="w-5 h-5" />
              <AlertDescription className="text-lg">
                Your family will be contacted immediately
              </AlertDescription>
            </Alert>

            {autoLocationSharing && (
              <Alert className="bg-sky-blue/10 border-sky-blue">
                <MapPin className="w-5 h-5" />
                <AlertDescription>
                  Your location will be shared to help them find you quickly
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={confirmEmergency}
                disabled={requesting}
                size="lg"
                className="h-16 text-xl rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white font-semibold"
              >
                {requesting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Contacting Family...
                  </>
                ) : (
                  <>
                    <Phone className="w-6 h-6 mr-2" />
                    Yes, I Need Help Now
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowConfirm(false)}
                disabled={requesting}
                size="lg"
                variant="outline"
                className="h-14 text-lg rounded-[16px]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
