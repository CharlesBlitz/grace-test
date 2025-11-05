'use client';

import { useRouter } from 'next/navigation';
import VoiceConversation from '@/components/VoiceConversation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NoKVoiceRegisterPage() {
  const router = useRouter();

  const handleComplete = (data: any) => {
    sessionStorage.setItem('nokRegistrationData', JSON.stringify({
      name: data.name,
      email: data.email,
      relationship: data.relationship,
      phone: data.phone || '',
    }));

    sessionStorage.setItem('elderRegistrationData', JSON.stringify({
      name: data.elderName,
      email: data.elderEmail || '',
      timezone: data.elderTimezone || data.timezone,
    }));

    sessionStorage.setItem('registrationMethod', 'nok-assisted');
    router.push('/register/nok/consent');
  };

  const handleCancel = () => {
    router.push('/register/nok');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/register/nok">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <VoiceConversation
          registrationType="nok"
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </main>
  );
}
