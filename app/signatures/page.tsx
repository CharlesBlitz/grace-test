'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/authContext';
import { SignatureCapture } from '@/lib/signatureCapture';
import {
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  Volume2,
  PenTool,
  Shield,
  Eye,
  Download,
} from 'lucide-react';
import Link from 'next/link';

interface SignatureRecord {
  id: string;
  signature_type: string;
  signature_method: string;
  signatory_name: string;
  signatory_statement: string;
  signed_at: string;
  is_verified: boolean;
  verification_method: string;
  consent_given: boolean;
  consent_withdrawn_at: string | null;
  is_guardian_signature: boolean;
  witness_name: string | null;
  consent_documents: {
    document_type: string;
    title: string;
    version: string;
  };
}

export default function SignaturesPage() {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignature, setSelectedSignature] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSignatures();
    }
  }, [user]);

  const loadSignatures = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await SignatureCapture.getUserSignatures(user.id);
      setSignatures(data);
    } catch (error) {
      console.error('Failed to load signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewSignatureDetails = async (signatureId: string) => {
    try {
      const details = await SignatureCapture.getSignatureDetails(signatureId);
      setSelectedSignature(details);
    } catch (error) {
      console.error('Failed to load signature details:', error);
    }
  };

  const getSignatureIcon = (type: string) => {
    switch (type) {
      case 'voice_signature':
      case 'biometric_voice':
        return <Volume2 className="w-5 h-5" />;
      case 'drawn_signature':
        return <PenTool className="w-5 h-5" />;
      case 'guardian_signature':
        return <Shield className="w-5 h-5" />;
      default:
        return <FileSignature className="w-5 h-5" />;
    }
  };

  const formatSignatureType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="max-w-4xl mx-auto py-12 text-center">
          <p className="text-deep-navy/70 mb-4">Please log in to view your signatures</p>
          <Link href="/login">
            <Button>Log In</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
        <div className="max-w-6xl mx-auto py-12">
          <p className="text-center text-deep-navy/70">Loading signatures...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-6xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Your Signatures
          </h1>
          <p className="text-lg text-deep-navy/70">
            View and manage all your electronic and voice signatures
          </p>
        </div>

        {signatures.length === 0 ? (
          <Card className="p-12 bg-white rounded-[24px] text-center">
            <FileSignature className="w-16 h-16 text-deep-navy/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-deep-navy mb-2">No Signatures Yet</h2>
            <p className="text-deep-navy/70 mb-6">
              You haven't created any signatures yet. Signatures will appear here when you consent to documents.
            </p>
            <Link href="/register/consent/enhanced">
              <Button className="rounded-[12px]">Complete Registration</Button>
            </Link>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-white rounded-[16px] p-1">
              <TabsTrigger value="all" className="rounded-[12px]">
                All Signatures ({signatures.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-[12px]">
                Active ({signatures.filter(s => s.consent_given).length})
              </TabsTrigger>
              <TabsTrigger value="withdrawn" className="rounded-[12px]">
                Withdrawn ({signatures.filter(s => !s.consent_given).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4">
                {signatures.map((sig) => (
                  <Card key={sig.id} className="p-6 bg-white rounded-[16px]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-sky-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {getSignatureIcon(sig.signature_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-deep-navy">
                              {sig.consent_documents.title}
                            </h3>
                            {sig.is_verified ? (
                              <Badge className="bg-mint-green/20 text-mint-green border-mint-green/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {!sig.consent_given && (
                              <Badge className="bg-coral-red/20 text-coral-red border-coral-red/30">
                                <XCircle className="w-3 h-3 mr-1" />
                                Withdrawn
                              </Badge>
                            )}
                            {sig.is_guardian_signature && (
                              <Badge variant="outline">
                                <Shield className="w-3 h-3 mr-1" />
                                Guardian
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-deep-navy/70 mb-2">
                            <strong>Type:</strong> {formatSignatureType(sig.signature_type)} •
                            <strong> Version:</strong> {sig.consent_documents.version}
                          </p>

                          <p className="text-sm text-deep-navy/60">
                            Signed by <strong>{sig.signatory_name}</strong> on{' '}
                            {new Date(sig.signed_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>

                          {sig.witness_name && (
                            <p className="text-sm text-deep-navy/60 mt-1">
                              Witnessed by: {sig.witness_name}
                            </p>
                          )}

                          {sig.consent_withdrawn_at && (
                            <p className="text-sm text-coral-red mt-2">
                              Consent withdrawn on{' '}
                              {new Date(sig.consent_withdrawn_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => viewSignatureDetails(sig.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-[12px]"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="space-y-4">
                {signatures.filter(s => s.consent_given).map((sig) => (
                  <Card key={sig.id} className="p-6 bg-white rounded-[16px]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-mint-green" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-deep-navy mb-2">
                            {sig.consent_documents.title}
                          </h3>
                          <p className="text-sm text-deep-navy/70">
                            {formatSignatureType(sig.signature_type)} • Active since{' '}
                            {new Date(sig.signed_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => viewSignatureDetails(sig.id)}
                        variant="outline"
                        size="sm"
                        className="rounded-[12px]"
                      >
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="withdrawn">
              <div className="space-y-4">
                {signatures.filter(s => !s.consent_given).length === 0 ? (
                  <Card className="p-12 bg-white rounded-[24px] text-center">
                    <p className="text-deep-navy/70">No withdrawn consents</p>
                  </Card>
                ) : (
                  signatures.filter(s => !s.consent_given).map((sig) => (
                    <Card key={sig.id} className="p-6 bg-white rounded-[16px] opacity-60">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-coral-red/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <XCircle className="w-6 h-6 text-coral-red" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-deep-navy mb-2">
                            {sig.consent_documents.title}
                          </h3>
                          <p className="text-sm text-deep-navy/70">
                            Consent withdrawn on{' '}
                            {sig.consent_withdrawn_at &&
                              new Date(sig.consent_withdrawn_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Card className="mt-8 p-8 bg-white rounded-[24px]">
          <h2 className="text-2xl font-bold text-deep-navy mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-mint-green" />
            About Electronic & Voice Signatures
          </h2>
          <div className="space-y-4 text-deep-navy/80">
            <p>
              All signatures displayed here are legally binding under UK law (Electronic Communications Act 2000).
              Each signature includes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Timestamp of when the signature was created</li>
              <li>IP address and device information for verification</li>
              <li>Document version you agreed to</li>
              <li>Verification status and method</li>
              <li>Complete audit trail for legal compliance</li>
            </ul>
            <p className="mt-4">
              Voice signatures are particularly suitable for elderly users and those with accessibility needs.
              They provide clear evidence of consent and are easier to create than traditional handwritten signatures.
            </p>
            <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[12px] p-4 mt-4">
              <p className="text-sm">
                <strong>Your Rights:</strong> You can withdraw consent for any signature at any time through your{' '}
                <Link href="/data-management" className="text-sky-blue hover:underline">
                  Data Management Dashboard
                </Link>
                , subject to legal retention requirements for safeguarding purposes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
