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

// Play a short completion beep
export function playCompletionSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    // Audio not supported
  }
}
