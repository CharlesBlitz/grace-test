'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Mic, Play, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

type Step = 'select' | 'record' | 'preview';
type Role = 'son' | 'daughter' | 'family';

export default function VoiceSetupPage() {
  const [step, setStep] = useState<Step>('select');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const samplePhrase =
    "Hello! It's time to take your medication. Don't forget to drink some water with it. I love you!";

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(URL.createObjectURL(recordedAudio));
      audio.play();
    }
  };

  const saveVoiceProfile = async () => {
    if (!recordedAudio || !selectedRole) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('audio', recordedAudio, 'voice-sample.wav');
      formData.append('role', selectedRole);
      formData.append('elderId', 'demo-elder-id');

      console.log('Voice profile would be saved here');

      setStep('select');
      setSelectedRole(null);
      setRecordedAudio(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error saving voice profile:', error);
      alert('Failed to save voice profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplayName = (role: Role): string => {
    switch (role) {
      case 'son':
        return 'Your Son';
      case 'daughter':
        return 'Your Daughter';
      case 'family':
        return 'Family Member';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-blue to-warm-cream p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-deep-navy hover:bg-white/20"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-8 mb-8">
          <h1 className="text-heading-md md:text-4xl font-bold text-deep-navy text-center">
            Add Family Voice
          </h1>
          <p className="text-body text-deep-navy/70 text-center mt-2">
            Step {step === 'select' ? '1' : step === 'record' ? '2' : '3'} of 3
          </p>
        </Card>

        {step === 'select' && (
          <div className="space-y-6">
            <Card className="bg-white rounded-[24px] shadow-md p-8">
              <h2 className="text-2xl font-semibold text-deep-navy mb-6 text-center">
                Who will be recording?
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {(['son', 'daughter', 'family'] as Role[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setSelectedRole(role);
                      setStep('record');
                    }}
                    className="flex flex-col items-center gap-4 p-8 bg-sky-blue hover:bg-sky-blue/80 rounded-[24px] transition-all duration-200 hover:scale-105 focus:ring-4 focus:ring-sky-blue/50"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-deep-navy" strokeWidth={1.5} />
                    </div>
                    <span className="text-xl font-semibold text-deep-navy">
                      {getRoleDisplayName(role)}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-6">
            <Card className="bg-white rounded-[24px] shadow-md p-8">
              <h2 className="text-2xl font-semibold text-deep-navy mb-6 text-center">
                Record Voice Sample
              </h2>

              <Card className="bg-warm-cream rounded-[20px] p-6 mb-8">
                <p className="text-lg text-deep-navy leading-relaxed text-center">
                  "{samplePhrase}"
                </p>
              </Card>

              <div className="flex flex-col items-center gap-8">
                <div
                  className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording
                      ? 'bg-coral-red animate-pulse-gentle'
                      : 'bg-mint-green'
                  }`}
                >
                  <Mic className="w-24 h-24 text-white" strokeWidth={1.5} />
                </div>

                {isRecording && (
                  <div className="text-center">
                    <p className="text-4xl font-bold text-deep-navy">{recordingTime}s</p>
                    <p className="text-lg text-deep-navy/70">Recording... (45s max)</p>
                  </div>
                )}

                <div className="flex gap-4">
                  {!isRecording && !recordedAudio && (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="bg-coral-red hover:bg-coral-red/90 text-white rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                    >
                      <Mic className="w-6 h-6 mr-2" strokeWidth={1.5} />
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="bg-deep-navy hover:bg-deep-navy/90 text-white rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                    >
                      Stop Recording
                    </Button>
                  )}

                  {recordedAudio && (
                    <>
                      <Button
                        onClick={playRecording}
                        size="lg"
                        className="bg-sky-blue hover:bg-sky-blue/90 text-deep-navy rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                      >
                        <Play className="w-6 h-6 mr-2" strokeWidth={1.5} />
                        Play
                      </Button>
                      <Button
                        onClick={() => setStep('preview')}
                        size="lg"
                        className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                      >
                        Next
                      </Button>
                    </>
                  )}
                </div>

                {!isRecording && !recordedAudio && (
                  <Button
                    onClick={() => setStep('select')}
                    variant="ghost"
                    className="text-deep-navy/70 hover:bg-white/20"
                  >
                    Back
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <Card className="bg-white rounded-[24px] shadow-md p-8">
              <h2 className="text-2xl font-semibold text-deep-navy mb-6 text-center">
                Preview & Save
              </h2>

              <div className="flex flex-col items-center gap-8">
                <div className="w-32 h-32 bg-mint-green rounded-full flex items-center justify-center">
                  <Check className="w-16 h-16 text-white" strokeWidth={2.5} />
                </div>

                <div className="text-center">
                  <p className="text-2xl font-semibold text-deep-navy mb-2">
                    Recording Complete
                  </p>
                  <p className="text-lg text-deep-navy/70">
                    Your voice will be used for reminders
                  </p>
                </div>

                <Button
                  onClick={playRecording}
                  size="lg"
                  className="bg-sky-blue hover:bg-sky-blue/90 text-deep-navy rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                >
                  <Play className="w-6 h-6 mr-2" strokeWidth={1.5} />
                  Preview Recording
                </Button>

                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setStep('record');
                      setRecordedAudio(null);
                    }}
                    variant="outline"
                    size="lg"
                    className="rounded-[24px] px-12 py-6 text-xl"
                  >
                    Re-record
                  </Button>
                  <Button
                    onClick={saveVoiceProfile}
                    disabled={saving}
                    size="lg"
                    className="bg-mint-green hover:bg-mint-green/90 text-deep-navy rounded-[24px] px-12 py-6 text-xl font-semibold shadow-lg"
                  >
                    {saving ? 'Saving...' : 'Save Voice'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
