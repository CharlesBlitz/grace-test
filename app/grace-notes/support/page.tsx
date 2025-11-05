'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, MessageCircle, BookOpen, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GraceNotesSupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [practitioner, setPractitioner] = useState<any>(null);

  useEffect(() => {
    loadPractitionerData();
  }, []);

  const loadPractitionerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/grace-notes/login');
        return;
      }

      const { data: practitionerData } = await supabase
        .from('grace_notes_practitioners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setPractitioner(practitionerData);
    } catch (error) {
      console.error('Error loading practitioner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (ticketNumber: string) => {
    console.log('Grace Notes ticket created:', ticketNumber);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-deep-navy">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/grace-notes/dashboard" className="inline-block mb-4">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Grace Notes Support
          </h1>
          <p className="text-lg text-deep-navy/70">
            Get help with your domiciliary care documentation and compliance
          </p>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-sky-blue/20 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-sky-blue" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Phone Support</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Practitioner helpline
            </p>
            <a
              href="tel:0800XXXXXXX"
              className="text-sky-blue hover:underline font-semibold"
            >
              0800 XXX XXXX
            </a>
            <p className="text-xs text-deep-navy/60 mt-1">
              Mon-Fri: 8am-6pm GMT
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-mint-green/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-mint-green" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Email Support</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Technical assistance
            </p>
            <a
              href="mailto:support@gracenotes.co.uk"
              className="text-sky-blue hover:underline font-semibold break-all text-sm"
            >
              support@gracenotes.co.uk
            </a>
            <p className="text-xs text-deep-navy/60 mt-1">
              Same-day response
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-coral-red/20 rounded-full flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-coral-red" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Video Tutorials</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Learn how to use features
            </p>
            <Button
              variant="link"
              className="text-sky-blue hover:underline font-semibold p-0 h-auto"
              onClick={() => alert('Video tutorials coming soon!')}
            >
              Watch Videos
            </Button>
            <p className="text-xs text-deep-navy/60 mt-1">
              Step-by-step guides
            </p>
          </Card>
        </div>

        <div className="mb-8">
          <Card className="bg-gradient-to-br from-sky-blue/10 to-mint-green/10 rounded-[24px] shadow-md p-6 border-2 border-sky-blue/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-sky-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-sky-blue" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-deep-navy mb-2">
                  Quick Links for Practitioners
                </h3>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <Link
                    href="/grace-notes/compliance"
                    className="text-sky-blue hover:underline font-medium"
                  >
                    → CQC Compliance Guidelines
                  </Link>
                  <Link
                    href="/grace-notes/dashboard"
                    className="text-sky-blue hover:underline font-medium"
                  >
                    → Documentation Templates
                  </Link>
                  <Button
                    variant="link"
                    className="text-sky-blue hover:underline font-medium p-0 h-auto justify-start"
                    onClick={() => alert('Training resources coming soon!')}
                  >
                    → Training Resources
                  </Button>
                  <Button
                    variant="link"
                    className="text-sky-blue hover:underline font-medium p-0 h-auto justify-start"
                    onClick={() => alert('Best practices coming soon!')}
                  >
                    → Best Practices Guide
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <SupportTicketForm
          practitionerId={practitioner?.id}
          userEmail={practitioner?.email}
          userName={practitioner?.full_name}
          userType="practitioner"
          onSuccess={handleSuccess}
        />
      </div>
    </main>
  );
}
