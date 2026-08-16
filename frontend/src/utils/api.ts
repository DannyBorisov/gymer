import { Capacitor } from '@capacitor/core';

// Use production URL when running as native app, relative URLs for web
export const API_BASE = Capacitor.isNativePlatform()
  ? 'https://gymerr.co'
  : '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
