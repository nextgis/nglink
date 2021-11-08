module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    jsx: true,
    useJSXTextNode: true,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
      jsx: true,
    },
    ecmaVersion: 'latest', // ECMAScript features
  },
  env: {
    browser: true,
    amd: true,
    node: true,
  },
  rules: {
    'prettier/prettier': ['error'],
    // semi: 0,
    // 'react/jsx-indent': ['error', 2],
    'max-len': [2, 80, 2],
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-undef': 'off',
      },
    },
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'jsx-a11y', 'prettier'],
  settings: {},
};
