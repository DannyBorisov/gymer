import { registerPlugin } from "@capacitor/core";

export interface SpeakOptions {
  text: string;
  rate?: number; // 0.0 - 1.0, default 0.5
}

export interface ScheduleOptions {
  duration: number; // seconds
  announceInterval?: number; // seconds between announcements
  startTime?: number; // milliseconds since epoch (Date.now())
}

export interface SoundPlugin {
  speak(options: SpeakOptions): Promise<void>;
  scheduleRestSound(options: ScheduleOptions): Promise<void>;
  cancelRestSound(): Promise<void>;
}

export const Sound = registerPlugin<SoundPlugin>("Sound");
