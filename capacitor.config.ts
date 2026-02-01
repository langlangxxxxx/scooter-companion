import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.125fe07d319a48639c57445c09a08c71',
  appName: 'ScooterConnect',
  webDir: 'dist',
  server: {
    url: 'https://125fe07d-319a-4863-9c57-445c09a08c71.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Suche nach Scootern...',
        cancel: 'Abbrechen',
        availableDevices: 'Verfügbare Geräte',
        noDeviceFound: 'Keine Geräte gefunden',
      },
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreAliasPassword: undefined,
      signingType: 'apksigner',
    },
  },
};

export default config;
