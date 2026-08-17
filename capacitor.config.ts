import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dannyborisov.gymerr',
  appName: 'gymerr',
  webDir: 'frontend/dist',
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false
    }
  }
};

export default config;
