// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Copy lives in src/i18n/locales; a literal in JSX is a string no translation can reach.
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          // SF Symbol names, Intl format options and signed step labels are not copy.
          callees: { exclude: ['t', 'tabIcon', 'formatDate', 'require'] },
          words: {
            exclude: [
              '[0-9!-/:-@[-`{-~]+',
              '[A-Z_-]+',
              '[\\s×—–·−+]+',
              '[+−-]?[0-9]+',
              '[a-z0-9]+(\\.[a-z0-9]+)+',
            ],
          },
          'jsx-attributes': {
            include: [
              'title',
              'label',
              'placeholder',
              'message',
              'body',
              'text',
              'detail',
              'subtitle',
              'anyLabel',
              'confirmLabel',
              'dismissLabel',
              'eyebrow',
              'accessibilityLabel',
              'accessibilityHint',
            ],
          },
        },
      ],
    },
  },
]);
