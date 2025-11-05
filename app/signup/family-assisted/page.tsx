'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, Loader2, Phone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import HomeNav from '@/components/HomeNav';

export default function FamilyAssistedSignUpPage() {
  const router = useRouter();
  const { sendOTP } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'elder' | 'nok'>('nok');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    // Remove leading 0 if present (UK mobile numbers start with 0)
    const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

    if (withoutLeadingZero.length > 0) {
      return '+44' + withoutLeadingZero;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      if (!name.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }

      if (formattedPhone.length < 13 || formattedPhone.length > 14) {
        setError('Please enter a valid UK phone number (10-11 digits)');
        setLoading(false);
        return;
      }

      await sendOTP(formattedPhone, 'signup');

      router.push(`/signup/verify?phone=${encodeURIComponent(formattedPhone)}&name=${encodeURIComponent(name)}&role=${role}&method=family_assisted`);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-md mx-auto">
        <HomeNav />
        <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-lg p-8 md:p-12 w-full">
          <div className="flex items-center justify-between mb-8">
            <Link href="/signup">
              <Button variant="ghost" className="p-2" aria-label="Go back">
                <ArrowLeft className="w-6 h-6 text-deep-navy" strokeWidth={1.5} />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#A3C4E0] rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-deep-navy">Family Assisted</h2>
                <p className="text-xs text-deep-navy/60">Step 1 of 2</p>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-deep-navy mb-2">Help Your Loved One</h1>
            <p className="text-body text-deep-navy/70">
              We'll guide you through setting up their account
            </p>
          </div>

          {error && (
            <Alert className="mb-6 bg-coral-red/10 border-coral-red text-coral-red">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-deep-navy font-semibold mb-2 block">
                Your Name (Family Member)
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="h-12 text-lg rounded-[12px]"
              />
              <p className="text-sm text-deep-navy/60 mt-1">
                We'll ask for your loved one's details after verification
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="text-deep-navy font-semibold mb-2 block">
                Your Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-navy/50" />
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07XXX XXXXXX"
                  required
                  className="h-12 text-lg rounded-[12px] pl-12"
                />
              </div>
              <p className="text-sm text-deep-navy/60 mt-2">
                We'll send you a verification code via SMS
              </p>
            </div>

            <div>
              <Label className="text-deep-navy font-semibold mb-3 block">I am registering for...</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'elder' | 'nok')}>
                <div className="flex items-center space-x-3 bg-soft-gray/20 rounded-[12px] p-4 mb-3">
                  <RadioGroupItem value="nok" id="nok" />
                  <Label htmlFor="nok" className="cursor-pointer flex-1">
                    <span className="font-semibold text-deep-navy">My Loved One</span>
                    <p className="text-sm text-deep-navy/60">I'm helping a family member get set up</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 bg-soft-gray/20 rounded-[12px] p-4">
                  <RadioGroupItem value="elder" id="elder" />
                  <Label htmlFor="elder" className="cursor-pointer flex-1">
                    <span className="font-semibold text-deep-navy">Myself (with assistance)</span>
                    <p className="text-sm text-deep-navy/60">I need help setting up my own account</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-xl font-semibold rounded-[16px] bg-[#A3C4E0] hover:bg-[#A3C4E0]/90 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Send Verification Code
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-body text-deep-navy/70">
              Already have an account?{' '}
              <Link href="/login" className="text-sky-blue font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
