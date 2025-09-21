module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.base.json', './packages/*/tsconfig.json', './infrastructure/tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  plugins: [
    '@typescript-eslint',
    'functional'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:functional/recommended',
    'prettier'
  ],
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // Functional programming rules
    'functional/immutable-data': 'error',
    'functional/no-let': 'warn',
    'functional/no-loop-statements': 'error',
    'functional/no-conditional-statements': 'off',
    'functional/no-expression-statements': 'off',
    'functional/no-throw-statements': 'off',
    'functional/no-return-void': 'off',
    'functional/functional-parameters': 'off',

    // TypeScript rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-body-style': ['error', 'as-needed'],

    // Complexity rules
    'complexity': ['warn', 10],
    'max-depth': ['warn', 3],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 4],
    'max-statements': ['warn', 15],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }]
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts', '*.test.tsx', '*.spec.tsx'],
      rules: {
        'functional/immutable-data': 'off',
        'functional/no-let': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off'
      }
    },
    {
      files: ['*.config.ts', '*.config.js', '*.config.cjs'],
      rules: {
        'functional/immutable-data': 'off',
        'functional/no-expression-statements': 'off'
      }
    },
    {
      files: ['infrastructure/**/*.ts'],
      rules: {
        'functional/no-classes': 'off',
        'functional/prefer-immutable-types': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off'
      }
    },
    {
      files: ['packages/frontend/**/*.{ts,tsx}'],
      rules: {
        'functional/prefer-immutable-types': 'off',
        'functional/no-mixed-types': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }]
      }
    },
    {
      files: ['packages/backend/**/*.ts'],
      rules: {
        'functional/prefer-immutable-types': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.next',
    'cdk.out',
    '*.js',
    '*.cjs',
    '*.mjs',
    '*.d.ts'
  ]
};