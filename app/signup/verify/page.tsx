'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import HomeNav from '@/components/HomeNav';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOTP, sendOTP } = useAuth();

  const phoneNumber = searchParams.get('phone') || '';
  const name = searchParams.get('name') || '';
  const role = (searchParams.get('role') || 'elder') as 'elder' | 'nok';
  const registrationMethod = searchParams.get('method') || 'type';

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(600);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (!phoneNumber || !name) {
      router.push('/signup');
    }
  }, [phoneNumber, name, router]);

  const formatPhoneNumber = (value: string) => {
    if (value.startsWith('+')) return value;
    const cleaned = value.replace(/\D/g, '');
    // Remove leading 0 if present (UK mobile numbers start with 0)
    const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

    if (withoutLeadingZero.length > 0) {
      return '+44' + withoutLeadingZero;
    }
    return '';
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await verifyOTP(formattedPhone, otpCode, 'signup', name, role, registrationMethod);

      // Wait a moment to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force a hard navigation to ensure fresh page load with auth state
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await sendOTP(formattedPhone, 'signup');
      setCountdown(600);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-md mx-auto">
        <HomeNav />
        <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-lg p-8 md:p-12 w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-deep-navy mb-2">Verify Your Number</h1>
            <p className="text-body text-deep-navy/70">
              Enter the code we sent you
            </p>
          </div>

          {error && (
            <Alert className="mb-6 bg-coral-red/10 border-coral-red text-coral-red">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <Label htmlFor="otp" className="text-deep-navy font-semibold mb-2 block">
                Verification Code
              </Label>
              <Input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                className="h-12 text-lg rounded-[12px] text-center tracking-widest"
              />
              <p className="text-sm text-deep-navy/60 mt-2">
                Code sent to {formatPhoneNumber(phoneNumber)}
              </p>
              {countdown > 0 && (
                <p className="text-sm text-sky-blue mt-1">
                  Code expires in {formatTime(countdown)}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full h-14 text-xl font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Create Account
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/signup">
                <Button
                  type="button"
                  variant="link"
                  className="text-deep-navy/70 hover:text-deep-navy p-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </Link>
              <Button
                type="button"
                variant="link"
                onClick={handleResendOTP}
                disabled={countdown > 0 || loading}
                className="text-sky-blue hover:text-sky-blue/80 p-0"
              >
                {countdown > 0 ? `Resend (${formatTime(countdown)})` : 'Resend Code'}
              </Button>
            </div>
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

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream flex items-center justify-center">
        <div className="text-2xl text-deep-navy animate-pulse">Loading...</div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}
