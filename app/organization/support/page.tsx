'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SupportTicketForm } from '@/components/SupportTicketForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, MessageCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function OrganizationSupportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/organization/login');
        return;
      }

      const { data: orgUserData } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .single();

      if (orgUserData) {
        setOrganization(orgUserData.organizations);
      }

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(profileData);
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (ticketNumber: string) => {
    console.log('Organization ticket created:', ticketNumber);
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
          <Link href="/organization/dashboard" className="inline-block mb-4">
            <Button variant="ghost" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Organization Support
          </h1>
          <p className="text-lg text-deep-navy/70">
            Get help with your care organization account and services
          </p>
        </div>

        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-sky-blue/20 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-sky-blue" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Priority Support</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Dedicated support line
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
              Business support team
            </p>
            <a
              href="mailto:business@gracecompanion.co.uk"
              className="text-sky-blue hover:underline font-semibold break-all text-sm"
            >
              business@gracecompanion.co.uk
            </a>
            <p className="text-xs text-deep-navy/60 mt-1">
              4-hour response time
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-coral-red/20 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-coral-red" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Live Chat</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Instant messaging support
            </p>
            <Button
              variant="link"
              className="text-sky-blue hover:underline font-semibold p-0 h-auto"
              onClick={() => alert('Live chat coming soon!')}
            >
              Start Chat
            </Button>
            <p className="text-xs text-deep-navy/60 mt-1">
              Available during business hours
            </p>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-sky-blue/20 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-sky-blue" />
            </div>
            <h3 className="font-semibold text-deep-navy mb-2">Documentation</h3>
            <p className="text-sm text-deep-navy/70 mb-3">
              Guides and resources
            </p>
            <Link
              href="/organization/compliance"
              className="text-sky-blue hover:underline font-semibold"
            >
              View Resources
            </Link>
            <p className="text-xs text-deep-navy/60 mt-1">
              CQC compliance guides
            </p>
          </Card>
        </div>

        <SupportTicketForm
          organizationId={organization?.id}
          userEmail={userProfile?.email}
          userName={userProfile?.full_name || organization?.name}
          userType="organization"
          onSuccess={handleSuccess}
        />
      </div>
    </main>
  );
}
