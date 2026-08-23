const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Without these, `AlarmManager` falls back to `setAndAllowWhileIdle`, which
 * Doze batches into maintenance windows — a 90-second rest ping lands ten
 * minutes late or not until the screen comes on, which reads as "Android
 * notifications don't work". `USE_EXACT_ALARM` is auto-granted and covers
 * API 33+; `SCHEDULE_EXACT_ALARM` is the auto-granted equivalent on 31/32 and
 * must be capped there, since from 33 up it needs a settings trip instead.
 */
module.exports = function withExactAlarms(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] ??= [];

    const add = (name, maxSdkVersion) => {
      if (manifest['uses-permission'].some((p) => p.$['android:name'] === name)) return;
      manifest['uses-permission'].push({
        $: { 'android:name': name, ...(maxSdkVersion && { 'android:maxSdkVersion': maxSdkVersion }) },
      });
    };

    add('android.permission.SCHEDULE_EXACT_ALARM', '32');
    add('android.permission.USE_EXACT_ALARM');

    return config;
  });
};
