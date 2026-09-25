const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const SWATCHES = require('../src/constants/tint-swatches.json');

const POINTS = 18;
const SCALES = [1, 2, 3];

/**
 * The colour dots in Settings → Tint Color. A UIMenu draws every SF Symbol in
 * the window tint, whatever `foregroundStyle` says — only a bitmap marked
 * `original` keeps its own colour. So each swatch is an image set in the app's
 * asset catalog, with a dark-appearance variant so Monochrome stays visible on
 * a dark menu. `ios/` is generated, hence a plugin rather than committed files.
 */
module.exports = function withTintSwatches(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const catalog = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'Images.xcassets'
      );

      for (const [id, swatch] of Object.entries(SWATCHES)) {
        const dir = path.join(catalog, `tint-${id}.imageset`);
        fs.mkdirSync(dir, { recursive: true });
        const images = [];

        for (const [appearance, color] of [
          [null, swatch.light],
          ['dark', swatch.dark],
        ]) {
          for (const scale of SCALES) {
            const filename = `${appearance ?? 'light'}@${scale}x.png`;
            await dot(color, POINTS * scale).toFile(path.join(dir, filename));
            images.push({
              idiom: 'universal',
              scale: `${scale}x`,
              filename,
              ...(appearance && {
                appearances: [{ appearance: 'luminosity', value: appearance }],
              }),
            });
          }
        }

        fs.writeFileSync(
          path.join(dir, 'Contents.json'),
          JSON.stringify(
            {
              images,
              info: { author: 'xcode', version: 1 },
              properties: { 'template-rendering-intent': 'original' },
            },
            null,
            2
          )
        );
      }

      return config;
    },
  ]);
};

function dot(color, size) {
  const r = size / 2;
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${color}"/></svg>`
    )
  ).png();
}
