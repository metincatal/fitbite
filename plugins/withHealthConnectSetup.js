/**
 * Custom Expo config plugin: react-native-health-connect için tam Android entegrasyonu
 *
 * Bu plugin `react-native-health-connect`'in app.plugin.js'inin yapmadığı iki kritik
 * şeyi tamamlar:
 *   1. AndroidManifest.xml'e <queries><package android:name="com.google.android.apps.healthdata"/></queries>
 *      ekler (Android 11+ package visibility için zorunlu)
 *   2. MainActivity.kt'a HealthConnectPermissionDelegate.setPermissionDelegate(this) çağrısı
 *      ekler (yoksa requestPermission native tarafta UninitializedPropertyAccessException
 *      fırlatır → uygulama crash olur)
 */
const {
  withAndroidManifest,
  withMainActivity,
  AndroidConfig,
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
  config = addPermissionDelegateToMainActivity(config);
  return config;
};
