'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ElectronicSignature from '@/components/ElectronicSignature';
import VoiceSignature from '@/components/VoiceSignature';
import { Mic, PenTool, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SignConsentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const [consentData, setConsentData] = useState<any>(null);
  const [signatureMethod, setSignatureMethod] = useState<'electronic' | 'voice'>('electronic');

  useEffect(() => {
    // Load consent data from session storage
    const storedConsents = sessionStorage.getItem('gdpr_consents');
    const storedUserId = sessionStorage.getItem('temp_user_id');

    if (storedConsents) {
      setConsentData(JSON.parse(storedConsents));
    }

    if (storedUserId) {
      setUserId(storedUserId);
    }

    // In production, fetch the correct document ID from the database
    // For now, we'll use a placeholder
    setDocumentId('wellbeing-monitoring-v1');
  }, []);

  const handleSignatureComplete = (signatureId: string) => {
    // Store signature ID
    sessionStorage.setItem('consent_signature_id', signatureId);

    // Proceed to next step
    router.push('/register/voice-setup');
  };

  if (!consentData || !userId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="max-w-4xl mx-auto py-12 text-center">
          <p className="text-deep-navy/70 mb-4">Loading consent information...</p>
          <p className="text-sm text-deep-navy/50">
            If this takes too long, please{' '}
            <Link href="/register/consent/enhanced" className="text-sky-blue hover:underline">
              return to consent page
            </Link>
          </p>
        </div>
      </main>
    );
  }

  // Build consent statement based on selected options
  const consentStatement = `I, the undersigned, hereby consent to the following:

1. Grace Companion may store and use my personal information (name, email, timezone) to provide the service.

2. Grace Companion may record, store, and analyze my conversations for wellbeing monitoring and safety purposes.

3. Designated family members (Next of Kin) may view my conversation summaries and wellbeing status for care coordination.

4. My conversation data will be retained for ${consentData.retention_period_months} months, with conversations flagged for safeguarding purposes retained for up to 7 years as required by UK law.

${consentData.analytics_consent
  ? '5. I consent to my conversation data being anonymized and used for service improvement (this consent expires annually and must be renewed).'
  : '5. I do NOT consent to anonymized data use for service improvement.'
}

I understand that this consent is legally binding and that I can withdraw it at any time through my Data Management settings, subject to legal retention requirements.`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/register/consent/enhanced" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Sign Your Consent
          </h1>
          <p className="text-lg text-deep-navy/70">
            Choose how you'd like to sign your consent documents
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 mb-8">
          <div className="space-y-6">
            <div className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-deep-navy mb-2">Your Consent Choices</h3>
                  <ul className="text-sm text-deep-navy/80 space-y-1">
                    <li>• Essential service provision: ✓ Agreed</li>
                    <li>• Wellbeing monitoring: ✓ Agreed</li>
                    <li>• Family access: ✓ Agreed</li>
                    <li>• Retention period: {consentData.retention_period_months} months</li>
                    <li>• Analytics consent: {consentData.analytics_consent ? '✓ Agreed' : '✗ Declined'}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-deep-navy mb-4">Choose Signature Method</h2>
              <p className="text-deep-navy/70 mb-4">
                Both methods are legally valid under UK law. Choose the one that's most comfortable for you.
              </p>

              <Tabs value={signatureMethod} onValueChange={(v) => setSignatureMethod(v as 'electronic' | 'voice')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-soft-gray/30 p-1 rounded-[12px]">
                  <TabsTrigger value="electronic" className="rounded-[8px] data-[state=active]:bg-white">
                    <PenTool className="w-4 h-4 mr-2" />
                    Electronic
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="rounded-[8px] data-[state=active]:bg-white">
                    <Mic className="w-4 h-4 mr-2" />
                    Voice
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="electronic" className="mt-0">
                    <div className="mb-6">
                      <Card className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
                        <h3 className="font-semibold text-deep-navy mb-2">Electronic Signature</h3>
                        <p className="text-sm text-deep-navy/80">
                          Quick and simple - just check the box and type your name. Perfect for users who are
                          comfortable with typing.
                        </p>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="voice" className="mt-0">
                    <div className="mb-6">
                      <Card className="bg-coral-red/10 border border-coral-red/30 rounded-[16px] p-6">
                        <h3 className="font-semibold text-deep-navy mb-2">Voice Signature (Recommended for Elders)</h3>
                        <p className="text-sm text-deep-navy/80">
                          Speak your consent naturally - ideal for elderly users or those with mobility challenges.
                          Your voice recording provides clear evidence of your agreement.
                        </p>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </Card>

        {signatureMethod === 'electronic' ? (
          <ElectronicSignature
            userId={userId}
            documentId={documentId}
            consentStatement={consentStatement}
            documentTitle="Grace Companion Consent Agreement"
            requiresTypedName={true}
            onSignatureComplete={handleSignatureComplete}
            onCancel={() => router.back()}
          />
        ) : (
          <VoiceSignature
            userId={userId}
            documentId={documentId}
            consentStatement="I agree to all the terms and conditions in the Grace Companion Consent Agreement as read to me. I understand this is a legally binding consent."
            onSignatureComplete={handleSignatureComplete}
            onCancel={() => router.back()}
          />
        )}

        <Card className="mt-8 bg-white rounded-[24px] shadow-lg p-6">
          <h3 className="font-bold text-deep-navy mb-2">Why We Ask for Signatures</h3>
          <p className="text-sm text-deep-navy/70 leading-relaxed">
            UK law requires clear evidence of consent for data processing, especially for vulnerable individuals.
            Your signature (whether electronic or voice) creates a secure, timestamped record that proves you
            understood and agreed to how we'll use your information. This protects both you and us, and gives
            you peace of mind that your consent is documented properly.
          </p>
        </Card>
      </div>
    </main>
  );
}
