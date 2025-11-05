'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CompletePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function completeRegistration() {
      try {
        const registrationData = sessionStorage.getItem('registrationData');
        const consentGiven = sessionStorage.getItem('consentGiven');

        if (!registrationData || !consentGiven) {
          router.push('/register');
          return;
        }

        const userData = JSON.parse(registrationData);
        setUserName(userData.name);

        const { data, error: insertError } = await supabase
          .from('users')
          .insert({
            name: userData.name,
            email: userData.email,
            role: 'elder',
            timezone: userData.timezone,
            consent_on: consentGiven,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        sessionStorage.removeItem('registrationData');
        sessionStorage.removeItem('consentGiven');

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
            <p className="text-2xl text-deep-navy">Setting up your account...</p>
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
            onClick={() => router.push('/register')}
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
            <Check className="w-20 h-20 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-4xl font-bold text-deep-navy mb-4">
            Welcome, {userName}!
          </h1>

          <p className="text-xl text-deep-navy/70 mb-8 leading-relaxed">
            Your Grace Companion account is ready. We're here to support you every day
            with personalized reminders, friendly conversations, and connections to your loved ones.
          </p>

          <div className="bg-sky-blue/20 rounded-[20px] p-6 mb-8">
            <h2 className="text-2xl font-semibold text-deep-navy mb-4">
              What's Next?
            </h2>
            <ul className="text-left space-y-3 text-lg text-deep-navy/80">
              <li className="flex items-start gap-3">
                <span className="text-mint-green text-2xl">✓</span>
                <span>Start a conversation anytime you need someone to talk to</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mint-green text-2xl">✓</span>
                <span>Check your daily reminders and tasks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mint-green text-2xl">✓</span>
                <span>Stay connected with messages from your family</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mint-green text-2xl">✓</span>
                <span>Use the Help button anytime you need assistance</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={() => router.push('/')}
            className="w-full h-16 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
          >
            Get Started
          </Button>
        </Card>
      </div>
    </main>
  );
}
