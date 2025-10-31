/**
 * Babel Configuration for Tests
 *
 * This configuration is used by Vitest for running tests.
 * The relay plugin transforms graphql`` tagged template literals
 * into require() calls for the generated artifacts.
 */

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript'
  ],
  plugins: ['relay']
};
