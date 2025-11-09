'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VolumeIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
  autoPlay?: boolean;
}

export function TextToSpeech({ text, autoPlay = false }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check if browser supports Speech Synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !text) return;

    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = 0.9; // Slightly slower for clarity
    newUtterance.pitch = 1;
    newUtterance.volume = 1;

    newUtterance.onstart = () => setIsPlaying(true);
    newUtterance.onend = () => setIsPlaying(false);
    newUtterance.onerror = () => setIsPlaying(false);

    setUtterance(newUtterance);

    // Auto-play if requested
    if (autoPlay && !isPlaying) {
      setTimeout(() => {
        window.speechSynthesis.speak(newUtterance);
      }, 500); // Small delay to ensure page is ready
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text, isSupported]);

  const toggleSpeech = () => {
    if (!utterance || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleSpeech}
      className="text-xs"
    >
      {isPlaying ? (
        <>
          <Volume2Icon className="h-3 w-3 mr-1 animate-pulse" />
          Playing...
        </>
      ) : (
        <>
          <VolumeIcon className="h-3 w-3 mr-1" />
          Listen
        </>
      )}
    </Button>
  );
}
