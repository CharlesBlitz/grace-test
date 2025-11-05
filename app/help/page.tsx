'use client';

import { useState, useEffect } from 'react';
import { Heart, Phone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function HelpPage() {
  const [helpRequested, setHelpRequested] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    if (helpRequested && !audioPlaying) {
      playReassuranceAudio();
    }
  }, [helpRequested]);

  const requestHelp = async () => {
    setHelpRequested(true);

    try {
      const response = await fetch('/api/help/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elderId: 'demo-elder-id' }),
      });

      if (!response.ok) {
        console.error('Failed to notify family');
      }
    } catch (error) {
      console.error('Error requesting help:', error);
    }
  };

  const playReassuranceAudio = () => {
    setAudioPlaying(true);

    const utterance = new SpeechSynthesisUtterance(
      "Don't worry, everything is going to be okay. I'm contacting your family right now. They'll be with you soon. You're not alone."
    );
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onend = () => setAudioPlaying(false);

    speechSynthesis.speak(utterance);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-coral-red to-warm-cream p-6 md:p-12 relative">
      <div className="max-w-4xl mx-auto">
        {!helpRequested && (
          <div className="absolute top-6 left-6">
            <Link href="/">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/20"
                aria-label="Go back to home"
              >
                <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>
        )}

        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
          {!helpRequested ? (
            <>
              <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-2xl p-12 text-center max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold text-deep-navy mb-4">
                  Do you need help?
                </h1>
                <p className="text-xl text-deep-navy/70 mb-8 leading-relaxed">
                  Press the button below and we'll contact your family right away.
                  Help will be on its way soon.
                </p>
              </Card>

              <Button
                onClick={requestHelp}
                size="lg"
                className="w-64 h-64 rounded-full bg-coral-red hover:bg-coral-red/90 text-white shadow-2xl animate-pulse-gentle transition-all duration-300 hover:scale-110 focus:ring-8 focus:ring-coral-red/50"
                aria-label="Request emergency help"
              >
                <div className="flex flex-col items-center gap-4">
                  <Heart className="w-24 h-24" strokeWidth={1.5} fill="currentColor" />
                  <span className="text-3xl font-bold">HELP</span>
                </div>
              </Button>

              <p className="text-lg text-deep-navy/60 max-w-md text-center">
                This will send a message to your family and caregivers
              </p>
            </>
          ) : (
            <>
              <div className="w-48 h-48 rounded-full bg-mint-green flex items-center justify-center animate-pulse-gentle shadow-2xl">
                <Phone className="w-24 h-24 text-white" strokeWidth={1.5} />
              </div>

              <Card className="bg-white/90 backdrop-blur-sm rounded-[24px] shadow-2xl p-12 text-center max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold text-deep-navy mb-6">
                  We're contacting your family now
                </h1>
                <p className="text-2xl text-deep-navy/80 mb-8 leading-relaxed">
                  Everything is going to be okay. Help is on the way. You're not alone.
                </p>

                <div className="space-y-4 text-left bg-sky-blue/20 rounded-[20px] p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-lg text-deep-navy">
                      Notifying your emergency contacts
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-lg text-deep-navy">
                      Sending your location information
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-lg text-deep-navy">
                      They will call you shortly
                    </p>
                  </div>
                </div>
              </Card>

              <Link href="/">
                <Button
                  size="lg"
                  className="bg-sky-blue hover:bg-sky-blue/90 text-deep-navy rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                  aria-label="Return to home"
                >
                  Return Home
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
