import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import functionalPlugin from 'eslint-plugin-functional';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.next',
      'cdk.out',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      functional: functionalPlugin,
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
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  // Test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
    rules: {
      // Disable functional programming rules for tests (pragmatic testing)
      'functional/immutable-data': 'off',
      'functional/no-let': 'off',
      'functional/no-classes': 'off',
      'functional/no-loop-statements': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Relax complexity rules for comprehensive tests
      'max-nested-callbacks': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'no-console': 'off',
    },
  },
  // Config files
  {
    files: ['**/*.config.ts', '**/*.config.js', '**/*.config.cjs'],
    rules: {
      'functional/immutable-data': 'off',
      'functional/no-expression-statements': 'off',
    },
  },
  // Infrastructure
  {
    files: ['infrastructure/**/*.ts'],
    rules: {
      'functional/no-classes': 'off',
      'functional/prefer-immutable-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  // Frontend
  {
    files: ['packages/frontend/**/*.{ts,tsx}'],
    rules: {
      // Relax functional programming for React components
      'functional/prefer-immutable-types': 'off',
      'functional/no-mixed-types': 'off',
      'functional/immutable-data': 'warn', // Warn instead of error
      'functional/no-loop-statements': 'warn', // Warn instead of error
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // Adjust complexity limits for React components
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-statements': ['warn', 20],
      'max-nested-callbacks': ['warn', 4], // React hooks often nest callbacks
    },
  },
  // Backend
  {
    files: ['packages/backend/**/*.ts'],
    rules: {
      'functional/prefer-immutable-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  eslintConfigPrettier
);
