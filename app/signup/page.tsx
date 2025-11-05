'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, User, Users } from 'lucide-react';
import Link from 'next/link';
import HomeNav from '@/components/HomeNav';

export default function SignUpPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <HomeNav />

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            Welcome to Grace Companion
          </h1>
          <p className="text-xl md:text-2xl text-deep-navy/70">
            Choose how you'd like to get started
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card
            className="bg-gradient-to-br from-[#F4A89F] to-[#E89585] rounded-[24px] p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            onClick={() => router.push('/signup/voice')}
          >
            <div className="flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-md">
                <Mic className="w-14 h-14 text-[#F4A89F]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-[#2C3E50] mb-4">
                  Voice<br />Registration
                </h2>
                <p className="text-lg text-[#2C3E50]/90 leading-relaxed mb-4">
                  Talk naturally and I'll guide you through the entire process
                </p>
                <div className="inline-block bg-white/60 rounded-full px-6 py-2">
                  <span className="text-base font-semibold text-[#2C3E50]">Recommended</span>
                </div>
              </div>
              <Button className="w-full h-14 text-xl font-semibold rounded-[16px] bg-[#2C3E50] hover:bg-[#2C3E50]/90 text-white shadow-lg transition-all">
                Start Speaking
              </Button>
            </div>
          </Card>

          <Card
            className="bg-gradient-to-br from-[#A8D5BA] to-[#8BC9A0] rounded-[24px] p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            onClick={() => router.push('/signup/type')}
          >
            <div className="flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-md">
                <User className="w-14 h-14 text-[#A8D5BA]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-[#2C3E50] mb-4">
                  Type<br />Registration
                </h2>
                <p className="text-lg text-[#2C3E50]/90 leading-relaxed">
                  I prefer to fill out forms by typing
                </p>
              </div>
              <Button className="w-full h-14 text-xl font-semibold rounded-[16px] bg-[#2C3E50] hover:bg-[#2C3E50]/90 text-white shadow-lg transition-all">
                Continue
              </Button>
            </div>
          </Card>

          <Card
            className="bg-gradient-to-br from-[#A3C4E0] to-[#84B0D8] rounded-[24px] p-8 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            onClick={() => router.push('/signup/family-assisted')}
          >
            <div className="flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-md">
                <Users className="w-14 h-14 text-[#A3C4E0]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-[#2C3E50] mb-4">
                  Family Assisted
                </h2>
                <p className="text-lg text-[#2C3E50]/90 leading-relaxed">
                  Step-by-step guidance for family members
                </p>
              </div>
              <Button className="w-full h-14 text-xl font-semibold rounded-[16px] bg-[#2C3E50] hover:bg-[#2C3E50]/90 text-white shadow-lg transition-all">
                Family Registration
              </Button>
            </div>
          </Card>
        </div>

        <div className="text-center space-y-3 mb-8">
          <p className="text-2xl font-bold text-deep-navy">
            Voice Registration is the easiest and fastest option
          </p>
          <p className="text-lg text-deep-navy/70">
            Just speak naturally and let the AI guide you through everything
          </p>
        </div>

        <div className="text-center space-y-4">
          <p className="text-lg text-deep-navy/70">
            Already have an account?{' '}
            <Link href="/login" className="text-sky-blue font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
