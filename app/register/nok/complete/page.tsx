'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NoKCompletePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState('');
  const [elderName, setElderName] = useState('');
  const [nokName, setNokName] = useState('');

  useEffect(() => {
    async function completeRegistration() {
      try {
        const nokData = sessionStorage.getItem('nokRegistrationData');
        const elderData = sessionStorage.getItem('elderRegistrationData');
        const guardianConsent = sessionStorage.getItem('guardianConsentGiven');
        const consentNotes = sessionStorage.getItem('guardianConsentNotes');

        if (!nokData || !elderData || !guardianConsent) {
          router.push('/register/nok');
          return;
        }

        const nok = JSON.parse(nokData);
        const elder = JSON.parse(elderData);
        setElderName(elder.name);
        setNokName(nok.name);

        const elderEmail = elder.email || `${nok.email.split('@')[0]}-elder@gracecompanion.temp`;

        const { data: nokUser, error: nokInsertError } = await supabase
          .from('users')
          .insert({
            name: nok.name,
            email: nok.email,
            role: 'nok',
            timezone: elder.timezone,
            consent_on: guardianConsent,
          })
          .select()
          .maybeSingle();

        if (nokInsertError && !nokInsertError.message.includes('duplicate')) {
          throw nokInsertError;
        }

        const nokId = nokUser?.id || (await supabase
          .from('users')
          .select('id')
          .eq('email', nok.email)
          .single()).data?.id;

        const { data: elderUser, error: elderInsertError } = await supabase
          .from('users')
          .insert({
            name: elder.name,
            email: elderEmail,
            role: 'elder',
            timezone: elder.timezone,
            registered_by_nok: true,
            guardian_consent_on: guardianConsent,
            guardian_consent_doc: consentNotes || null,
          })
          .select()
          .single();

        if (elderInsertError) throw elderInsertError;

        const { error: relationshipError } = await supabase
          .from('elder_nok_relationships')
          .insert({
            elder_id: elderUser.id,
            nok_id: nokId,
            relationship_type: nok.relationship,
            is_primary_contact: true,
            can_modify_settings: true,
          });

        if (relationshipError) {
          console.error('Relationship creation error:', relationshipError);
        }

        sessionStorage.removeItem('nokRegistrationData');
        sessionStorage.removeItem('elderRegistrationData');
        sessionStorage.removeItem('guardianConsentGiven');
        sessionStorage.removeItem('guardianConsentNotes');

        setSaving(false);
      } catch (err) {
        console.error('Registration error:', err);
        setError(err instanceof Error ? err.message : 'Failed to complete registration');
        setSaving(false);
      }
    }

    completeRegistration();
  }, [router]);

  if (saving) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
        <Card className="bg-white rounded-[24px] shadow-lg p-12 text-center">
          <div className="animate-pulse">
            <p className="text-2xl text-deep-navy">Creating accounts...</p>
          </div>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
        <Card className="bg-white rounded-[24px] shadow-lg p-12 text-center max-w-2xl">
          <div className="w-32 h-32 bg-coral-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-6xl">⚠️</span>
          </div>
          <h1 className="text-3xl font-bold text-deep-navy mb-4">
            Something Went Wrong
          </h1>
          <p className="text-lg text-deep-navy/70 mb-8">{error}</p>
          <Button
            onClick={() => router.push('/register/nok')}
            className="h-14 text-xl font-semibold rounded-[24px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md px-12"
          >
            Try Again
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <Card className="bg-white rounded-[24px] shadow-lg p-12 text-center">
          <div className="w-32 h-32 bg-mint-green rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-gentle">
            <Heart className="w-20 h-20 text-white fill-white" strokeWidth={0} />
          </div>

          <h1 className="text-4xl font-bold text-deep-navy mb-4">
            Registration Complete!
          </h1>

          <p className="text-xl text-deep-navy/70 mb-8 leading-relaxed">
            You've successfully set up Grace Companion for {elderName}. The account is ready
            to provide personalized care and support.
          </p>

          <div className="bg-sky-blue/20 rounded-[20px] p-6 mb-8">
            <h2 className="text-2xl font-semibold text-deep-navy mb-4">
              What Happens Next?
            </h2>
            <ul className="text-left space-y-3 text-lg text-deep-navy/80">
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" strokeWidth={2.5} />
                <span>Set up daily reminders and care tasks</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" strokeWidth={2.5} />
                <span>Add additional family members as secondary contacts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" strokeWidth={2.5} />
                <span>Introduce {elderName} to their Grace Companion</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" strokeWidth={2.5} />
                <span>Receive notifications and alerts as primary contact</span>
              </li>
            </ul>
          </div>

          <div className="bg-warm-cream rounded-[20px] p-6 mb-8">
            <p className="text-lg text-deep-navy/80 leading-relaxed">
              <strong>Important:</strong> As the primary guardian, you'll have full access to
              manage settings, view conversation transcripts, and receive emergency notifications.
              You can access the dashboard at any time.
            </p>
          </div>

          <Button
            onClick={() => router.push('/')}
            className="w-full h-16 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    </main>
  );
}
