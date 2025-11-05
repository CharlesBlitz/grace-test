import { Card } from '@/components/ui/card';
import { Mic, Heart, Bell, Users, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue/20 to-warm-cream p-6">
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-8">
          <Link href="/" className="text-sky-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-deep-navy mb-4">
            How It Works
          </h1>
          <p className="text-lg text-deep-navy/70">
            Simple, compassionate technology for everyday support
          </p>
        </div>

        <div className="space-y-6">
          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Mic className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Simple Voice Registration</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Getting started is as easy as having a conversation. Just speak naturally, and our AI guide will ask friendly questions to set up your account. No typing, no complex forms, no confusion.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>Talk at your own pace</li>
                  <li>The AI repeats information if needed</li>
                  <li>Family members can help or register independently</li>
                  <li>Optional voice sample for personalised reminders</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-mint-green rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Friendly AI Companion</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Grace is your always-available companion who listens, remembers, and cares. Have natural conversations about anything on your mind. Share memories, discuss your day, or simply chat when you feel lonely.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>Available 24/7 for conversation</li>
                  <li>Remembers previous conversations</li>
                  <li>Patient and understanding</li>
                  <li>Never judges or rushes you</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-sky-blue rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Gentle Reminders</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Never forget important tasks again. Grace sends friendly reminders for medications, appointments, meals, and daily activities. Optionally, hear reminders in a loved one's voice for extra comfort and familiarity.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>Medication reminders with caring messages</li>
                  <li>Appointment and event notifications</li>
                  <li>Meal and hydration prompts</li>
                  <li>Custom reminders for any activity</li>
                  <li>Voice cloning for familiar voices (optional)</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-coral-red rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Family Connection</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Keep loved ones informed and connected. When you need help or feel unwell, Grace can instantly notify your family members. They can also view reminder history and ensure you're staying on track.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>One-tap help requests to family</li>
                  <li>Automatic notifications for missed reminders</li>
                  <li>Family dashboard to view wellbeing</li>
                  <li>Secure messaging between family members</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-mint-green rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">5</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-8 h-8 text-mint-green" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Intelligent Learning</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Grace learns your preferences, routines, and needs over time. The more you interact, the better the experience becomes. Reminders become more personalised, conversations more meaningful, and support more proactive.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>Learns your daily routines</li>
                  <li>Adapts reminder timing to your habits</li>
                  <li>Recognises patterns in behaviour</li>
                  <li>Suggests helpful interventions proactively</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white rounded-[24px] shadow-lg p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-sky-blue rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">6</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-sky-blue" strokeWidth={1.5} />
                  <h2 className="text-2xl font-bold text-deep-navy">Private & Secure</h2>
                </div>
                <p className="text-deep-navy/80 leading-relaxed mb-4">
                  Your privacy is paramount. All conversations and data are encrypted and stored securely. We never sell your information, and you control who has access to your data.
                </p>
                <ul className="list-disc list-inside space-y-2 text-deep-navy/80 ml-4">
                  <li>End-to-end encryption</li>
                  <li>UK GDPR compliant</li>
                  <li>You control family access</li>
                  <li>Delete your data anytime</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-coral-red/10 to-mint-green/10 rounded-[24px] shadow-lg p-8 md:p-12 border-2 border-coral-red/20">
            <h2 className="text-2xl font-bold text-deep-navy mb-6 text-center">
              Technology Designed with Heart
            </h2>
            <p className="text-deep-navy/80 leading-relaxed text-center max-w-2xl mx-auto">
              Grace Companion combines cutting-edge AI with genuine compassion. We understand that technology can be overwhelming, especially for those facing cognitive challenges. That's why every feature is designed to be intuitive, forgiving, and centred around human connection.
            </p>
            <div className="mt-8 text-center">
              <Link href="/register">
                <button className="bg-coral-red hover:bg-coral-red/90 text-white px-8 py-4 rounded-[20px] text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105">
                  Get Started Today
                </button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
