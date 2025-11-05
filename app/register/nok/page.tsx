'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, UserPlus, Home } from 'lucide-react';
import Link from 'next/link';

export default function NoKRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'nok' | 'elder'>('nok');
  const [nokData, setNokData] = useState({
    name: '',
    email: '',
    relationship: '',
    phone: '',
  });
  const [elderData, setElderData] = useState({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNoKSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nokData.name || !nokData.email || !nokData.relationship) {
      setError('Please fill in all required fields');
      return;
    }

    sessionStorage.setItem('nokRegistrationData', JSON.stringify(nokData));
    setStep('elder');
  };

  const handleElderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!elderData.name || !elderData.email) {
        throw new Error('Please fill in all elder information');
      }

      sessionStorage.setItem('elderRegistrationData', JSON.stringify(elderData));
      sessionStorage.setItem('registrationMethod', 'nok-assisted');
      router.push('/register/nok/consent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/register">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20 flex items-center gap-2"
              aria-label="Return to home page"
            >
              <Home className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-semibold">Home</span>
            </Button>
          </Link>
        </div>

        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-mint-green rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-bold text-deep-navy mb-2">
              Family-Assisted Registration
            </h1>
            <p className="text-lg text-deep-navy/70">
              {step === 'nok' ? 'Step 1 of 2: Your Information' : 'Step 2 of 2: Elder Information'}
            </p>
          </div>

          {step === 'nok' && (
            <div>
              <div className="bg-sky-blue/20 rounded-[16px] p-6 mb-8">
                <p className="text-lg text-deep-navy leading-relaxed">
                  As a family member or guardian, you can register on behalf of someone with dementia
                  or cognitive impairment. You'll provide consent and set up their account.
                </p>
                <Link href="/register/nok/voice" className="block mt-4">
                  <Button className="w-full h-14 text-lg font-semibold rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white">
                    Use Voice Registration Instead
                  </Button>
                </Link>
              </div>

              <form onSubmit={handleNoKSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nok-name" className="text-lg text-deep-navy">
                    Your Name (Family Member/Guardian)
                  </Label>
                  <Input
                    id="nok-name"
                    type="text"
                    value={nokData.name}
                    onChange={(e) => setNokData({ ...nokData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nok-email" className="text-lg text-deep-navy">
                    Your Email Address
                  </Label>
                  <Input
                    id="nok-email"
                    type="email"
                    value={nokData.email}
                    onChange={(e) => setNokData({ ...nokData, email: e.target.value })}
                    placeholder="your.email@example.com"
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship" className="text-lg text-deep-navy">
                    Your Relationship
                  </Label>
                  <Select
                    value={nokData.relationship}
                    onValueChange={(value) => setNokData({ ...nokData, relationship: value })}
                  >
                    <SelectTrigger className="h-14 text-lg rounded-[16px] border-2 border-soft-gray">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="legal-guardian">Legal Guardian</SelectItem>
                      <SelectItem value="caregiver">Professional Caregiver</SelectItem>
                      <SelectItem value="other">Other Family Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nok-phone" className="text-lg text-deep-navy">
                    Your Phone Number (Optional)
                  </Label>
                  <Input
                    id="nok-phone"
                    type="tel"
                    value={nokData.phone}
                    onChange={(e) => setNokData({ ...nokData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                  />
                </div>

                {error && (
                  <div className="bg-coral-red/10 border-2 border-coral-red rounded-[16px] p-4">
                    <p className="text-coral-red text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  Continue to Elder Information
                </Button>
              </form>
            </div>
          )}

          {step === 'elder' && (
            <div>
              <div className="bg-mint-green/20 rounded-[16px] p-6 mb-8">
                <p className="text-lg text-deep-navy leading-relaxed">
                  Now, please provide information about the person you're registering for.
                </p>
              </div>

              <form onSubmit={handleElderSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="elder-name" className="text-lg text-deep-navy">
                    Their Name
                  </Label>
                  <Input
                    id="elder-name"
                    type="text"
                    value={elderData.name}
                    onChange={(e) => setElderData({ ...elderData, name: e.target.value })}
                    placeholder="Enter their full name"
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elder-email" className="text-lg text-deep-navy">
                    Their Email Address (Optional)
                  </Label>
                  <Input
                    id="elder-email"
                    type="email"
                    value={elderData.email}
                    onChange={(e) => setElderData({ ...elderData, email: e.target.value })}
                    placeholder="their.email@example.com"
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                  />
                  <p className="text-sm text-deep-navy/60">
                    If they don't have an email, we'll create one using your email as a reference
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elder-timezone" className="text-lg text-deep-navy">
                    Their Timezone
                  </Label>
                  <Input
                    id="elder-timezone"
                    type="text"
                    value={elderData.timezone}
                    onChange={(e) => setElderData({ ...elderData, timezone: e.target.value })}
                    className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-coral-red/10 border-2 border-coral-red rounded-[16px] p-4">
                    <p className="text-coral-red text-center">{error}</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setStep('nok')}
                    variant="outline"
                    className="flex-1 h-14 text-xl rounded-[24px] border-2"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-14 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    {loading ? 'Processing...' : 'Continue'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
