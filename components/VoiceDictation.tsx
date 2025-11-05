'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Sparkles, RefreshCw } from 'lucide-react';
import { structureVoiceNotes } from '@/lib/openaiCarePlanService';
import { useAuth } from '@/lib/authContext';
import { AudioCues } from '@/lib/audioCues';

interface VoiceDictationProps {
  organizationId: string;
  sectionType: 'goal' | 'task' | 'assessment_notes' | 'recommendations' | 'care_plan_description';
  context?: string;
  onTextGenerated: (text: string) => void;
  placeholder?: string;
  label?: string;
}

export function VoiceDictation({
  organizationId,
  sectionType,
  context,
  onTextGenerated,
  placeholder,
  label,
}: VoiceDictationProps) {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart + ' ';
            } else {
              interimTranscript += transcriptPart;
            }
          }

          setTranscript((prev) => prev + finalTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setBrowserSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      setTranscript('');
      AudioCues.playListeningStart();
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      AudioCues.playListeningStop();
    }
  };

  const handleStructure = async () => {
    if (!user || !transcript.trim()) return;

    setIsProcessing(true);
    AudioCues.playProcessing();
    try {
      const result = await structureVoiceNotes(
        {
          transcript,
          context,
          sectionType,
          organizationId,
        },
        user.id
      );

      setStructuredText(result.structuredText);
      onTextGenerated(result.structuredText);
      AudioCues.playSuccess();
    } catch (error) {
      console.error('Error structuring voice notes:', error);
      AudioCues.playError();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setStructuredText('');
    onTextGenerated('');
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      {!browserSupported && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari for voice features.
          </p>
        </div>
      )}

      <Card className="p-4 border-2 border-dashed border-blue-200 bg-blue-50/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Voice Dictation</span>
            {isListening && (
              <Badge className="bg-red-500 text-white animate-pulse">Recording</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {!isListening ? (
              <Button onClick={startListening} size="sm" variant="outline" disabled={!browserSupported}>
                <Mic className="h-4 w-4 mr-2" />
                Start
              </Button>
            ) : (
              <Button onClick={stopListening} size="sm" variant="outline" className="border-red-500 text-red-600">
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {transcript && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-gray-500 mb-1">Raw Transcript:</div>
              <div className="text-sm text-gray-700">{transcript}</div>
            </div>

            {!structuredText && (
              <Button
                onClick={handleStructure}
                disabled={isProcessing}
                size="sm"
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Structuring with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Structure with AI
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </Card>

      {structuredText && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">AI-Structured Text</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                AI Enhanced
              </Badge>
            </div>
            <Button onClick={handleClear} variant="ghost" size="sm" className="text-gray-600">
              Clear
            </Button>
          </div>
          <Textarea
            value={structuredText}
            onChange={(e) => {
              setStructuredText(e.target.value);
              onTextGenerated(e.target.value);
            }}
            rows={6}
            placeholder={placeholder || 'Edit the AI-structured text...'}
            className="bg-white border-blue-200"
          />
          <p className="text-xs text-gray-500">
            AI has cleaned up and structured your voice notes. You can edit them before applying.
          </p>
        </div>
      )}
    </div>
  );
}
