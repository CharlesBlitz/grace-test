'use client';

import { useState } from 'react';
import { Mic, Pill, Mail, Heart, History, FileText, LogIn, UserPlus, LayoutDashboard, LogOut, Building2, Users, ArrowRight, Activity, Settings, Calendar, Camera, BookOpen, Code, MapPin, Brain, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import EmergencyHelp from '@/components/EmergencyHelp';
import GraceLogo from '@/components/GraceLogo';

export default function Home() {
  const { user, profile, loading, signOut } = useAuth();
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12 flex items-center justify-center">
        <div className="text-2xl text-deep-navy animate-pulse">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="bg-gradient-to-r from-sky-blue via-warm-cream to-sky-blue rounded-[24px] shadow-lg p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-sunburst from-white/30 to-transparent opacity-50"></div>
            <div className="absolute top-6 left-6 z-10">
              <GraceLogo size="medium" variant="color" animated />
            </div>
            <h1 className="relative text-heading-lg md:text-5xl font-bold text-deep-navy mb-4">
              Website Title
            </h1>
            <p className="relative text-xl text-deep-navy/80 mb-8">
              Complete care technology suite for elders, families, care facilities and independent professionals
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Link href="/login" className="block">
                <Button
                  className="w-full h-24 text-2xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  <LogIn className="w-8 h-8 mr-4" strokeWidth={1.5} />
                  Sign In
                </Button>
              </Link>
              <div className="text-center">
                <p className="text-base text-deep-navy/70 font-bold">
                  For existing Grace members and family caregivers
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/signup" className="block">
                <Button
                  className="w-full h-24 text-2xl font-semibold rounded-[24px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  <UserPlus className="w-8 h-8 mr-4" strokeWidth={1.5} />
                  Create Account
                </Button>
              </Link>
              <div className="text-center">
                <p className="text-base text-deep-navy/70 font-bold">
                  Ideal for Individuals & Families getting started
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border-2 border-mint-green/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-mint-green/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-deep-navy">For Individuals & Families</h2>
              </div>
              <div className="space-y-3 text-deep-navy/80 mb-6">
                <p className="flex items-start">
                  <Mic className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-mint-green" strokeWidth={1.5} />
                  <span>Voice-activated conversations and daily support</span>
                </p>
                <p className="flex items-start">
                  <Heart className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-coral-red" strokeWidth={1.5} />
                  <span>Connect with family members for well-being monitoring</span>
                </p>
                <p className="flex items-start">
                  <Pill className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-sky-blue" strokeWidth={1.5} />
                  <span>Smart reminders for medications and appointments</span>
                </p>
              </div>
              <Link href="/pricing" className="block">
                <Button className="w-full h-12 rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold">
                  <UserPlus className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  View Plans & Pricing
                </Button>
              </Link>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border-2 border-sky-blue/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-sky-blue/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-deep-navy">For Care Facilities</h2>
              </div>
              <div className="space-y-3 text-deep-navy/80 mb-6">
                <p className="flex items-start">
                  <Users className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-sky-blue" strokeWidth={1.5} />
                  <span>Manage multiple residents from a single dashboard</span>
                </p>
                <p className="flex items-start">
                  <LayoutDashboard className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-sky-blue" strokeWidth={1.5} />
                  <span>Staff coordination and care team management</span>
                </p>
                <p className="flex items-start">
                  <FileText className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-sky-blue" strokeWidth={1.5} />
                  <span>Analytics, reporting, and compliance tools</span>
                </p>
              </div>
              <Link href="/organization" className="block">
                <Button className="w-full h-12 rounded-[16px] bg-sky-blue hover:bg-sky-blue/90 text-white font-semibold">
                  <ArrowRight className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Learn More
                </Button>
              </Link>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border-2 border-emerald-600/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-deep-navy">For Care Professionals</h2>
              </div>
              <div className="space-y-3 text-deep-navy/80 mb-6">
                <p className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-emerald-600" strokeWidth={1.5} />
                  <span>Mobile field documentation with GPS verification</span>
                </p>
                <p className="flex items-start">
                  <Brain className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-emerald-600" strokeWidth={1.5} />
                  <span>AI-powered notes and UK statutory templates</span>
                </p>
                <p className="flex items-start">
                  <Shield className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-emerald-600" strokeWidth={1.5} />
                  <span>Complete practice management and CQC compliance</span>
                </p>
              </div>
              <Link href="/grace-notes" className="block">
                <Button className="w-full h-12 rounded-[16px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <ArrowRight className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Explore Grace Notes
                </Button>
              </Link>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/features" className="block">
              <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border-2 border-sky-blue/30 hover:border-sky-blue transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-sky-blue/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-sky-blue" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-deep-navy">Explore Features</h3>
                </div>
                <p className="text-deep-navy/70 text-sm">
                  Discover all the ways our suite can support you, your loved ones, and your practice
                </p>
              </Card>
            </Link>

            <Link href="/system-overview" className="block">
              <Card className="bg-white/80 backdrop-blur-sm rounded-[20px] p-6 border-2 border-mint-green/30 hover:border-mint-green transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-mint-green/20 flex items-center justify-center">
                    <Code className="w-5 h-5 text-mint-green" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-deep-navy">System Overview</h3>
                </div>
                <p className="text-deep-navy/70 text-sm">
                  Learn about our platform architecture, security and technology
                </p>
              </Card>
            </Link>
          </div>

          <div className="text-center">
            <Link href="/register" className="text-sky-blue hover:underline text-lg">
              New to Grace? Start the registration process →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <div className="flex gap-3">
            {profile?.is_admin && (
              <Link href="/admin/monitoring">
                <Button variant="outline" className="rounded-[16px] border-blue-200 bg-blue-50 hover:bg-blue-100">
                  <Shield className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Admin Portal
                </Button>
              </Link>
            )}
            {profile?.role === 'nok' && (
              <Link href="/nok-dashboard">
                <Button variant="outline" className="rounded-[16px]">
                  <LayoutDashboard className="w-5 h-5 mr-2" strokeWidth={1.5} />
                  Dashboard
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
              }}
              className="rounded-[16px]"
            >
              <LogOut className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Sign Out
            </Button>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-sky-blue via-warm-cream to-sky-blue rounded-[24px] shadow-lg p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-sunburst from-white/30 to-transparent opacity-50"></div>
          <div className="absolute top-6 left-6 z-10">
            <GraceLogo size="medium" variant="color" animated />
          </div>
          {profile?.is_admin && (
            <div className="relative flex justify-center mb-3">
              <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                <Shield className="w-4 h-4 mr-2" strokeWidth={2} />
                System Administrator
              </span>
            </div>
          )}
          <h1 className="relative text-heading-lg md:text-4xl font-bold text-deep-navy mb-2">
            {`${greeting}, ${profile?.name || 'there'}!`}
          </h1>
          <p className="relative text-body text-deep-navy/80">
            How can I help you today?
          </p>
        </Card>

        <div className="space-y-6">
          <Link href="/chat" className="block">
            <Button
              className="w-full h-20 text-xl font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-mint-green/50"
              aria-label="Start talking with Grace Companion"
            >
              <Mic className="w-8 h-8 mr-4 animate-pulse-gentle" strokeWidth={1.5} />
              Talk to Me
            </Button>
          </Link>

          <Link href="/reminders" className="block">
            <Button
              className="w-full h-20 text-xl font-semibold rounded-[24px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-sky-blue/50"
              aria-label="View your reminders and daily tasks"
            >
              <Pill className="w-8 h-8 mr-4" strokeWidth={1.5} />
              Reminders
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/medications" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-sky-blue/50"
                aria-label="View and track your medications"
              >
                <Pill className="w-7 h-7 mr-3" strokeWidth={1.5} />
                Medications
              </Button>
            </Link>

            <Link href="/wellness" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-mint-green/50"
                aria-label="Daily wellness check-in"
              >
                <Heart className="w-7 h-7 mr-3" strokeWidth={1.5} />
                Wellness
              </Button>
            </Link>
          </div>

          <Link href="/messages" className="block">
            <Button
              className="w-full h-20 text-xl font-semibold rounded-[24px] bg-warm-cream hover:bg-warm-cream/90 text-deep-navy border-2 border-soft-gray shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-soft-gray/50"
              aria-label="View messages from your family"
            >
              <Mail className="w-8 h-8 mr-4" strokeWidth={1.5} />
              Messages
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/voice-messages" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-sky-blue hover:bg-sky-blue/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-sky-blue/50"
                aria-label="Voice messages with family"
              >
                <Mic className="w-7 h-7 mr-3" strokeWidth={1.5} />
                Voice Messages
              </Button>
            </Link>

            <Link href="/photos" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-mint-green hover:bg-mint-green/90 text-deep-navy shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-mint-green/50"
                aria-label="Share photos with family"
              >
                <Camera className="w-7 h-7 mr-3" strokeWidth={1.5} />
                Photos
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Link href="/my-activity" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-white hover:bg-white/90 text-deep-navy border-2 border-sky-blue shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-sky-blue/50"
                aria-label="View your activity log"
              >
                <Activity className="w-7 h-7 mr-2" strokeWidth={1.5} />
                Activity
              </Button>
            </Link>

            <Link href="/calendar" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-white hover:bg-white/90 text-deep-navy border-2 border-mint-green shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-mint-green/50"
                aria-label="View your calendar"
              >
                <Calendar className="w-7 h-7 mr-2" strokeWidth={1.5} />
                Calendar
              </Button>
            </Link>

            <Link href="/settings" className="block">
              <Button
                className="w-full h-20 text-lg font-semibold rounded-[24px] bg-white hover:bg-white/90 text-deep-navy border-2 border-soft-gray shadow-md transition-all duration-200 hover:scale-[1.02] focus:ring-4 focus:ring-soft-gray/50"
                aria-label="Adjust your settings"
              >
                <Settings className="w-7 h-7 mr-2" strokeWidth={1.5} />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="fixed bottom-8 right-8 z-50">
          <EmergencyHelp />
        </div>
      </div>
    </main>
  );
}
