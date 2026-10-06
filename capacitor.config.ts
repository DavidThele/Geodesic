import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.davidthele.geodesic',
  appName: 'Geodesic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'geodesic',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2563EB',
    },
  },
};

export default config;
