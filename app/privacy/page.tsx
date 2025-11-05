import { Card } from '@/components/ui/card';
import { Shield, Lock, Eye, Download, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-deep-navy/70">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Shield className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              Your Privacy Matters
            </h2>
            <p className="text-deep-navy/80 leading-relaxed mb-4">
              Grace Companion is committed to protecting the privacy and security of our users, particularly vulnerable individuals and their families. This Privacy Policy explains how we collect, use, store, and protect your personal information in accordance with UK GDPR and Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">1. Information We Collect</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <div>
                <h3 className="font-semibold text-deep-navy mb-2">Personal Information:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, email address, and contact details</li>
                  <li>Relationship information (for next of kin)</li>
                  <li>Time zone and location preferences</li>
                  <li>Date of birth and emergency contact information</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-deep-navy mb-2">Voice Data:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Voice recordings for personalised reminders (optional)</li>
                  <li>Voice-to-text transcriptions of conversations</li>
                  <li>Voice samples stored securely for cloning purposes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-deep-navy mb-2">Usage Information:</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Conversation history with AI companion</li>
                  <li>Reminder preferences and responses</li>
                  <li>Help request history and emergency contacts made</li>
                  <li>Device information and usage patterns</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Eye className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>We use your information solely to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide personalised reminders and companionship</li>
                <li>Generate voice-based reminders in familiar voices</li>
                <li>Notify designated family members of help requests</li>
                <li>Improve conversation quality and response accuracy</li>
                <li>Ensure safety and wellbeing of users</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="font-semibold text-deep-navy mt-4">
                We never sell your data to third parties. Ever.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Lock className="w-7 h-7 text-coral-red" strokeWidth={1.5} />
              3. Data Security
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>We implement industry-standard security measures:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>End-to-end encryption for all voice data</li>
                <li>Secure cloud storage with regular backups</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security audits and updates</li>
                <li>Data minimisation principles</li>
              </ul>
              <p className="bg-mint-green/20 border border-mint-green/30 rounded-lg p-4 mt-4">
                <span className="font-semibold text-deep-navy">Note:</span> Voice recordings are encrypted and stored separately from personal information. Only authorised personnel can access this data for service improvement.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Users className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              4. Family Access & Consent
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                When a next of kin registers on behalf of an elder, they affirm they have legal authority to do so. Family members with granted access can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>View reminder history and conversation summaries</li>
                <li>Receive notifications when help is requested</li>
                <li>Modify reminder schedules and preferences</li>
                <li>Access emergency contact information</li>
              </ul>
              <p className="mt-4">
                The elder or their legal guardian can revoke family access at any time through settings.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">5. Data Retention</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>We operate a three-tiered retention system to balance your privacy with legal safeguarding obligations:</p>

              <div className="bg-coral-red/10 border border-coral-red/30 rounded-lg p-4 my-4">
                <h3 className="font-semibold text-deep-navy mb-2">Tier 1: Essential Safeguarding Data (7 years)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Conversations flagged as concerning (risk of harm, confusion, distress)</li>
                  <li>Legal basis: Legal obligation, Vital interests</li>
                  <li>Cannot be deleted on request if legal obligation applies</li>
                  <li>Access: You, authorized family members, safeguarding authorities</li>
                </ul>
              </div>

              <div className="bg-mint-green/10 border border-mint-green/30 rounded-lg p-4 my-4">
                <h3 className="font-semibold text-deep-navy mb-2">Tier 2: Family Monitoring Data (12-24 months, configurable)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Normal daily wellbeing conversations</li>
                  <li>Legal basis: Legitimate interests, Consent</li>
                  <li>Default: 12 months active, then 12 months archived, then deleted</li>
                  <li>You can choose: 12 or 24 month retention in settings</li>
                  <li>Can be deleted on request with 30-day grace period</li>
                  <li>60-day notice before permanent deletion</li>
                </ul>
              </div>

              <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-4 my-4">
                <h3 className="font-semibold text-deep-navy mb-2">Tier 3: Service Improvement Data (Indefinite, anonymized)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>Anonymized conversation patterns for AI improvement</li>
                  <li>Legal basis: Explicit consent (optional, opt-in only)</li>
                  <li>All personal information removed (irreversible anonymization)</li>
                  <li>Cannot be linked back to you (GDPR Recital 26 compliant)</li>
                  <li>Consent expires annually and must be renewed</li>
                </ul>
              </div>

              <p className="font-semibold text-deep-navy mt-6">Other Data Retention:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><span className="font-semibold">Voice recordings:</span> Retained until account deletion or revoked consent</li>
                <li><span className="font-semibold">Personal information:</span> Retained while account is active, deleted within 30 days of account closure</li>
                <li><span className="font-semibold">Reminder history:</span> Stored for 6 months</li>
                <li><span className="font-semibold">Access logs:</span> Maintained for 3 years for security and accountability</li>
              </ul>

              <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-4 mt-4">
                <p className="text-sm">
                  <span className="font-semibold text-deep-navy">Manage Your Data:</span> Visit your{' '}
                  <Link href="/data-management" className="text-sky-blue hover:underline">Data Management Dashboard</Link>{' '}
                  to view all stored conversations, adjust retention periods, and exercise your data rights.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Download className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
              6. Your Rights
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>Under UK GDPR, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><span className="font-semibold">Access:</span> Request a copy of all your data</li>
                <li><span className="font-semibold">Rectification:</span> Correct inaccurate information</li>
                <li><span className="font-semibold">Erasure:</span> Request deletion of your data</li>
                <li><span className="font-semibold">Portability:</span> Receive your data in a portable format</li>
                <li><span className="font-semibold">Restriction:</span> Limit how we process your data</li>
                <li><span className="font-semibold">Objection:</span> Object to certain data processing</li>
                <li><span className="font-semibold">Withdrawal:</span> Withdraw consent at any time</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Visit your <Link href="/data-management" className="text-sky-blue hover:underline">Data Management Dashboard</Link> for immediate access and deletion requests</li>
                <li>Email us at <a href="mailto:privacy@gracecompanion.co.uk" className="text-sky-blue hover:underline">privacy@gracecompanion.co.uk</a></li>
              </ul>
              <p className="text-sm mt-2">
                We will respond to all requests within 30 days as required by GDPR Article 12.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Trash2 className="w-7 h-7 text-coral-red" strokeWidth={1.5} />
              7. Account Deletion & Right to Erasure
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                You may delete your account or request data erasure at any time via your{' '}
                <Link href="/data-management" className="text-sky-blue hover:underline">Data Management Dashboard</Link>.
              </p>

              <p className="font-semibold text-deep-navy mt-4">Upon account deletion:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All personal information is permanently deleted within 30 days</li>
                <li>Voice recordings are securely erased with cryptographic overwriting</li>
                <li>Non-safeguarding conversations are immediately deleted</li>
                <li>Family members are notified of account closure</li>
              </ul>

              <div className="bg-coral-red/10 border border-coral-red/30 rounded-lg p-4 mt-4">
                <p className="font-semibold text-deep-navy mb-2">Important: Safeguarding Data Retention</p>
                <p className="text-sm">
                  Conversations flagged for safeguarding purposes (indicating risk of harm, abuse, or urgent need)
                  must be retained for 7 years under UK Adult Safeguarding legislation. This is a legal obligation
                  under GDPR Article 6(1)(c) and cannot be overridden by a deletion request.
                </p>
                <p className="text-sm mt-2">
                  You will be notified of any data retained for legal reasons, including the specific legal basis
                  and retention period. You may request a review of safeguarding flagging decisions.
                </p>
              </div>

              <p className="mt-4">
                Anonymised, aggregated data (with all personal identifiers removed) may be retained for service
                improvement purposes. This data cannot be linked back to you and is not considered personal data
                under GDPR Recital 26.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">8. Third-Party Services</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>We use the following third-party services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><span className="font-semibold">ElevenLabs:</span> Voice cloning and text-to-speech (data processing agreement in place)</li>
                <li><span className="font-semibold">Supabase:</span> Secure database and authentication</li>
                <li><span className="font-semibold">AI providers:</span> Conversation processing (no data retention)</li>
              </ul>
              <p className="mt-4">
                All third-party processors comply with UK GDPR and have appropriate data protection agreements.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">9. International Data Transfers</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Your data is primarily stored within the UK and EU. Where data is transferred internationally, we ensure appropriate safeguards are in place through Standard Contractual Clauses and adequacy decisions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">10. Children's Privacy</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion is designed for adults aged 18 and over. We do not knowingly collect information from children under 18.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">11. Changes to This Policy</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We may update this Privacy Policy periodically. Significant changes will be communicated via email and in-app notifications. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">12. Contact & Complaints</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                For privacy-related questions or concerns:
              </p>
              <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-lg p-6 mt-4">
                <p className="font-semibold text-deep-navy mb-2">Data Protection Officer</p>
                <p>Email: <a href="mailto:privacy@gracecompanion.co.uk" className="text-sky-blue hover:underline">privacy@gracecompanion.co.uk</a></p>
                <p>Post: Grace Companion, Data Protection, [Address]</p>
              </div>
              <p className="mt-4">
                You also have the right to lodge a complaint with the Information Commissioner's Office (ICO):
              </p>
              <p className="ml-4">
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-sky-blue hover:underline">ico.org.uk</a> | Helpline: 0303 123 1113
              </p>
            </div>
          </section>
        </Card>
      </div>
    </main>
  );
}
