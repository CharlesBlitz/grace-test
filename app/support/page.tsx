'use client';

import { useAuth } from '@/lib/authContext';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SupportPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const handleSuccess = (ticketNumber: string) => {
    console.log('Ticket created:', ticketNumber);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="inline-block mb-4">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Get Support
          </h1>
          <p className="text-lg text-deep-navy/70">
            We're here to help you with any questions or issues
          </p>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-3">
          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-sky-blue/20 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-sky-blue" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Phone Support</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Speak to our support team
            </p>
            <a
              href="tel:0800XXXXXXX"
              className="text-sky-blue hover:underline font-semibold"
            >
              0800 XXX XXXX
            </a>
            <p className="text-xs text-deep-navy/60 mt-1">
              Mon-Fri: 9am-5pm GMT
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-mint-green/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-mint-green" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Email Support</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Get help via email
            </p>
            <a
              href="mailto:support@gracecompanion.co.uk"
              className="text-sky-blue hover:underline font-semibold break-all"
            >
              support@gracecompanion.co.uk
            </a>
            <p className="text-xs text-deep-navy/60 mt-1">
              Response within 24 hours
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-coral-red/20 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-coral-red" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Help Center</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Browse FAQs and guides
            </p>
            <Link
              href="/faq"
              className="text-sky-blue hover:underline font-semibold"
            >
              Visit Help Center
            </Link>
            <p className="text-xs text-deep-navy/60 mt-1">
              Self-service support
            </p>
          </Card>
        </div>

        <SupportTicketForm
          userId={profile?.id}
          userEmail={profile?.email}
          userName={(profile as any)?.full_name || profile?.name || undefined}
          userType="user"
          onSuccess={handleSuccess}
        />
      </div>
    </main>
  );
}
