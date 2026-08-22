// Voice announcement utility for rest timer
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

const formatTimeText = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes === 0) {
    return `${secs} seconds`;
  } else if (secs === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  } else {
    const minText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
    return `${minText} ${secs}`;
  }
};

export const announceTime = async (seconds: number): Promise<void> => {
  const text = formatTimeText(seconds);

  if (Capacitor.isNativePlatform()) {
    // Use native text-to-speech on iOS/Android
    try {
      await TextToSpeech.speak({
        text,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'playback',
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
    }
  } else {
    // Fallback to Web Speech API for browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
};

export const stopSpeaking = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop();
    } catch (error) {
      console.error('Stop speech error:', error);
    }
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
