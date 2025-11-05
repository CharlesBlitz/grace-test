'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Loader2, Phone, ArrowRight, Building2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import HomeNav from '@/components/HomeNav';

export default function LoginPage() {
  const router = useRouter();
  const { sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    // Remove leading 0 if present (UK mobile numbers start with 0)
    const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;

    if (withoutLeadingZero.length > 0) {
      return '+44' + withoutLeadingZero;
    }
    return '';
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      if (formattedPhone.length < 13 || formattedPhone.length > 14) {
        setError('Please enter a valid UK phone number (10-11 digits)');
        setLoading(false);
        return;
      }

      await sendOTP(formattedPhone, 'login');
      setStep('otp');
      setCountdown(600);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await verifyOTP(formattedPhone, otpCode, 'login');

      // Wait a moment to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Force a hard navigation to ensure fresh page load with auth state
      window.location.href = '/';
    } catch (err: any) {
      // Check if this is an admin account error
      if (err.message && err.message.includes('Admin Account Detected')) {
        setError('This phone number belongs to an admin account. Redirecting to admin login...');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
      } else {
        setError(err.message || 'Invalid verification code');
      }
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      await sendOTP(formattedPhone, 'login');
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
          <h1 className="text-3xl md:text-4xl font-bold text-deep-navy mb-2">Welcome Back</h1>
          <p className="text-body text-deep-navy/70">
            {step === 'phone' ? 'Enter your phone number to sign in' : 'Enter the code we sent you'}
          </p>
        </div>

        {error && (
          <Alert className="mb-6 bg-coral-red/10 border-coral-red text-coral-red">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <Label htmlFor="phone" className="text-deep-navy font-semibold mb-2 block">
                Phone Number
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-xl font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Send Verification Code
                </>
              )}
            </Button>
          </form>
        ) : (
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
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Sign In
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="link"
                onClick={() => setStep('phone')}
                className="text-deep-navy/70 hover:text-deep-navy p-0"
              >
                Change Number
              </Button>
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
        )}

        <div className="mt-8 text-center space-y-4">
          <p className="text-body text-deep-navy/70">
            Don't have an account?{' '}
            <Link href="/signup" className="text-sky-blue font-semibold hover:underline">
              Sign Up
            </Link>
          </p>

          <div className="pt-4 border-t border-deep-navy/10">
            <p className="text-sm text-deep-navy/60 mb-3">
              Are you a care facility or organisation?
            </p>
            <Link href="/organization">
              <Button variant="outline" className="w-full rounded-[12px]">
                <Building2 className="w-4 h-4 mr-2" />
                Register Your Organisation
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-deep-navy/10">
            <p className="text-sm text-deep-navy/60 mb-3">
              Are you a system administrator?
            </p>
            <Link href="/admin/login">
              <Button variant="outline" className="w-full rounded-[12px] border-blue-200 hover:bg-blue-50">
                <Shield className="w-4 h-4 mr-2" />
                Admin Portal Login
              </Button>
            </Link>
          </div>
        </div>
        </Card>
      </div>
    </main>
  );
}
