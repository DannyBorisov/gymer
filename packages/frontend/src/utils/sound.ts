import { Capacitor } from "@capacitor/core";
import { Sound } from "../plugins/sound";

// Schedule native background sound for when rest timer completes
export async function scheduleRestTimerNotification(durationSeconds: number, announceInterval?: number, startTime?: number) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Sound.scheduleRestSound({
      duration: durationSeconds,
      announceInterval: announceInterval || 30,
      startTime: startTime || Date.now()
    });
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
