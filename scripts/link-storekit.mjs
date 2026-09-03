#!/usr/bin/env node
/**
 * Points the generated Xcode scheme at Pawer.storekit so purchases run against
 * the local StoreKit config instead of the App Store sandbox. Every
 * `expo prebuild` rewrites the scheme from the template and drops the
 * reference, so this has to be re-run after one — the same way
 * ios/sentry.properties has to have its token put back.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEME = resolve(ROOT, 'ios/Pawer.xcodeproj/xcshareddata/xcschemes/Pawer.xcscheme');

// Relative to the .xcodeproj, not to the .xcscheme that holds it.
const REFERENCE = `      <StoreKitConfigurationFileReference
         identifier = "../../Pawer.storekit">
      </StoreKitConfigurationFileReference>\n`;

const unlink = process.argv.includes('--unlink');
const scheme = await readFile(SCHEME, 'utf8').catch(() => null);
if (scheme === null) {
  console.error(`[storekit] no scheme at ${SCHEME} — run \`npx expo prebuild -p ios\` first`);
  process.exit(1);
}

const stripped = scheme.replace(
  /^ *<StoreKitConfigurationFileReference[\s\S]*?<\/StoreKitConfigurationFileReference>\n/m,
  ''
);

if (unlink) {
  await writeFile(SCHEME, stripped);
  console.log('[storekit] scheme unlinked — purchases go to the App Store sandbox again');
} else {
  const linked = stripped.replace('   </LaunchAction>', `${REFERENCE}   </LaunchAction>`);
  if (linked === stripped) {
    console.error('[storekit] no <LaunchAction> in the scheme; nothing changed');
    process.exit(1);
  }
  await writeFile(SCHEME, linked);
  console.log('[storekit] scheme -> Pawer.storekit (run from Xcode, not `npm run ios`)');
}
