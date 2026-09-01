import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dannyborisov.gymerr',
  appName: 'gymerr',
  webDir: 'dist',
  ios: {
    backgroundColor: '#0a0a0a'
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false
    }
  }
};

export default config;
