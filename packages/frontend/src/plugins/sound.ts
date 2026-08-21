import { registerPlugin } from "@capacitor/core";

// Sound modes
export type SoundMode = "beep" | "voice";

export interface PlayOptions {
  soundId?: number;
}

export interface SpeakOptions {
  text: string;
  rate?: number; // 0.0 - 1.0, default 0.5
}

export interface ScheduleOptions {
  duration: number; // seconds
  mode: SoundMode;
}

export interface SoundPlugin {
  playRestTimerBeep(options?: PlayOptions): Promise<void>;
  speak(options: SpeakOptions): Promise<void>;
  scheduleRestSound(options: ScheduleOptions): Promise<void>;
  cancelRestSound(): Promise<void>;
}

export const Sound = registerPlugin<SoundPlugin>("Sound");
