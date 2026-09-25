const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Xcode 27 terminates an app at launch unless it adopts the UIKit scene
 * lifecycle, and SDK 57 still starts React Native from the AppDelegate. Expo
 * ships the scene runtime from 57.0.23 (`EXExpoAppSceneDelegate`) but leaves it
 * opt-in; this is the upstream `@config-plugins/expo-uiscene-lifecycle`, which
 * is merged but unpublished. Delete this plugin on SDK 58, which adopts scenes
 * itself.
 */
const APP_DELEGATE = 'class AppDelegate: ExpoAppDelegate {';
const SCENE_APP_DELEGATE = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
const STARTUP = `    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
`;
// The template guards the startup with a platform check; dropping the lines
// alone would leave `#if os(iOS) || os(tvOS)#endif` behind.
const GUARDED_STARTUP = `\n#if os(iOS) || os(tvOS)\n${STARTUP}#endif\n`;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
      },
    ],
  },
};

const MINIMUM_EXPO = '57.0.23';

module.exports = function withUISceneLifecycle(config) {
  // The manifest names a class that only exists from this patch on; an older
  // expo would prebuild happily and then die at launch.
  const expo = require('expo/package.json').version;
  if (expo.localeCompare(MINIMUM_EXPO, undefined, { numeric: true }) < 0) {
    throw new Error(`with-uiscene-lifecycle needs expo >= ${MINIMUM_EXPO} (found ${expo}).`);
  }

  config = withAppDelegate(config, (config) => {
    const { contents, language } = config.modResults;
    if (language !== 'swift') {
      throw new Error('with-uiscene-lifecycle expects the Swift AppDelegate.');
    }
    if (contents.includes(SCENE_APP_DELEGATE)) return config;

    const startup = contents.includes(GUARDED_STARTUP) ? GUARDED_STARTUP : `\n${STARTUP}`;
    if (!contents.includes(APP_DELEGATE) || !contents.includes(startup)) {
      throw new Error('with-uiscene-lifecycle expects the standard SDK 57 AppDelegate.');
    }

    config.modResults.contents = contents
      .replace(APP_DELEGATE, SCENE_APP_DELEGATE)
      .replace(startup, '');
    return config;
  });

  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return config;
  });
};
