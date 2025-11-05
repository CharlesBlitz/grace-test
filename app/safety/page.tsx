import { Card } from '@/components/ui/card';
import { Shield, Lock, Eye, UserCheck, Bell, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Safety & Security
          </h1>
          <p className="text-lg text-deep-navy/70">
            Your safety and security are our highest priorities
          </p>
        </div>

        <Card className="bg-gradient-to-br from-coral-red/10 to-coral-red/5 border-2 border-coral-red/30 rounded-[24px] shadow-lg p-8 md:p-12 mb-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-coral-red flex-shrink-0 mt-1" strokeWidth={2} />
            <div>
              <h2 className="text-2xl font-bold text-deep-navy mb-3">Critical Safety Information</h2>
              <div className="space-y-2 text-deep-navy/80 leading-relaxed">
                <p className="font-semibold">Grace Companion is NOT:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>A medical device or healthcare provider</li>
                  <li>A replacement for professional medical care</li>
                  <li>An emergency response system</li>
                  <li>A fall detection or monitoring device</li>
                  <li>A substitute for human supervision or care</li>
                </ul>
                <p className="font-bold text-coral-red text-lg mt-4">
                  In any emergency, call 999 immediately. Do not rely on Grace Companion for emergency situations.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">Data Security</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    We implement industry-leading security measures to protect your information:
                  </p>
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-2">Encryption</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>256-bit AES encryption for stored data</li>
                        <li>TLS 1.3 for data in transit</li>
                        <li>End-to-end encryption for voice recordings</li>
                        <li>Encrypted database backups</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-2">Infrastructure</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>UK-based secure data centres</li>
                        <li>Regular security audits and penetration testing</li>
                        <li>24/7 monitoring for threats</li>
                        <li>Automated backup systems</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-2">Access Control</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>Multi-factor authentication available</li>
                        <li>Role-based access permissions</li>
                        <li>Audit logs for all access</li>
                        <li>Secure password requirements</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-2">Compliance</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>UK GDPR compliant</li>
                        <li>ISO 27001 standards followed</li>
                        <li>Data Protection Act 2018 adherence</li>
                        <li>Regular compliance reviews</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-sky-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">Privacy Protection</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    Your privacy is sacrosanct. Here's how we protect it:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><span className="font-semibold">Data minimisation:</span> We only collect what's necessary</li>
                    <li><span className="font-semibold">No third-party selling:</span> We never sell your data. Ever.</li>
                    <li><span className="font-semibold">Anonymised analytics:</span> Usage data is anonymised and aggregated</li>
                    <li><span className="font-semibold">Transparent processing:</span> Clear information about how data is used</li>
                    <li><span className="font-semibold">User control:</span> You decide what family members can access</li>
                    <li><span className="font-semibold">Right to deletion:</span> Delete your data anytime</li>
                    <li><span className="font-semibold">Data portability:</span> Export your data in standard formats</li>
                  </ul>
                  <p className="mt-4">
                    Read our full <Link href="/privacy" className="text-sky-blue hover:underline">Privacy Policy</Link> for complete details.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">Safeguarding Vulnerable Users</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    We take special care when serving vulnerable populations:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><span className="font-semibold">Consent verification:</span> Ensuring proper consent for users with cognitive impairments</li>
                    <li><span className="font-semibold">Family oversight:</span> Designated family members receive wellbeing summaries</li>
                    <li><span className="font-semibold">Abuse detection:</span> AI monitors for signs of distress or abuse (with appropriate privacy safeguards)</li>
                    <li><span className="font-semibold">Help escalation:</span> Quick access to family when assistance is needed</li>
                    <li><span className="font-semibold">Clear limitations:</span> Transparent about what Grace can and cannot do</li>
                    <li><span className="font-semibold">Professional collaboration:</span> Working with dementia care experts and healthcare professionals</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Eye className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">AI Safety & Transparency</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    Our AI is designed with safety as a priority:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><span className="font-semibold">No medical advice:</span> Grace is programmed never to provide medical guidance</li>
                    <li><span className="font-semibold">Hallucination prevention:</span> AI responses are grounded in verified information</li>
                    <li><span className="font-semibold">Bias testing:</span> Regular testing for discriminatory or inappropriate responses</li>
                    <li><span className="font-semibold">Human oversight:</span> Conversations can be reviewed for quality and safety</li>
                    <li><span className="font-semibold">Clear AI identification:</span> Users always know they're speaking with AI</li>
                    <li><span className="font-semibold">Emergency recognition:</span> AI recognises distress and suggests appropriate action</li>
                    <li><span className="font-semibold">Regular updates:</span> AI models updated with latest safety protocols</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-sky-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">Responsible Reminders</h2>
                <div className="space-y-4 text-deep-navy/80 leading-relaxed">
                  <p>
                    Reminders are helpful but must be used safely:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><span className="font-semibold">Not a medical device:</span> Reminders are prompts, not medical monitoring</li>
                    <li><span className="font-semibold">Family notification:</span> Designated contacts alerted to repeated missed reminders</li>
                    <li><span className="font-semibold">Gentle approach:</span> Never aggressive or alarming language</li>
                    <li><span className="font-semibold">Backup recommended:</span> Grace should complement, not replace, pill organisers and other aids</li>
                    <li><span className="font-semibold">Healthcare coordination:</span> Families should inform healthcare providers about reminder use</li>
                  </ul>
                  <p className="bg-coral-red/10 border border-coral-red/30 rounded-lg p-4 mt-4">
                    <span className="font-semibold text-deep-navy">Important:</span> Do not rely solely on Grace Companion for critical medication reminders. Use multiple reminder systems and involve healthcare professionals.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Reporting Security Concerns</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                If you discover a security vulnerability or have concerns about safety:
              </p>
              <div className="bg-mint-green/20 border border-mint-green/30 rounded-lg p-6 mt-4">
                <p className="font-semibold text-deep-navy mb-2">Security Team</p>
                <p>Email: <a href="mailto:security@gracecompanion.co.uk" className="text-sky-blue hover:underline">security@gracecompanion.co.uk</a></p>
                <p className="text-sm text-deep-navy/70 mt-2">
                  We take all security reports seriously and will respond within 24 hours.
                </p>
              </div>
              <p className="mt-4">
                For responsible disclosure, please allow us reasonable time to address issues before public disclosure.
              </p>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Best Practices for Users</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Help us keep you safe by following these guidelines:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use a strong, unique password for your account</li>
                <li>Never share your login credentials with unauthorised persons</li>
                <li>Keep your contact information up to date</li>
                <li>Ensure designated family members know how to access emergency contacts</li>
                <li>Regularly review family access permissions</li>
                <li>Report any suspicious activity immediately</li>
                <li>Keep your device's operating system and browser updated</li>
                <li>Log out when using shared devices</li>
              </ul>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-coral-red/10 to-mint-green/10 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-coral-red/20">
            <h2 className="text-2xl font-bold text-deep-navy mb-4 text-center">Our Promise</h2>
            <p className="text-deep-navy/80 leading-relaxed text-lg text-center max-w-2xl mx-auto">
              We will never compromise your safety, security, or privacy for profit or convenience. Your trust is the foundation of everything we do. If we ever fall short of these commitments, we will acknowledge it transparently and make it right.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
