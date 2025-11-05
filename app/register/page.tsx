'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { User, Users, Mic, Home } from 'lucide-react';
import Link from 'next/link';
import HomeNav from '@/components/HomeNav';

export default function RegisterPage() {
  const router = useRouter();
  const [showSelfRegistration, setShowSelfRegistration] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.email) {
        throw new Error('Please fill in all fields');
      }

      sessionStorage.setItem('registrationData', JSON.stringify(formData));
      router.push('/register/consent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!showSelfRegistration) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <HomeNav />
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
                Welcome to Grace Companion
              </h1>
              <p className="text-xl text-deep-navy/70">
                Choose how you'd like to get started
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/register/voice" className="block">
                <Card className="bg-gradient-to-br from-coral-red to-coral-red/80 rounded-[24px] p-8 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl h-full">
                  <div className="flex flex-col items-center text-center space-y-6 h-full">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                      <Mic className="w-12 h-12 text-coral-red" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-deep-navy mb-3">
                        Voice Registration
                      </h2>
                      <p className="text-lg text-deep-navy/80 leading-relaxed">
                        Talk naturally and I'll guide you through the entire process
                      </p>
                      <div className="mt-3 inline-block bg-white/50 rounded-full px-4 py-1">
                        <span className="text-sm font-semibold text-deep-navy">Recommended</span>
                      </div>
                    </div>
                    <Button className="w-full h-12 text-lg font-semibold rounded-[16px] bg-deep-navy hover:bg-deep-navy/90 text-white">
                      Start Speaking
                    </Button>
                  </div>
                </Card>
              </Link>

              <Card
                className="bg-gradient-to-br from-mint-green to-mint-green/80 rounded-[24px] p-8 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl h-full"
                onClick={() => setShowSelfRegistration(true)}
              >
                <div className="flex flex-col items-center text-center space-y-6 h-full">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-mint-green" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-deep-navy mb-3">
                      Type Registration
                    </h2>
                    <p className="text-lg text-deep-navy/80 leading-relaxed">
                      I prefer to fill out forms by typing
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowSelfRegistration(true)}
                    className="w-full h-12 text-lg font-semibold rounded-[16px] bg-deep-navy hover:bg-deep-navy/90 text-white"
                  >
                    Continue
                  </Button>
                </div>
              </Card>

              <Link href="/register/nok" className="block">
                <Card className="bg-gradient-to-br from-sky-blue to-sky-blue/80 rounded-[24px] p-8 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl h-full">
                  <div className="flex flex-col items-center text-center space-y-6 h-full">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                      <Users className="w-12 h-12 text-sky-blue" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-deep-navy mb-3">
                        Family Assisted
                      </h2>
                      <p className="text-lg text-deep-navy/80 leading-relaxed">
                        Step-by-step guidance for family members
                      </p>
                    </div>
                    <Button className="w-full h-12 text-lg font-semibold rounded-[16px] bg-deep-navy hover:bg-deep-navy/90 text-white">
                      Family Registration
                    </Button>
                  </div>
                </Card>
              </Link>
            </div>

            <div className="mt-8 text-center space-y-2">
              <p className="text-lg font-semibold text-deep-navy">
                Voice Registration is the easiest and fastest option
              </p>
              <p className="text-deep-navy/60">
                Just speak naturally and let the AI guide you through everything
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button
            onClick={() => setShowSelfRegistration(false)}
            variant="ghost"
            className="text-deep-navy hover:bg-white/20 mb-4"
          >
            Back to Options
          </Button>
          <div className="flex justify-end">
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
        </div>
        <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-deep-navy mb-2">
              Welcome to Grace Companion
            </h1>
            <p className="text-lg text-deep-navy/70">
              Let's get to know you
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg text-deep-navy">
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg text-deep-navy">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-lg text-deep-navy">
                Timezone
              </Label>
              <Input
                id="timezone"
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="h-14 text-lg rounded-[16px] border-2 border-soft-gray focus:border-sky-blue"
                required
              />
            </div>

            {error && (
              <div className="bg-coral-red/10 border-2 border-coral-red rounded-[16px] p-4">
                <p className="text-coral-red text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
