'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import { SignatureCapture, ElectronicSignatureData } from '@/lib/signatureCapture';

interface ElectronicSignatureProps {
  userId: string;
  documentId: string;
  consentStatement: string;
  documentTitle: string;
  requiresTypedName?: boolean;
  onSignatureComplete: (signatureId: string) => void;
  onCancel?: () => void;
}

export default function ElectronicSignature({
  userId,
  documentId,
  consentStatement,
  documentTitle,
  requiresTypedName = true,
  onSignatureComplete,
  onCancel,
}: ElectronicSignatureProps) {
  const [signatoryName, setSignatoryName] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!hasAgreed) {
      setError('You must agree to the statement by checking the box');
      return;
    }

    if (requiresTypedName && !signatoryName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Capture metadata
      const metadata = await SignatureCapture.captureMetadata();

      // Create electronic signature data
      const signatureData: ElectronicSignatureData = {
        signatureType: 'electronic_checkbox',
        signatoryName: signatoryName.trim(),
        signatoryStatement: consentStatement,
        metadata,
      };

      // Save signature
      const result = await SignatureCapture.saveElectronicSignature(
        userId,
        documentId,
        signatureData
      );

      if (result.success && result.signatureId) {
        onSignatureComplete(result.signatureId);
      } else {
        setError(result.error || 'Failed to save signature');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <Card className="bg-white rounded-[24px] shadow-lg p-8">
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-sky-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PenTool className="w-10 h-10 text-sky-blue" />
          </div>
          <h2 className="text-2xl font-bold text-deep-navy mb-2">Electronic Signature</h2>
          <p className="text-deep-navy/70">
            Sign electronically by checking the box and typing your name
          </p>
        </div>

        <div className="bg-soft-gray/30 rounded-[16px] p-6">
          <h3 className="font-semibold text-deep-navy mb-3">{documentTitle}</h3>
          <p className="text-deep-navy/80 leading-relaxed">
            {consentStatement}
          </p>
        </div>

        <div className="border border-deep-navy/10 rounded-[16px] p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked as boolean)}
              className="mt-1"
            />
            <label htmlFor="agree" className="flex-1 cursor-pointer">
              <p className="text-deep-navy leading-relaxed">
                I have read and agree to the above statement. I understand that by checking this box
                and typing my name below, I am creating a legally binding electronic signature.
              </p>
            </label>
          </div>

          {requiresTypedName && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-deep-navy">
                Your Full Name (as it appears on legal documents)
              </label>
              <Input
                id="name"
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g., John Michael Smith"
                className="h-12 text-lg rounded-[12px]"
                disabled={isProcessing}
              />
            </div>
          )}
        </div>

        <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
          <h3 className="font-semibold text-deep-navy mb-2">Legal Validity</h3>
          <p className="text-sm text-deep-navy/70">
            Under UK law (Electronic Communications Act 2000), this electronic signature is legally
            binding and has the same effect as a handwritten signature. Your signature will be recorded
            with a timestamp, IP address, and device information for verification purposes.
          </p>
        </div>

        {error && (
          <div className="bg-coral-red/10 border border-coral-red/30 rounded-[16px] p-4">
            <div className="flex items-center gap-2 text-coral-red">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-mint-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-deep-navy/80">
                <strong>Signing Date:</strong> {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-deep-navy/80 mt-1">
                <strong>Your Rights:</strong> You can withdraw this consent at any time through your
                Data Management settings, subject to legal retention requirements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 h-14 text-lg rounded-[16px]"
              disabled={isProcessing}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!hasAgreed || isProcessing || (requiresTypedName && !signatoryName.trim())}
            className="flex-1 h-14 text-lg font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
          >
            {isProcessing ? 'Processing...' : 'Sign Document'}
          </Button>
        </div>

        <p className="text-xs text-center text-deep-navy/50">
          This signature will be securely stored and can be viewed in your account history
        </p>
      </div>
    </Card>
  );
}
