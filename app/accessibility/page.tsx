import { Card } from '@/components/ui/card';
import { Eye, Ear, Mic, Keyboard, Smartphone, Heart } from 'lucide-react';
import Link from 'next/link';

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Accessibility Statement
          </h1>
          <p className="text-lg text-deep-navy/70">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Heart className="w-7 h-7 text-coral-red" strokeWidth={1.5} />
              Our Commitment
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion is committed to ensuring digital accessibility for people with disabilities, cognitive impairments, and elderly users who may face technology challenges. We continually improve the user experience for everyone and apply relevant accessibility standards.
              </p>
              <p>
                We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and comply with the UK's Equality Act 2010 and the Public Sector Bodies (Websites and Mobile Applications) Accessibility Regulations 2018.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Mic className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              Voice-First Design
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Recognising that many elders and individuals with cognitive impairments struggle with traditional interfaces, Grace Companion is built voice-first:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Natural language conversation without complex menus</li>
                <li>Speech-to-text for hands-free interaction</li>
                <li>Text-to-speech for all responses and reminders</li>
                <li>Voice cloning for familiar, comforting reminders</li>
                <li>Minimal visual complexity with single-screen flows</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Eye className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
              Visual Accessibility
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>Our visual design includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><span className="font-semibold">High contrast:</span> WCAG AA compliant colour ratios throughout</li>
                <li><span className="font-semibold">Large text:</span> Base font size of 16px with generous line spacing</li>
                <li><span className="font-semibold">Clear typography:</span> Easy-to-read fonts without decorative elements</li>
                <li><span className="font-semibold">Focus indicators:</span> Clear keyboard focus states on all interactive elements</li>
                <li><span className="font-semibold">Scalable interface:</span> Works with browser zoom up to 200%</li>
                <li><span className="font-semibold">No colour dependency:</span> Information conveyed beyond colour alone</li>
                <li><span className="font-semibold">Consistent layout:</span> Predictable navigation and structure</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Ear className="w-7 h-7 text-coral-red" strokeWidth={1.5} />
              Audio & Hearing
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>For users with hearing impairments:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All audio content has visual text equivalents</li>
                <li>Transcripts provided for all voice interactions</li>
                <li>Visual alerts and notifications available</li>
                <li>Volume controls with clear indicators</li>
                <li>No audio-only critical information</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Keyboard className="w-7 h-7 text-mint-green" strokeWidth={1.5} />
              Keyboard & Motor Accessibility
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>Navigation and interaction support:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Full keyboard navigation support</li>
                <li>Logical tab order throughout the interface</li>
                <li>Skip navigation links for main content</li>
                <li>Large, touch-friendly interactive elements (minimum 44x44px)</li>
                <li>No time-limited interactions requiring fast responses</li>
                <li>Generous spacing between clickable elements</li>
                <li>Compatible with assistive technologies (switch controls, voice control)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-3">
              <Smartphone className="w-7 h-7 text-sky-blue" strokeWidth={1.5} />
              Screen Reader Compatibility
            </h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion is designed to work with popular screen readers including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>JAWS (Windows)</li>
                <li>NVDA (Windows)</li>
                <li>VoiceOver (macOS, iOS)</li>
                <li>TalkBack (Android)</li>
              </ul>
              <p className="mt-4">Screen reader features:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Semantic HTML with proper heading structure</li>
                <li>ARIA labels for all interactive elements</li>
                <li>Descriptive link text and button labels</li>
                <li>Alternative text for all images and icons</li>
                <li>Status updates announced dynamically</li>
                <li>Form fields with clear labels and error messages</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Cognitive Accessibility</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                For users with cognitive impairments, memory issues, or dementia:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Simple, conversational language without jargon</li>
                <li>One task per screen to reduce cognitive load</li>
                <li>Clear, descriptive headings and labels</li>
                <li>Consistent navigation and interaction patterns</li>
                <li>Gentle reminders without pressure or urgency</li>
                <li>Patient AI that repeats information when needed</li>
                <li>No complex multi-step processes</li>
                <li>Visual confirmation of actions taken</li>
                <li>Ability to undo or correct mistakes easily</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Mobile Accessibility</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                The mobile experience is optimised for accessibility:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Responsive design that works on all screen sizes</li>
                <li>Touch targets sized appropriately for limited dexterity</li>
                <li>Works in both portrait and landscape orientations</li>
                <li>Compatible with mobile screen readers</li>
                <li>Minimal scrolling required</li>
                <li>Progressive web app for easy access without app store</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Known Limitations</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We are continuously improving, but some limitations currently exist:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Voice recognition accuracy depends on accent, pronunciation, and background noise</li>
                <li>Some third-party components may have accessibility gaps</li>
                <li>AI-generated responses may occasionally be unclear or confusing</li>
                <li>Internet connection required for full functionality</li>
              </ul>
              <p className="mt-4">
                We are actively working to address these limitations in future updates.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Testing & Compliance</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion has been tested with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Automated accessibility testing tools (Axe, WAVE)</li>
                <li>Manual keyboard navigation testing</li>
                <li>Screen reader testing (VoiceOver, NVDA)</li>
                <li>Colour contrast verification</li>
                <li>User testing with elders and individuals with disabilities</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Assistive Technologies</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Grace Companion is designed to be compatible with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Screen readers</li>
                <li>Screen magnification software</li>
                <li>Speech recognition software</li>
                <li>Alternative input devices (trackball, joystick, switch)</li>
                <li>Operating system accessibility features</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Feedback & Support</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                We welcome feedback on the accessibility of Grace Companion. If you encounter any barriers or have suggestions:
              </p>
              <div className="bg-mint-green/20 border border-mint-green/30 rounded-lg p-6 mt-4">
                <p className="font-semibold text-deep-navy mb-2">Accessibility Team</p>
                <p>Email: <a href="mailto:accessibility@gracecompanion.co.uk" className="text-sky-blue hover:underline">accessibility@gracecompanion.co.uk</a></p>
                <p>Phone: 0800 XXX XXXX (Mon-Fri, 9am-5pm GMT)</p>
                <p>Post: Grace Companion, Accessibility Team, [Address]</p>
              </div>
              <p className="mt-4">
                We aim to respond to accessibility feedback within 5 working days and will work with you to provide the information or functionality you need in an accessible format.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Continuous Improvement</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                Accessibility is an ongoing priority. We regularly:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Conduct accessibility audits</li>
                <li>Test with real users who have disabilities</li>
                <li>Update content and features based on feedback</li>
                <li>Train our team on accessibility best practices</li>
                <li>Monitor emerging accessibility guidelines and technologies</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-deep-navy mb-4">Formal Complaints</h2>
            <div className="space-y-4 text-deep-navy/80 leading-relaxed">
              <p>
                If you're not satisfied with our response to accessibility concerns, you may contact:
              </p>
              <p className="ml-4">
                <span className="font-semibold">Equality and Human Rights Commission (EHRC)</span><br />
                <a href="https://www.equalityhumanrights.com" target="_blank" rel="noopener noreferrer" className="text-sky-blue hover:underline">equalityhumanrights.com</a><br />
                Helpline: 0808 800 0082
              </p>
            </div>
          </section>

          <section className="border-t border-deep-navy/10 pt-8">
            <p className="text-sm text-deep-navy/60 leading-relaxed">
              This accessibility statement was created on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} and is reviewed regularly to ensure accuracy.
            </p>
          </section>
        </Card>
      </div>
    </main>
  );
}
