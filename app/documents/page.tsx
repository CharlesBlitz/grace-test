'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Shield, User, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  consent_on: string | null;
  guardian_consent_on: string | null;
  guardian_consent_doc: string | null;
  registered_by_nok: boolean;
  created_at: string;
}

interface NoKRelationship {
  nok_id: string;
  relationship_type: string;
  is_primary_contact: boolean;
  created_at: string;
  nok_name?: string;
  nok_email?: string;
}

export default function DocumentsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [relationships, setRelationships] = useState<NoKRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'elder')
        .maybeSingle();

      if (userData) {
        setProfile(userData);

        const { data: relationshipsData } = await supabase
          .from('elder_nok_relationships')
          .select(`
            nok_id,
            relationship_type,
            is_primary_contact,
            created_at
          `)
          .eq('elder_id', userData.id);

        if (relationshipsData && relationshipsData.length > 0) {
          const nokIds = relationshipsData.map((r) => r.nok_id);
          const { data: nokData } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', nokIds);

          const enrichedRelationships = relationshipsData.map((rel) => {
            const nok = nokData?.find((n) => n.id === rel.nok_id);
            return {
              ...rel,
              nok_name: nok?.name,
              nok_email: nok?.email,
            };
          });

          setRelationships(enrichedRelationships);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getRelationshipLabel = (type: string) => {
    const labels: Record<string, string> = {
      son: 'Son',
      daughter: 'Daughter',
      spouse: 'Spouse',
      sibling: 'Sibling',
      'legal-guardian': 'Legal Guardian',
      caregiver: 'Professional Caregiver',
      other: 'Family Member',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-deep-navy text-xl py-12">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            My Documents
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            Your registration and consent information
          </p>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white rounded-[24px] shadow-md p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-sky-blue/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-1">Profile Information</h2>
                <p className="text-body text-deep-navy/60">Your account details</p>
              </div>
            </div>

            <div className="space-y-4 bg-soft-gray/30 rounded-[16px] p-6">
              <div>
                <p className="text-sm font-semibold text-deep-navy/60 mb-1">Name</p>
                <p className="text-lg text-deep-navy">{profile?.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-deep-navy/60 mb-1">Email</p>
                <p className="text-lg text-deep-navy">{profile?.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-deep-navy/60 mb-1">Registration Date</p>
                <p className="text-lg text-deep-navy">
                  {formatDate(profile?.created_at || null)}
                </p>
              </div>
              {profile?.registered_by_nok && (
                <div className="bg-mint-green/20 border-2 border-mint-green rounded-[12px] p-4 mt-4">
                  <p className="text-sm font-semibold text-deep-navy">
                    Account registered by family member
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-md p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-mint-green/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-deep-navy mb-1">Consent Information</h2>
                <p className="text-body text-deep-navy/60">Your consent records</p>
              </div>
            </div>

            <div className="space-y-4 bg-soft-gray/30 rounded-[16px] p-6">
              <div>
                <p className="text-sm font-semibold text-deep-navy/60 mb-1">Personal Consent</p>
                <p className="text-lg text-deep-navy">
                  {profile?.consent_on ? (
                    <>
                      Provided on {formatDate(profile.consent_on)}
                      <span className="ml-2 text-mint-green">✓</span>
                    </>
                  ) : (
                    'Not recorded'
                  )}
                </p>
              </div>

              {profile?.guardian_consent_on && (
                <div>
                  <p className="text-sm font-semibold text-deep-navy/60 mb-1">Guardian Consent</p>
                  <p className="text-lg text-deep-navy">
                    Provided on {formatDate(profile.guardian_consent_on)}
                    <span className="ml-2 text-mint-green">✓</span>
                  </p>
                </div>
              )}

              {profile?.guardian_consent_doc && (
                <div className="bg-sky-blue/20 border-2 border-sky-blue rounded-[12px] p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                      <div>
                        <p className="font-semibold text-deep-navy">Guardian Consent Document</p>
                        <p className="text-sm text-deep-navy/60">Legal consent on file</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-sky-blue hover:bg-sky-blue/20"
                    >
                      <Download className="w-4 h-4" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {relationships.length > 0 && (
            <Card className="bg-white rounded-[24px] shadow-md p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-warm-cream flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-deep-navy" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-deep-navy mb-1">
                    Authorized Family Members
                  </h2>
                  <p className="text-body text-deep-navy/60">
                    People who can help manage your account
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {relationships.map((rel, index) => (
                  <div
                    key={index}
                    className="bg-soft-gray/30 rounded-[16px] p-6 hover:bg-soft-gray/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-deep-navy">
                        {rel.nok_name || 'Family Member'}
                      </h3>
                      {rel.is_primary_contact && (
                        <span className="px-3 py-1 bg-mint-green/20 text-mint-green rounded-full text-sm font-medium">
                          Primary Contact
                        </span>
                      )}
                    </div>
                    <p className="text-body text-deep-navy/70 mb-1">
                      {getRelationshipLabel(rel.relationship_type)}
                    </p>
                    <p className="text-sm text-deep-navy/60">{rel.nok_email}</p>
                    <p className="text-xs text-deep-navy/50 mt-2">
                      Added {formatDate(rel.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="bg-mint-green/10 border-2 border-mint-green rounded-[24px] p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-mint-green flex-shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-deep-navy mb-1">Privacy & Security</p>
                <p className="text-sm text-deep-navy/70">
                  Your information is securely stored and only accessible to you and your authorized
                  family members. We comply with HIPAA and data protection regulations.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
