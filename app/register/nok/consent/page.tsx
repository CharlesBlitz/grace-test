'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function NoKConsentPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [guardianAgreed, setGuardianAgreed] = useState(false);
  const [consentNotes, setConsentNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!agreed || !guardianAgreed) return;

    setLoading(true);
    const nokData = sessionStorage.getItem('nokRegistrationData');
    const elderData = sessionStorage.getItem('elderRegistrationData');

    if (!nokData || !elderData) {
      router.push('/register/nok');
      return;
    }

    sessionStorage.setItem('guardianConsentGiven', new Date().toISOString());
    sessionStorage.setItem('guardianConsentNotes', consentNotes);
    router.push('/register/nok/voice-setup');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
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

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-sky-blue rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-deep-navy mb-2">
              Guardian Consent & Authorization
            </h1>
            <p className="text-lg text-deep-navy/70">
              Please review and provide consent on behalf of your loved one
            </p>
          </div>

          <Card className="bg-warm-cream rounded-[20px] p-6 mb-8">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6 text-deep-navy">
                <section>
                  <h2 className="text-2xl font-semibold mb-3">1. Guardian Authorization</h2>
                  <p className="text-lg leading-relaxed">
                    By registering on behalf of another person, you affirm that you have the legal
                    authority to make decisions regarding their healthcare, daily care, and use of
                    assistive technology services. This may include being a legal guardian, healthcare
                    proxy holder, or family member with documented power of attorney.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">2. Service Overview</h2>
                  <p className="text-lg leading-relaxed">
                    Grace Companion provides personalized care reminders, conversation monitoring,
                    and family connectivity for individuals with cognitive impairments or dementia.
                    The service involves AI-powered features including voice synthesis, sentiment
                    analysis, and automated notifications.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">3. Data Collection on Behalf of Elder</h2>
                  <p className="text-lg leading-relaxed mb-3">
                    You consent to the collection and processing of the following data about the
                    person you are registering:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>Personal information (name, contact details, timezone)</li>
                    <li>Voice recordings and conversations with the AI companion</li>
                    <li>Health-related information mentioned in conversations</li>
                    <li>Task completion and daily activity patterns</li>
                    <li>Sentiment analysis and behavioral indicators</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">4. Family Voice Synthesis</h2>
                  <p className="text-lg leading-relaxed">
                    You may provide voice recordings that will be processed by ElevenLabs to create
                    synthetic voice profiles. These voices will be used to deliver reminders and messages
                    to the elder in familiar family voices. You consent to the processing and storage of
                    these voice recordings.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">5. Emergency Notifications</h2>
                  <p className="text-lg leading-relaxed">
                    As the registered guardian, you will receive notifications when:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>The elder requests help or mentions distressing keywords</li>
                    <li>Unusual behavioral patterns are detected</li>
                    <li>Tasks or medications are missed repeatedly</li>
                    <li>System detects potential health concerns</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">6. Your Responsibilities</h2>
                  <p className="text-lg leading-relaxed mb-3">
                    As the guardian registering this account, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>Act in the best interests of the elder at all times</li>
                    <li>Inform the elder about the service to the extent they can understand</li>
                    <li>Monitor notifications and respond to alerts appropriately</li>
                    <li>Update information and preferences as the elder's needs change</li>
                    <li>Coordinate with other family members and healthcare providers</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">7. Access and Control</h2>
                  <p className="text-lg leading-relaxed">
                    You will have full access to view conversation transcripts, modify settings, and
                    manage the elder's account. You can add additional family members as secondary
                    contacts with appropriate permission levels.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">8. Service Limitations</h2>
                  <p className="text-lg leading-relaxed">
                    Grace Companion is NOT a medical device, emergency response system, or substitute
                    for professional healthcare. It is a supportive tool designed to enhance daily care.
                    Always consult healthcare professionals for medical decisions.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">9. Right to Withdraw</h2>
                  <p className="text-lg leading-relaxed">
                    You may discontinue the service and request deletion of all data at any time.
                    The elder or any co-guardian may also request account termination.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-3">10. Documentation</h2>
                  <p className="text-lg leading-relaxed">
                    Please provide any relevant documentation of your guardianship or authority in
                    the notes section below. While not required for registration, this helps establish
                    proper authorization and may be needed for certain features or in case of disputes.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </Card>

          <div className="space-y-6 mb-8">
            <div>
              <Label htmlFor="consent-notes" className="text-lg text-deep-navy mb-2 block">
                Authorization Notes (Optional)
              </Label>
              <Textarea
                id="consent-notes"
                value={consentNotes}
                onChange={(e) => setConsentNotes(e.target.value)}
                placeholder="Example: I have legal guardianship established by court order dated MM/DD/YYYY, or I hold durable power of attorney for healthcare..."
                className="min-h-[120px] text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
              />
            </div>

            <div className="flex items-start gap-4 p-6 bg-sky-blue/20 rounded-[20px]">
              <Checkbox
                id="guardian-consent"
                checked={guardianAgreed}
                onCheckedChange={(checked) => setGuardianAgreed(checked === true)}
                className="mt-1 h-6 w-6"
              />
              <label
                htmlFor="guardian-consent"
                className="text-lg text-deep-navy leading-relaxed cursor-pointer"
              >
                I affirm that I have the legal authority to register this person and consent to
                services on their behalf. I have read and understood all terms above.
              </label>
            </div>

            <div className="flex items-start gap-4 p-6 bg-mint-green/20 rounded-[20px]">
              <Checkbox
                id="elder-consent"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1 h-6 w-6"
              />
              <label
                htmlFor="elder-consent"
                className="text-lg text-deep-navy leading-relaxed cursor-pointer"
              >
                I consent on behalf of the elder to the collection, processing, and storage of their
                personal data as described above. I understand this consent can be withdrawn at any time.
              </label>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!agreed || !guardianAgreed || loading}
            className="w-full h-14 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'I Agree - Continue'}
          </Button>
        </Card>
      </div>
    </main>
  );
}
