/**
 * Next.js 15 Instrumentation Hook
 *
 * This file is automatically loaded by Next.js when the server starts.
 * It's the entry point for OpenTelemetry instrumentation.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run instrumentation on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
}
