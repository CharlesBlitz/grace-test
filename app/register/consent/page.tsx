'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function ConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!agreed) return;

    setLoading(true);
    const registrationData = sessionStorage.getItem('registrationData');

    if (!registrationData) {
      router.push('/register');
      return;
    }

    sessionStorage.setItem('consentGiven', new Date().toISOString());
    router.push('/register/voice-setup');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/register">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back to registration"
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

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-deep-navy mb-2">
              Consent & Privacy
            </h1>
            <p className="text-lg text-deep-navy/70">
              Please review and accept our terms
            </p>
          </div>

          <Card className="bg-warm-cream rounded-[20px] p-6 mb-8">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6 text-deep-navy">
                <section>
                  <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
                  <p className="text-lg leading-relaxed">
                    Grace Companion is designed to support your daily wellbeing through personalized reminders,
                    conversations, and family connections. This service involves collecting and processing personal
                    information to provide you with care and support.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">2. Data Collection</h2>
                  <p className="text-lg leading-relaxed mb-3">
                    We collect the following information:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>Your name, email address, and timezone</li>
                    <li>Voice recordings from you and your family members</li>
                    <li>Conversation transcripts and sentiment analysis</li>
                    <li>Task completion and reminder interactions</li>
                    <li>Health-related keywords mentioned in conversations</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">3. Voice Data & AI Processing</h2>
                  <p className="text-lg leading-relaxed">
                    Family voice recordings are processed by ElevenLabs to create personalized voice profiles.
                    These profiles enable reminders and messages to be delivered in familiar voices. Original
                    recordings are stored securely and automatically deleted after 30 days.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">4. Emergency Notifications</h2>
                  <p className="text-lg leading-relaxed">
                    When certain keywords are detected or you request help, we will notify your designated
                    family members or caregivers. This is a safety feature designed to ensure you receive
                    timely assistance when needed.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
                  <p className="text-lg leading-relaxed">
                    All data is encrypted in transit and at rest. Access to your information is restricted
                    to you, your designated family members, and authorized caregivers only. We employ
                    industry-standard security measures to protect your privacy.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">6. Your Rights</h2>
                  <p className="text-lg leading-relaxed mb-3">
                    You have the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>Access all your personal data at any time</li>
                    <li>Request deletion of your account and all associated data</li>
                    <li>Export your data in a standard format</li>
                    <li>Withdraw consent and discontinue service</li>
                    <li>Update your information and preferences</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">7. Limitations</h2>
                  <p className="text-lg leading-relaxed">
                    Grace Companion is not a medical device and does not provide medical advice, diagnosis,
                    or treatment. The sentiment analysis and health keyword detection are supportive tools
                    only and should not replace professional medical care.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">8. Contact</h2>
                  <p className="text-lg leading-relaxed">
                    For questions about this consent or your privacy, please contact us at privacy@gracecompanion.com
                  </p>
                </section>
              </div>
            </ScrollArea>
          </Card>

          <div className="flex items-start gap-4 mb-8 p-6 bg-sky-blue/20 rounded-[20px]">
            <Checkbox
              id="consent"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-1 h-6 w-6"
            />
            <label
              htmlFor="consent"
              className="text-lg text-deep-navy leading-relaxed cursor-pointer"
            >
              I have read and understood the above information. I consent to the collection,
              processing, and storage of my personal data as described. I understand that I can
              withdraw this consent at any time.
            </label>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!agreed || loading}
            className="w-full h-14 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'I Agree - Continue'}
          </Button>
        </Card>
      </div>
    </main>
  );
}
