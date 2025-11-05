'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { NotificationPreferences } from '@/components/NotificationPreferences';

interface Elder {
  id: string;
  name: string;
}

export default function NOKSettingsPage() {
  const { profile } = useAuth();
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchElders();
    }
  }, [profile]);

  const fetchElders = async () => {
    try {
      const { data: relationships } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', profile?.id);

      if (relationships && relationships.length > 0) {
        const elderIds = relationships.map((r) => r.elder_id);
        const { data: eldersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', elderIds);

        if (eldersData && eldersData.length > 0) {
          setElders(eldersData);
          setSelectedElder(eldersData[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching elders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
      </main>
    );
  }

  if (elders.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-12 text-center">
            <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-deep-navy/40" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-deep-navy mb-2">No Elder Accounts Linked</h1>
            <p className="text-body text-deep-navy/70 mb-6">
              You haven't been linked to any elder accounts yet.
            </p>
            <Link href="/nok-dashboard">
              <Button className="bg-mint-green hover:bg-mint-green/90 text-deep-navy">
                Back to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/nok-dashboard">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Settings
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            Manage your notification preferences
          </p>
        </Card>

        {elders.length > 1 && (
          <Card className="bg-white rounded-[20px] shadow-md p-6 mb-6">
            <Label className="text-deep-navy font-semibold mb-3 block">Select Elder</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {elders.map((elder) => (
                <Button
                  key={elder.id}
                  onClick={() => setSelectedElder(elder)}
                  variant={selectedElder?.id === elder.id ? 'default' : 'outline'}
                  className="justify-start h-auto py-4 px-6 rounded-[16px]"
                >
                  <div className="text-left">
                    <p className="font-semibold">{elder.name}</p>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}

        {selectedElder && profile?.id && (
          <NotificationPreferences nokId={profile.id} elderId={selectedElder.id} />
        )}
      </div>
    </main>
  );
}
