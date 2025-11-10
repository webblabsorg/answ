'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MicIcon, MicOffIcon, Loader2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    if (!onTranscript) return;
    
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          onTranscript(finalTranscript);
          setIsListening(false);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setTranscript('');
      };

      setRecognition(recognitionInstance);
    }

    return () => {
      if (recognition && typeof window !== 'undefined') {
        try {
          recognition.stop();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      setTranscript('');
    }
  };

  if (!isSupported) {
    return null; // Don't show if not supported
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isListening ? 'destructive' : 'outline'}
        size="icon"
        onClick={toggleListening}
        disabled={disabled}
        className={isListening ? 'animate-pulse' : ''}
      >
        {isListening ? (
          <MicOffIcon className="h-4 w-4" />
        ) : (
          <MicIcon className="h-4 w-4" />
        )}
      </Button>
      
      {isListening && transcript && (
        <Badge variant="secondary" className="text-xs">
          {transcript}...
        </Badge>
      )}
    </div>
  );
}
