const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ICONS = [
  'notif_water',
  'notif_breakfast',
  'notif_lunch',
  'notif_dinner',
  'notif_steps',
  'notif_motivation',
  'notif_report',
  'notif_water_goal',
];

/**
 * Bildirim ikonlarını (assets/icons/*.png) Android drawable klasörüne kopyalar.
 * EAS build sırasında çalışır; PNG'ler resource olarak APK'ya gömülür.
 * NotificationContent.java patch'i bu resource'ları data.notifIcon key'i ile yükler.
 */
module.exports = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/drawable'
      );
      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }

      const iconsDir = path.join(config.modRequest.projectRoot, 'assets/icons');

      for (const icon of ICONS) {
        const src = path.join(iconsDir, `${icon}.png`);
        const dest = path.join(drawableDir, `${icon}.png`);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        } else {
          console.warn(`[withNotificationIcons] Icon not found: ${src}`);
        }
      }

      return config;
    },
  ]);
