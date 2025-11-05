'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SignatureCapture, VoiceSignatureData } from '@/lib/signatureCapture';

interface VoiceSignatureProps {
  userId: string;
  documentId: string;
  consentStatement: string;
  onSignatureComplete: (signatureId: string) => void;
  onCancel?: () => void;
}

export default function VoiceSignature({
  userId,
  documentId,
  consentStatement,
  onSignatureComplete,
  onCancel,
}: VoiceSignatureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'instructions' | 'recording' | 'review'>('instructions');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setStep('review');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setStep('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop after 60 seconds
          if (newDuration >= 60) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    }
  };

  const submitSignature = async () => {
    if (!audioBlob) {
      setError('No recording available');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Capture metadata
      const metadata = await SignatureCapture.captureMetadata();

      // Get user name
      const userName = prompt('Please type your full name to confirm:');
      if (!userName) {
        setError('Name is required to complete signature');
        setIsProcessing(false);
        return;
      }

      // Create voice signature data
      const signatureData: VoiceSignatureData = {
        signatureType: 'voice_signature',
        signatoryName: userName,
        signatoryStatement: consentStatement,
        audioBlob,
        audioDuration: recordingDuration,
        metadata,
      };

      // Save signature
      const result = await SignatureCapture.saveVoiceSignature(
        userId,
        documentId,
        signatureData
      );

      if (result.success && result.signatureId) {
        onSignatureComplete(result.signatureId);
      } else {
        setError(result.error || 'Failed to save signature');
        setIsProcessing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'instructions') {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg p-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-coral-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-10 h-10 text-coral-red" />
            </div>
            <h2 className="text-2xl font-bold text-deep-navy mb-2">Voice Signature</h2>
            <p className="text-deep-navy/70">
              Record yourself speaking the consent statement to create a legally binding voice signature
            </p>
          </div>

          <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
            <h3 className="font-semibold text-deep-navy mb-3">What to say:</h3>
            <p className="text-deep-navy/80 italic leading-relaxed mb-4">
              "{consentStatement}"
            </p>
            <p className="text-sm text-deep-navy/60">
              Please speak clearly and at a normal pace. Your recording will be saved securely.
            </p>
          </div>

          <div className="bg-mint-green/10 border border-mint-green/30 rounded-[16px] p-6">
            <h3 className="font-semibold text-deep-navy mb-2">Why voice signatures?</h3>
            <ul className="text-sm text-deep-navy/70 space-y-2">
              <li>• Voice signatures are legally valid under UK law</li>
              <li>• Easier for elderly users than typing or drawing</li>
              <li>• Provides clear evidence of your consent</li>
              <li>• More accessible for those with mobility challenges</li>
            </ul>
          </div>

          <div className="flex gap-4">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 h-14 text-lg rounded-[16px]"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={startRecording}
              className="flex-1 h-14 text-lg font-semibold rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (step === 'recording') {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg p-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-coral-red rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-deep-navy mb-2">Recording...</h2>
            <p className="text-3xl font-bold text-coral-red">{formatDuration(recordingDuration)}</p>
          </div>

          <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
            <p className="text-deep-navy/80 text-center italic leading-relaxed">
              "{consentStatement}"
            </p>
          </div>

          <div className="text-center text-sm text-deep-navy/60">
            <p>Recording will automatically stop after 60 seconds</p>
            <p className="mt-1">Press Stop when you're finished speaking</p>
          </div>

          <Button
            onClick={stopRecording}
            className="w-full h-14 text-lg font-semibold rounded-[16px] bg-coral-red hover:bg-coral-red/90 text-white"
          >
            <MicOff className="w-5 h-5 mr-2" />
            Stop Recording
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'review') {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg p-8">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-mint-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-mint-green" />
            </div>
            <h2 className="text-2xl font-bold text-deep-navy mb-2">Review Your Recording</h2>
            <p className="text-deep-navy/70">
              Listen to your voice signature before submitting
            </p>
          </div>

          <div className="bg-soft-gray/30 rounded-[16px] p-6 text-center">
            <p className="text-sm text-deep-navy/60 mb-2">Recording Duration</p>
            <p className="text-2xl font-bold text-deep-navy">{formatDuration(recordingDuration)}</p>
          </div>

          <Button
            onClick={playRecording}
            variant="outline"
            className="w-full h-14 text-lg rounded-[16px]"
          >
            <Volume2 className="w-5 h-5 mr-2" />
            Play Recording
          </Button>

          {error && (
            <div className="bg-coral-red/10 border border-coral-red/30 rounded-[16px] p-4">
              <div className="flex items-center gap-2 text-coral-red">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-[16px] p-6">
            <h3 className="font-semibold text-deep-navy mb-2">Legal Notice</h3>
            <p className="text-sm text-deep-navy/70">
              By submitting this voice signature, you confirm that:
            </p>
            <ul className="text-sm text-deep-navy/70 mt-2 space-y-1 ml-4">
              <li>• This is your genuine voice</li>
              <li>• You are signing voluntarily</li>
              <li>• You understand what you are consenting to</li>
              <li>• This signature is legally binding</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={() => {
                setStep('instructions');
                setAudioBlob(null);
                setRecordingDuration(0);
              }}
              variant="outline"
              className="flex-1 h-14 text-lg rounded-[16px]"
              disabled={isProcessing}
            >
              Re-record
            </Button>
            <Button
              onClick={submitSignature}
              disabled={isProcessing}
              className="flex-1 h-14 text-lg font-semibold rounded-[16px] bg-mint-green hover:bg-mint-green/90 text-deep-navy"
            >
              {isProcessing ? 'Submitting...' : 'Submit Signature'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
