module.exports = {
  root: true,
  extends: [
    'airbnb-base',
    'plugin:json/recommended',
    'plugin:xwalk/recommended',
  ],
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    // the "Text style" options (tools/text-options) are classes_* fields — block classes, not
    // cells — and the section model renders as key-value section metadata, not as cells;
    // booking: 4 label cells + the Booking Engine fragment picker and its (hidden) variation;
    // story: 4 cells (press release, image, mobile image, text) + its Text style classes
    'xwalk/max-cells': ['error', {
      '*': 4, booking: 7, section: 14, story: 5,
    }],
  },
};
