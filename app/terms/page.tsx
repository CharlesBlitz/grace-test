import { Card } from '@/components/ui/card';
import { FileText, AlertTriangle, Shield, Ban } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-deep-navy/70">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12 space-y-8">
          <section>
            <div className="bg-coral-red/10 border border-coral-red/30 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-coral-red flex-shrink-0 mt-1" strokeWidth={2} />
                <div>
                  <h3 className="font-bold text-deep-navy mb-2">Important Medical Disclaimer</h3>
                  <p className="text-deep-navy/80 text-sm leading-relaxed">
                    Grace Companion is NOT a medical device, healthcare provider, or emergency service. This service provides companionship and reminders only. In case of medical emergency, call 999 immediately. Always consult healthcare professionals for medical advice.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <FileText className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                By accessing or using Grace Companion ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the Service.
              </p>
              <p>
                These terms constitute a legally binding agreement between you ("User," "you," or "your") and Grace Companion ("we," "us," or "our"), a service operated in the United Kingdom.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">2. Eligibility & Account Registration</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>You must meet the following requirements to use the Service:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Provide accurate and truthful information during registration</li>
                <li>Maintain the security of your account credentials</li>
              </ul>
              <h3 className="font-semibold text-deep-navy mt-4">Next of Kin Registration</h3>
              <p>
                If you are registering on behalf of another person (the "Elder"), you affirm that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You have legal authority to make decisions on their behalf</li>
                <li>You have obtained necessary consent where the Elder has capacity</li>
                <li>You will act in the best interests of the Elder</li>
                <li>All information provided is accurate and truthful</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">3. Service Description</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>Grace Companion provides:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>AI-powered conversational companionship</li>
                <li>Personalised reminders for medication, appointments, and daily activities</li>
                <li>Voice-based interactions using text-to-speech technology</li>
                <li>Family notification system for help requests</li>
                <li>Behaviour tracking and wellness monitoring</li>
              </ul>
              <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-4 mt-4">
                <p className="text-sm">
                  <span className="font-semibold text-deep-navy">Note:</span> The Service uses AI technology which may occasionally produce errors or unexpected responses. It should not replace human interaction, medical care, or professional advice.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">4. User Responsibilities</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>You agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service lawfully and in accordance with these Terms</li>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorised access</li>
                <li>Not misuse or attempt to hack or disrupt the Service</li>
                <li>Not use the Service for any illegal or unauthorised purpose</li>
                <li>Not impersonate others or provide false information</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Ban className="w-7 h-7 text-coral-red" strokeWidth={1.5} />
              5. Prohibited Uses
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>You must not:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service as a substitute for professional medical advice</li>
                <li>Rely on the Service in emergency situations</li>
                <li>Share your account with unauthorised persons</li>
                <li>Attempt to reverse engineer or extract AI models</li>
                <li>Collect data about other users</li>
                <li>Upload malicious code or spam</li>
                <li>Harass, abuse, or harm others through the Service</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">6. Intellectual Property</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                All content, features, and functionality of Grace Companion, including but not limited to text, graphics, logos, software, and AI models, are owned by Grace Companion and protected by copyright, trademark, and other intellectual property laws.
              </p>
              <h3 className="font-semibold text-deep-navy mt-4">Your Content</h3>
              <p>
                You retain ownership of voice recordings and personal data you provide. By using the Service, you grant us a limited licence to process this data solely for providing and improving the Service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">7. Voice Cloning & AI-Generated Content</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                When you provide voice samples for cloning:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You grant us permission to create synthetic versions of the recorded voice</li>
                <li>Voice clones will only be used for reminders within your account</li>
                <li>You affirm you have the right to provide the voice sample</li>
                <li>Voice data will not be shared or used for other purposes</li>
              </ul>
              <p className="mt-4">
                AI-generated responses are created in real-time and may not always be accurate. We do not guarantee the correctness or appropriateness of AI responses.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">8. Payment & Fees</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion may offer free and paid subscription tiers. Pricing will be clearly displayed before purchase. Payment terms include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>Refunds are provided in accordance with UK consumer rights</li>
                <li>Prices may change with 30 days' notice</li>
                <li>Payment information is processed securely by third-party providers</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">9. Service Availability</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We strive to provide reliable service but cannot guarantee uninterrupted access. The Service may be unavailable due to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Scheduled maintenance</li>
                <li>Technical difficulties</li>
                <li>Factors beyond our control</li>
              </ul>
              <p className="mt-4">
                We are not liable for any damages resulting from Service unavailability.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Shield className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              10. Limitation of Liability
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p className="font-semibold text-deep-navy">
                TO THE FULLEST EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Grace Companion is provided "as is" without warranties of any kind</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>We are not responsible for medical outcomes or emergencies</li>
                <li>Our total liability shall not exceed the fees paid by you in the last 12 months</li>
                <li>We are not liable for third-party actions or content</li>
              </ul>
              <p className="mt-4 text-sm">
                Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under UK law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">11. Indemnification</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                You agree to indemnify and hold harmless Grace Companion from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your breach of these Terms</li>
                <li>Your violation of any law or regulation</li>
                <li>Your infringement of third-party rights</li>
                <li>Unauthorised use of your account</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">12. Termination</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We may suspend or terminate your access to the Service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>For breach of these Terms</li>
                <li>For fraudulent or illegal activity</li>
                <li>If required by law</li>
                <li>At our discretion with or without notice</li>
              </ul>
              <p className="mt-4">
                You may terminate your account at any time through settings. Upon termination, your data will be deleted in accordance with our Privacy Policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">13. Governing Law & Dispute Resolution</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
              <p className="mt-4">
                We encourage resolving disputes informally by contacting us first. If unsuccessful, you may pursue alternative dispute resolution or legal action.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">14. Changes to Terms</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We may modify these Terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">15. Severability</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">16. Contact Information</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                For questions about these Terms of Service:
              </p>
              <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-6 mt-4">
                <p className="font-semibold text-deep-navy mb-2">Grace Companion Legal Team</p>
                <p>Email: <a href="mailto:legal@gracecompanion.co.uk" className="text-sky-blue hover:underline">legal@gracecompanion.co.uk</a></p>
                <p>Post: Grace Companion, Legal Department, [Address]</p>
              </div>
            </div>
          </section>

          <section className="border-t border-deep-navy/10 pt-8">
            <p className="text-sm text-deep-navy/60 leading-relaxed">
              By using Grace Companion, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
          </section>
        </Card>
      </div>
    </main>
  );
}
