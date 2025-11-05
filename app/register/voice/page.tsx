'use client';

import { useRouter } from 'next/navigation';
import VoiceConversation from '@/components/VoiceConversation';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceRegisterPage() {
  const router = useRouter();

  const handleComplete = (data: any) => {
    sessionStorage.setItem('registrationData', JSON.stringify(data));
    router.push('/register/consent');
  };

  const handleCancel = () => {
    router.push('/register');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/register">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20 flex items-center gap-2"
              aria-label="Return to home page"
            >
              <Home className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Home</span>
            </Button>
          </Link>
        </div>

        <VoiceConversation
          registrationType="elder"
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </main>
  );
}
