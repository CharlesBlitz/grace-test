'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ConsentOptions {
  essential: boolean;
  wellbeing_monitoring: boolean;
  family_access: boolean;
  analytics: boolean;
  retention_12_months: boolean;
  retention_24_months: boolean;
}

export default function EnhancedConsentPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentOptions>({
    essential: false,
    wellbeing_monitoring: false,
    family_access: false,
    analytics: false,
    retention_12_months: true,
    retention_24_months: false,
  });

  const handleConsentChange = (key: keyof ConsentOptions, value: boolean) => {
    // Handle mutual exclusivity for retention periods
    if (key === 'retention_12_months' && value) {
      setConsents({ ...consents, retention_12_months: true, retention_24_months: false });
    } else if (key === 'retention_24_months' && value) {
      setConsents({ ...consents, retention_12_months: false, retention_24_months: true });
    } else {
      setConsents({ ...consents, [key]: value });
    }
  };

  const canProceed = () => {
    // Essential consents are required
    return consents.essential && consents.wellbeing_monitoring && consents.family_access;
  };

  const handleSubmit = () => {
    if (!canProceed()) {
      alert('Please provide all required consents to continue');
      return;
    }

    // Store consents in sessionStorage for registration completion
    const retentionMonths = consents.retention_24_months ? 24 : 12;
    sessionStorage.setItem('gdpr_consents', JSON.stringify({
      ...consents,
      retention_period_months: retentionMonths,
      consented_at: new Date().toISOString(),
    }));

    router.push('/register/voice-setup');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/register" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Privacy & Consent
          </h1>
          <p className="text-lg text-deep-navy/70">
            Your privacy matters. Please review and provide consent for how we use your data.
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12 space-y-8">
          <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-sky-blue flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-deep-navy mb-2">Understanding Your Data Rights</h3>
                <p className="text-sm text-deep-navy/80 leading-relaxed">
                  Under UK GDPR, you have full control over your personal data. We are transparent about what we collect,
                  why we collect it, and how long we keep it. You can change these settings anytime or request deletion of your data.
                </p>
              </div>
            </div>
          </div>

          {/* Essential Consents (Required) */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-deep-navy flex items-center gap-2">
              <Shield className="w-6 h-6 text-coral-red" />
              Essential Consents (Required)
            </h2>
            <p className="text-sm text-deep-navy/70">
              These consents are necessary for the service to function and protect your wellbeing.
            </p>

            <div className="space-y-4">
              <div className="border border-deep-navy/10 rounded-[12px] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="essential"
                    checked={consents.essential}
                    onCheckedChange={(checked) => handleConsentChange('essential', checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="essential" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-deep-navy mb-1">Service Provision & Account Management</p>
                    <p className="text-sm text-deep-navy/70">
                      I consent to Grace Companion storing my name, email, and timezone to provide the service.
                    </p>
                    <p className="text-xs text-deep-navy/50 mt-2">
                      Legal basis: Contractual necessity • Retention: Until account deletion
                    </p>
                  </label>
                </div>
              </div>

              <div className="border border-deep-navy/10 rounded-[12px] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="wellbeing"
                    checked={consents.wellbeing_monitoring}
                    onCheckedChange={(checked) => handleConsentChange('wellbeing_monitoring', checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="wellbeing" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-deep-navy mb-1">Wellbeing Monitoring & Conversation Storage</p>
                    <p className="text-sm text-deep-navy/70">
                      I consent to storing my conversations with Grace to monitor my wellbeing and safety. Conversations flagged
                      as concerning may be retained for up to 7 years for safeguarding purposes.
                    </p>
                    <p className="text-xs text-deep-navy/50 mt-2">
                      Legal basis: Legitimate interests, Vital interests, Legal obligation • Retention: See settings below
                    </p>
                  </label>
                </div>
              </div>

              <div className="border border-deep-navy/10 rounded-[12px] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="family"
                    checked={consents.family_access}
                    onCheckedChange={(checked) => handleConsentChange('family_access', checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="family" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-deep-navy mb-1">Family Member Access</p>
                    <p className="text-sm text-deep-navy/70">
                      I consent to designated family members (Next of Kin) viewing my conversation summaries and wellbeing status
                      for care coordination purposes.
                    </p>
                    <p className="text-xs text-deep-navy/50 mt-2">
                      Legal basis: Legitimate interests • You can revoke family access anytime
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Data Retention Settings */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-deep-navy">Data Retention Period</h2>
            <p className="text-sm text-deep-navy/70">
              Choose how long your normal wellbeing conversations are kept. Safeguarding data is always retained for 7 years as required by law.
            </p>

            <div className="space-y-3">
              <div className="border border-deep-navy/10 rounded-[12px] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="retention_12"
                    checked={consents.retention_12_months}
                    onCheckedChange={(checked) => handleConsentChange('retention_12_months', checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="retention_12" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-deep-navy mb-1">12 Months (Recommended)</p>
                    <p className="text-sm text-deep-navy/70">
                      Conversations archived after 12 months, permanently deleted after 24 months
                    </p>
                  </label>
                </div>
              </div>

              <div className="border border-deep-navy/10 rounded-[12px] p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="retention_24"
                    checked={consents.retention_24_months}
                    onCheckedChange={(checked) => handleConsentChange('retention_24_months', checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="retention_24" className="flex-1 cursor-pointer">
                    <p className="font-semibold text-deep-navy mb-1">24 Months (Extended)</p>
                    <p className="text-sm text-deep-navy/70">
                      Conversations archived after 24 months, permanently deleted after 36 months
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Optional Consents */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-deep-navy flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-mint-green" />
              Optional Consents
            </h2>
            <p className="text-sm text-deep-navy/70">
              These are not required but help us improve the service.
            </p>

            <div className="border border-deep-navy/10 rounded-[12px] p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="analytics"
                  checked={consents.analytics}
                  onCheckedChange={(checked) => handleConsentChange('analytics', checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="analytics" className="flex-1 cursor-pointer">
                  <p className="font-semibold text-deep-navy mb-1">Anonymized Analytics & Service Improvement</p>
                  <p className="text-sm text-deep-navy/70">
                    I consent to my conversation data being anonymized (all personal information removed) and used to improve
                    AI responses for all users. Once anonymized, data cannot be linked back to me.
                  </p>
                  <p className="text-xs text-deep-navy/50 mt-2">
                    Legal basis: Explicit consent • Retention: Indefinite (anonymized) • Consent expires: Annually
                  </p>
                </label>
              </div>
            </div>
          </section>

          {/* Important Notes */}
          <div className="bg-coral-red/10 border border-coral-red/30 rounded-[16px] p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-coral-red flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-deep-navy mb-2">Important Notes on Data Retention</h3>
                <ul className="text-sm text-deep-navy/80 space-y-2">
                  <li>
                    • <strong>Safeguarding conversations:</strong> If a conversation indicates risk of harm, confusion, or urgent need,
                    it will be flagged and retained for 7 years under UK safeguarding law, regardless of your retention preference.
                  </li>
                  <li>
                    • <strong>You can change these settings:</strong> Visit Data Management anytime to adjust retention periods or
                    revoke consent (except where legally required).
                  </li>
                  <li>
                    • <strong>Right to erasure:</strong> You can request deletion of your data, subject to legal retention requirements
                    for safeguarding.
                  </li>
                  <li>
                    • <strong>60-day notice:</strong> We will notify you 60 days before any conversation is permanently deleted.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1 h-14 text-lg rounded-[16px]"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canProceed()}
              className="flex-1 h-14 text-lg font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
            >
              Continue
            </Button>
          </div>

          <p className="text-xs text-center text-deep-navy/50">
            By continuing, you agree to our{' '}
            <Link href="/privacy" className="text-sky-blue hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-sky-blue hover:underline">
              Terms of Service
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
