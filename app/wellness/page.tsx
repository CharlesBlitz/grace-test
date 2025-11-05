'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Heart, Smile, Frown, Meh, Battery, Moon, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const MOOD_OPTIONS = [
  { value: 1, label: 'Very Sad', icon: Frown, color: 'text-coral-red' },
  { value: 2, label: 'Sad', icon: Frown, color: 'text-orange-500' },
  { value: 3, label: 'Okay', icon: Meh, color: 'text-yellow-500' },
  { value: 4, label: 'Good', icon: Smile, color: 'text-sky-blue' },
  { value: 5, label: 'Great', icon: Smile, color: 'text-mint-green' },
];

const ENERGY_OPTIONS = [
  { value: 1, label: 'Very Low', color: 'bg-coral-red' },
  { value: 2, label: 'Low', color: 'bg-orange-500' },
  { value: 3, label: 'Medium', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', color: 'bg-sky-blue' },
  { value: 5, label: 'Excellent', color: 'bg-mint-green' },
];

const SLEEP_OPTIONS = [
  { value: 1, label: 'Very Poor', color: 'bg-coral-red' },
  { value: 2, label: 'Poor', color: 'bg-orange-500' },
  { value: 3, label: 'Okay', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', color: 'bg-sky-blue' },
  { value: 5, label: 'Excellent', color: 'bg-mint-green' },
];

export default function WellnessCheckInPage() {
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  const [checkIn, setCheckIn] = useState({
    mood_rating: 3,
    mood_description: '',
    pain_level: 0,
    pain_location: '',
    energy_level: 3,
    sleep_quality: 3,
    hours_slept: 7,
    notes: '',
  });

  useEffect(() => {
    if (profile?.id) {
      checkTodayCheckIn();
    }
  }, [profile]);

  const checkTodayCheckIn = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('wellness_check_ins')
        .select('*')
        .eq('elder_id', profile?.id)
        .eq('check_in_date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayCheckIn(data);
    } catch (error) {
      console.error('Error checking today check-in:', error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wellness_check_ins')
        .insert({
          elder_id: profile?.id,
          check_in_date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toTimeString().split(' ')[0],
          ...checkIn,
          needs_attention: checkIn.pain_level >= 7 || checkIn.mood_rating <= 2,
        });

      if (error) throw error;

      const { error: activityError } = await supabase
        .from('activity_log')
        .insert({
          elder_id: profile?.id,
          activity_type: 'wellness',
          activity_title: 'Wellness Check-In',
          activity_description: `Mood: ${MOOD_OPTIONS.find(m => m.value === checkIn.mood_rating)?.label}`,
          completed_at: new Date().toISOString(),
          icon: 'heart',
          color: 'mint-green',
        });

      toast.success('Check-in complete! Thank you for sharing how you feel today');

      setTodayCheckIn({ ...checkIn });
    } catch (error: any) {
      toast.error(error.message || 'Error submitting check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (todayCheckIn) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link href="/">
              <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
                <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
              </Button>
            </Link>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg text-center p-12">
            <CheckCircle2 className="w-24 h-24 text-mint-green mx-auto mb-6" strokeWidth={1.5} />
            <CardTitle className="text-4xl mb-4">All Done for Today!</CardTitle>
            <CardDescription className="text-xl mb-6">
              You've already completed your wellness check-in today.
              Come back tomorrow to share how you're feeling.
            </CardDescription>
            <Link href="/">
              <Button size="lg" className="h-16 px-8 text-xl rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy">
                Back to Home
              </Button>
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-deep-navy hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg mb-8">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-8 h-8 text-coral-red" strokeWidth={1.5} />
              <CardTitle className="text-3xl">Daily Wellness Check-In</CardTitle>
            </div>
            <CardDescription className="text-xl">Tell us how you're feeling today</CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">How is your mood today?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {MOOD_OPTIONS.map((mood) => {
                  const Icon = mood.icon;
                  const isSelected = checkIn.mood_rating === mood.value;
                  return (
                    <button
                      key={mood.value}
                      onClick={() => setCheckIn({ ...checkIn, mood_rating: mood.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 transition-all ${
                        isSelected
                          ? 'border-sky-blue bg-sky-blue/10 scale-105'
                          : 'border-soft-gray hover:border-sky-blue/50'
                      }`}
                    >
                      <Icon className={`w-12 h-12 ${isSelected ? mood.color : 'text-deep-navy/40'}`} strokeWidth={1.5} />
                      <span className="text-sm font-medium text-deep-navy">{mood.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <Label className="text-lg font-semibold mb-3 block">Want to tell us more?</Label>
                <Textarea
                  value={checkIn.mood_description}
                  onChange={(e) => setCheckIn({ ...checkIn, mood_description: e.target.value })}
                  placeholder="Share what's on your mind..."
                  rows={3}
                  className="text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Battery className="w-6 h-6 text-mint-green" strokeWidth={1.5} />
                Energy Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {ENERGY_OPTIONS.map((energy) => {
                  const isSelected = checkIn.energy_level === energy.value;
                  return (
                    <button
                      key={energy.value}
                      onClick={() => setCheckIn({ ...checkIn, energy_level: energy.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 transition-all ${
                        isSelected
                          ? 'border-sky-blue bg-sky-blue/10 scale-105'
                          : 'border-soft-gray hover:border-sky-blue/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full ${isSelected ? energy.color : 'bg-soft-gray'}`} />
                      <span className="text-sm font-medium text-deep-navy">{energy.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Moon className="w-6 h-6 text-sky-blue" strokeWidth={1.5} />
                Sleep Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-5 gap-3">
                {SLEEP_OPTIONS.map((sleep) => {
                  const isSelected = checkIn.sleep_quality === sleep.value;
                  return (
                    <button
                      key={sleep.value}
                      onClick={() => setCheckIn({ ...checkIn, sleep_quality: sleep.value })}
                      className={`flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 transition-all ${
                        isSelected
                          ? 'border-sky-blue bg-sky-blue/10 scale-105'
                          : 'border-soft-gray hover:border-sky-blue/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full ${isSelected ? sleep.color : 'bg-soft-gray'}`} />
                      <span className="text-sm font-medium text-deep-navy">{sleep.label}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <Label className="text-lg font-semibold mb-3 block">
                  Hours Slept: {checkIn.hours_slept} hours
                </Label>
                <Slider
                  value={[checkIn.hours_slept]}
                  onValueChange={(value) => setCheckIn({ ...checkIn, hours_slept: value[0] })}
                  min={0}
                  max={12}
                  step={0.5}
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MapPin className="w-6 h-6 text-coral-red" strokeWidth={1.5} />
                Pain Level
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-lg font-semibold mb-3 block">
                  Pain Level: {checkIn.pain_level}/10 {checkIn.pain_level === 0 && '(No pain)'}
                </Label>
                <Slider
                  value={[checkIn.pain_level]}
                  onValueChange={(value) => setCheckIn({ ...checkIn, pain_level: value[0] })}
                  min={0}
                  max={10}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-sm text-deep-navy/60 mt-2">
                  <span>No Pain</span>
                  <span>Worst Pain</span>
                </div>
              </div>

              {checkIn.pain_level > 0 && (
                <div>
                  <Label className="text-lg font-semibold mb-3 block">Where does it hurt?</Label>
                  <Textarea
                    value={checkIn.pain_location}
                    onChange={(e) => setCheckIn({ ...checkIn, pain_location: e.target.value })}
                    placeholder="e.g., back, knee, head..."
                    rows={2}
                    className="text-lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white rounded-[20px] shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Any other notes?</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={checkIn.notes}
                onChange={(e) => setCheckIn({ ...checkIn, notes: e.target.value })}
                placeholder="Anything else you'd like to share about how you're feeling..."
                rows={4}
                className="text-lg"
              />
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="w-full h-20 text-2xl rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold"
          >
            {submitting ? 'Submitting...' : 'Complete Check-In'}
          </Button>
        </div>
      </div>
    </main>
  );
}
