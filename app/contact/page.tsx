import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Clock, MessageCircle, TicketIcon } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-deep-navy/70">
            We're here to help. Reach out anytime.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-sky-blue/10 to-mint-green/10 rounded-[24px] shadow-lg p-8 mb-6 border-2 border-sky-blue/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-sky-blue rounded-full flex items-center justify-center flex-shrink-0">
                <TicketIcon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-deep-navy mb-2">
                  Submit a Support Request
                </h2>
                <p className="text-deep-navy/80">
                  Get help directly through our online support ticket system
                </p>
              </div>
            </div>
            <Link href="/support">
              <Button className="bg-sky-blue hover:bg-sky-blue/90 text-white rounded-[20px] px-8 py-6 text-lg font-semibold whitespace-nowrap">
                Create Ticket
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid gap-6 mb-6">
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold text-deep-navy mb-6">Get in Touch</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-coral-red" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-1">Email</h3>
                      <p className="text-deep-navy/70 mb-2">For general enquiries and support</p>
                      <a href="mailto:support@gracecompanion.co.uk" className="text-sky-blue hover:underline">
                        support@gracecompanion.co.uk
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-1">Phone</h3>
                      <p className="text-deep-navy/70 mb-2">Speak to our support team</p>
                      <a href="tel:0800XXXXXXX" className="text-sky-blue hover:underline text-lg font-semibold">
                        0800 XXX XXXX
                      </a>
                      <p className="text-sm text-deep-navy/60 mt-1">Free from UK landlines and mobiles</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-sky-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-1">Hours</h3>
                      <p className="text-deep-navy/70">Monday - Friday: 9:00am - 5:00pm GMT</p>
                      <p className="text-deep-navy/70">Saturday - Sunday: Closed</p>
                      <p className="text-sm text-deep-navy/60 mt-2">
                        Email enquiries answered within 24 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-coral-red" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-navy mb-1">Address</h3>
                      <p className="text-deep-navy/70">
                        Grace Companion Ltd<br />
                        [Address Line 1]<br />
                        [Address Line 2]<br />
                        [City, Postcode]<br />
                        United Kingdom
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-deep-navy mb-6">Specific Enquiries</h2>
                <div className="space-y-4">
                  <Card className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Technical Support</h3>
                    <p className="text-sm text-deep-navy/70 mb-3">
                      Having technical difficulties or need help using Grace?
                    </p>
                    <a href="mailto:support@gracecompanion.co.uk" className="text-sky-blue hover:underline text-sm">
                      support@gracecompanion.co.uk
                    </a>
                  </Card>

                  <Card className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Privacy & Data</h3>
                    <p className="text-sm text-deep-navy/70 mb-3">
                      Questions about privacy, data protection, or GDPR
                    </p>
                    <a href="mailto:privacy@gracecompanion.co.uk" className="text-sky-blue hover:underline text-sm">
                      privacy@gracecompanion.co.uk
                    </a>
                  </Card>

                  <Card className="bg-coral-red/10 border border-coral-red/30 rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Accessibility</h3>
                    <p className="text-sm text-deep-navy/70 mb-3">
                      Accessibility concerns or suggestions for improvement
                    </p>
                    <a href="mailto:accessibility@gracecompanion.co.uk" className="text-sky-blue hover:underline text-sm">
                      accessibility@gracecompanion.co.uk
                    </a>
                  </Card>

                  <Card className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Business & Partnerships</h3>
                    <p className="text-sm text-deep-navy/70 mb-3">
                      Care homes, healthcare providers, or business enquiries
                    </p>
                    <a href="mailto:business@gracecompanion.co.uk" className="text-sky-blue hover:underline text-sm">
                      business@gracecompanion.co.uk
                    </a>
                  </Card>

                  <Card className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Media & Press</h3>
                    <p className="text-sm text-deep-navy/70 mb-3">
                      Press enquiries and media requests
                    </p>
                    <a href="mailto:press@gracecompanion.co.uk" className="text-sky-blue hover:underline text-sm">
                      press@gracecompanion.co.uk
                    </a>
                  </Card>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-coral-red/10 to-mint-green/10 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-coral-red/20">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-4">
                  Need Immediate Help?
                </h2>
                <p className="text-deep-navy/80 leading-relaxed mb-6">
                  If you're experiencing technical difficulties or need urgent assistance with the service, our support team is here to help during business hours. For medical emergencies, please call 999 immediately.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-white rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">Emergency Services</h3>
                    <p className="text-3xl font-bold text-coral-red mb-2">999</p>
                    <p className="text-sm text-deep-navy/60">For life-threatening emergencies</p>
                  </Card>
                  <Card className="bg-white rounded-[16px] p-6">
                    <h3 className="font-semibold text-deep-navy mb-2">NHS 111</h3>
                    <p className="text-3xl font-bold text-sky-blue mb-2">111</p>
                    <p className="text-sm text-deep-navy/60">For urgent medical advice</p>
                  </Card>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-bold text-deep-navy mb-4">We Value Your Feedback</h2>
            <p className="text-deep-navy/80 leading-relaxed mb-6">
              Your feedback helps us improve Grace Companion for everyone. Whether you have suggestions, concerns, or simply want to share your experience, we'd love to hear from you. Every message is read and considered as we continue to develop and enhance our service.
            </p>
            <p className="text-deep-navy/80 leading-relaxed">
              If you're experiencing difficulties or have concerns about the service, please don't hesitate to reach out. Our team is committed to ensuring Grace Companion works effectively for you and your loved ones.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
