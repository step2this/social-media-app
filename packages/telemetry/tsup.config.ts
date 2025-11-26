import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'node18',
  external: [
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/instrumentation-graphql',
    '@opentelemetry/instrumentation-aws-sdk',
    '@opentelemetry/exporter-trace-otlp-http',
    '@vercel/otel',
  ],
});
