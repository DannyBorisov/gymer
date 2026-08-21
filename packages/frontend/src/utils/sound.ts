import { Capacitor } from "@capacitor/core";
import { Sound, type SoundMode } from "../plugins/sound";

const SOUND_MODE_KEY = "restTimerSoundMode";

export type { SoundMode };

export function getSoundMode(): SoundMode {
  const saved = localStorage.getItem(SOUND_MODE_KEY);
  return (saved as SoundMode) || "voice";
}

export function setSoundMode(mode: SoundMode) {
  localStorage.setItem(SOUND_MODE_KEY, mode);
}

function formatDurationForSpeech(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = seconds / 60;
  if (minutes === 1) {
    return "1 minute";
  }
  if (minutes === 1.5) {
    return "1 and a half minutes";
  }
  return `${minutes} minutes`;
}

// Schedule native background sound for when rest timer completes
export async function scheduleRestTimerNotification(durationSeconds: number) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const mode = getSoundMode();
    await Sound.scheduleRestSound({ duration: durationSeconds, mode });
  } catch (e) {
    console.error("Failed to schedule rest sound:", e);
  }
}

// Cancel the scheduled sound
export async function cancelRestTimerNotification() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Sound.cancelRestSound();
  } catch (e) {
    console.error("Failed to cancel rest sound:", e);
  }
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Call this on user interaction to unlock audio on iOS
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Play silent buffer to unlock on iOS
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Audio not supported
  }
}

function playWebAudioBeep() {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Create two beeps for notification
    for (let i = 0; i < 2; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = 880; // A5 note

      const beepStart = now + i * 0.2;
      const beepEnd = beepStart + 0.1;

      gainNode.gain.setValueAtTime(0, beepStart);
      gainNode.gain.linearRampToValueAtTime(0.3, beepStart + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, beepEnd);

      oscillator.start(beepStart);
      oscillator.stop(beepEnd + 0.1);
    }
  } catch {
    // Audio not supported or blocked
  }
}

export async function playRestTimerSound(durationSeconds?: number) {
  if (Capacitor.isNativePlatform()) {
    const mode = getSoundMode();
    try {
      if (mode === "voice" && durationSeconds) {
        const text = formatDurationForSpeech(durationSeconds);
        await Sound.speak({ text, rate: 0.52 });
      } else {
        await Sound.playRestTimerBeep({ soundId: 1007 });
      }
    } catch {
      playWebAudioBeep();
    }
  } else {
    playWebAudioBeep();
  }
}

// Preview sound mode (for settings)
export async function previewSoundMode(mode: SoundMode) {
  if (Capacitor.isNativePlatform()) {
    try {
      if (mode === "voice") {
        await Sound.speak({ text: "Rest complete", rate: 0.52 });
      } else {
        await Sound.playRestTimerBeep({ soundId: 1007 });
      }
    } catch {
      playWebAudioBeep();
    }
  } else {
    playWebAudioBeep();
  }
}
