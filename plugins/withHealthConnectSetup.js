/**
 * Custom Expo config plugin: react-native-health-connect için tam Android entegrasyonu
 *
 * Bu plugin `react-native-health-connect`'in app.plugin.js'inin yapmadığı şu kritik
 * şeyleri tamamlar:
 *   1. AndroidManifest.xml'e <queries><package android:name="com.google.android.apps.healthdata"/></queries>
 *      ekler (Android 11+ package visibility için zorunlu)
 *   2. MainActivity.kt'a HealthConnectPermissionDelegate.setPermissionDelegate(this) çağrısı
 *      ekler (yoksa requestPermission native tarafta UninitializedPropertyAccessException
 *      fırlatır → uygulama crash olur)
 *   3. AndroidManifest.xml'e Health Connect "ikinci uygulama bağla" listesinde uygulamanın
 *      gözükmesi için VIEW_PERMISSION_USAGE intent-filter'lı bir activity-alias ekler.
 *      Android 14 (API 34+) Health Connect bu intent-filter'a sahip olmayan uygulamaları
 *      "uyumlu uygulamalar" listesinde göstermez. (Google docs:
 *      https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started)
 */
const {
  withAndroidManifest,
  withMainActivity,
} = require('@expo/config-plugins');

function addHealthDataQuery(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [{}];
    }
    const q = Array.isArray(manifest.queries) ? manifest.queries[0] : manifest.queries;
    if (!q['package']) q['package'] = [];

    const exists = q['package'].some(
      (p) => p && p.$ && p.$['android:name'] === 'com.google.android.apps.healthdata'
    );
    if (!exists) {
      q['package'].push({ $: { 'android:name': 'com.google.android.apps.healthdata' } });
    }

    return cfg;
  });
}

/**
 * Android 14+ Health Connect'in uygulamayı tanıması için manifest'in <application>
 * bloğuna VIEW_PERMISSION_USAGE intent-filter'lı bir activity-alias ekler.
 * Bu olmadan Health Connect, uygulamayı "İkinci uygulamayı bağlayın" listesinde
 * göstermiyor — uygulama açıkken izin diyaloğu çalışsa bile sistem listesinde
 * gözükmüyor.
 */
function addPermissionUsageActivityAlias(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;

    if (!application['activity-alias']) {
      application['activity-alias'] = [];
    }

    const aliasName = 'ViewPermissionUsageActivity';
    const exists = application['activity-alias'].some(
      (a) => a && a.$ && a.$['android:name'] === aliasName
    );
    if (exists) return cfg;

    application['activity-alias'].push({
      $: {
        'android:name': aliasName,
        'android:exported': 'true',
        'android:targetActivity': '.MainActivity',
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } },
          ],
          category: [
            { $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } },
          ],
        },
      ],
    });

    return cfg;
  });
}

function addPermissionDelegateToMainActivity(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    const importLine = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
    if (!src.includes(importLine)) {
      src = src.replace(
        /^(package\s+[\w.]+)/m,
        `$1\n\n${importLine}`
      );
    }

    const delegateCall = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
    if (!src.includes(delegateCall)) {
      // Kotlin: super.onCreate(null) çağrısının hemen ardına yerleştir
      src = src.replace(
        /(super\.onCreate\(\s*[^)]*\)\s*)/,
        `$1\n    ${delegateCall}\n  `
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withHealthConnectSetup(config) {
  config = addHealthDataQuery(config);
  config = addPermissionUsageActivityAlias(config);
  config = addPermissionDelegateToMainActivity(config);
  return config;
};
