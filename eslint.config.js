import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

const outsideSim = ['engine', 'render', 'content', 'ai', 'audio', 'scenes'];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // Sim purity: no imports from outside src/sim, no randomness, time or DOM.
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../*',
                ...outsideSim.flatMap((d) => [`**/${d}`, `**/${d}/*`]),
                '**/main',
              ],
              message: 'src/sim may only import from within src/sim.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'No time APIs in src/sim.' },
        { name: 'performance', message: 'No time APIs in src/sim.' },
        { name: 'window', message: 'No DOM in src/sim.' },
        { name: 'document', message: 'No DOM in src/sim.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in src/sim.' },
      ],
    },
  },
);
