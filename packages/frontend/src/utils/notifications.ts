import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Default time if none set
const DEFAULT_REMINDER_HOUR = 9;
const DEFAULT_REMINDER_MINUTE = 0;

const WEIGHT_REMINDER_ID = 1001;
const CHANNEL_ID = 'gymerr_reminders';

// Create notification channel for Android (required for heads-up notifications)
export async function createNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return;
  }

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'Gymerr Reminders',
    description: 'Workout and weight reminders',
    importance: 5, // IMPORTANCE_HIGH - shows as heads-up
    visibility: 1, // PUBLIC
    sound: 'default',
    vibration: true,
  });
}

export function isWeightReminderEnabled(): boolean {
  return localStorage.getItem('weightReminderEnabled') === 'true';
}

export function setWeightReminderEnabled(enabled: boolean): void {
  localStorage.setItem('weightReminderEnabled', String(enabled));
}

export function getWeightReminderTime(): { hour: number; minute: number } {
  const stored = localStorage.getItem('weightReminderTime');
  if (stored) {
    const { hour, minute } = JSON.parse(stored);
    return { hour, minute };
  }
  return { hour: DEFAULT_REMINDER_HOUR, minute: DEFAULT_REMINDER_MINUTE };
}

export function setWeightReminderTime(hour: number, minute: number): void {
  localStorage.setItem('weightReminderTime', JSON.stringify({ hour, minute }));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Not on native platform, skipping');
    return false;
  }

  const permission = await LocalNotifications.requestPermissions();
  return permission.display === 'granted';
}

export async function scheduleWeightReminder(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Not on native platform, skipping');
    return false;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('[Notifications] Permission denied');
    return false;
  }

  // Cancel existing reminder first
  await cancelWeightReminder();

  const { hour, minute } = getWeightReminderTime();

  // Ensure channel exists on Android
  await createNotificationChannel();

  // Schedule daily at configured time
  await LocalNotifications.schedule({
    notifications: [
      {
        id: WEIGHT_REMINDER_ID,
        title: 'Weight Check',
        body: 'Time to log your weight!',
        schedule: {
          on: {
            hour,
            minute,
          },
          repeats: true,
          allowWhileIdle: true,
        },
        channelId: CHANNEL_ID,
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        largeIcon: 'ic_launcher',
      },
    ],
  });

  console.log(`[Notifications] Weight reminder scheduled for ${hour}:${String(minute).padStart(2, '0')} daily`);
  return true;
}

export async function cancelWeightReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.cancel({
    notifications: [{ id: WEIGHT_REMINDER_ID }],
  });
  console.log('[Notifications] Weight reminder cancelled');
}

// For testing: send a notification in X seconds
export async function testNotification(delaySeconds: number = 5): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Not on native platform, skipping test');
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log('[Notifications] Permission denied for test');
    return;
  }

  // Ensure channel exists on Android
  await createNotificationChannel();

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 9999,
        title: 'Test Notification',
        body: `This is a test! Sent after ${delaySeconds}s delay.`,
        schedule: {
          at: new Date(Date.now() + delaySeconds * 1000),
        },
        channelId: CHANNEL_ID,
        sound: 'default',
      },
    ],
  });

  console.log(`[Notifications] Test notification scheduled for ${delaySeconds}s from now`);
}
