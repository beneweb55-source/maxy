import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gestionMaxy.com',
  appName: 'gestion-maxy',
  webDir: 'public',
  server: {
    url: 'https://maxy-iota.vercel.app',
    cleartext: true
  }
};

export default config;
