import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gestionMaxi.com',
  appName: 'gestion-maxi',
  webDir: 'public',
  server: {
    url: 'https://maxy-iota.vercel.app',
    cleartext: true
  }
};

export default config;
