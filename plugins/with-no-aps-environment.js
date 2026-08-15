const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * `expo-notifications` unconditionally adds `aps-environment`, which makes Xcode
 * demand the Push Notifications capability — a personal Apple team cannot
 * provision it, so a device build fails to sign. Pawer only ever schedules
 * *local* notifications, so the entitlement grants nothing it uses. Delete this
 * plugin the day remote push arrives.
 *
 * Must be listed *before* "expo-notifications" in app.json: `withMod` runs the
 * last-registered plugin first and chains backwards, so earlier entries run last.
 */
module.exports = function withNoApsEnvironment(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
