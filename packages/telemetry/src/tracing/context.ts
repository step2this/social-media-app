import { context, propagation, trace, type Context, type SpanContext } from '@opentelemetry/api';

/**
 * Get the active span context from the current context
 *
 * Returns undefined if no span is currently active.
 *
 * @returns Current span context or undefined
 *
 * @example
 * ```typescript
 * const spanContext = getActiveSpanContext();
 * if (spanContext) {
 *   console.log('Current trace ID:', spanContext.traceId);
 *   console.log('Current span ID:', spanContext.spanId);
 * }
 * ```
 */
export function getActiveSpanContext(): SpanContext | undefined {
  const activeSpan = trace.getActiveSpan();
  return activeSpan?.spanContext();
}

/**
 * Inject trace context into a carrier for distributed tracing
 *
 * Used for propagating trace context across service boundaries (HTTP headers, message attributes, etc.)
 * Follows W3C Trace Context specification.
 *
 * @param carrier - Object to inject context into (typically HTTP headers or message attributes)
 * @param ctx - Context to inject (defaults to active context)
 *
 * @example
 * ```typescript
 * // HTTP request example
 * const headers: Record<string, string> = {};
 * injectContext(headers);
 * await fetch(url, { headers });
 *
 * // Kinesis message example
 * const messageAttributes: Record<string, string> = {};
 * injectContext(messageAttributes);
 * await kinesis.putRecord({ Data: payload, MessageAttributes: messageAttributes });
 * ```
 */
export function injectContext(
  carrier: Record<string, string>,
  ctx: Context = context.active()
): void {
  propagation.inject(ctx, carrier);
}

/**
 * Extract trace context from a carrier for distributed tracing
 *
 * Used for extracting trace context from incoming requests to continue distributed traces.
 * Follows W3C Trace Context specification.
 *
 * @param carrier - Object containing trace context (typically HTTP headers or message attributes)
 * @returns Extracted context
 *
 * @example
 * ```typescript
 * // HTTP request handler example
 * const extractedContext = extractContext(request.headers);
 * context.with(extractedContext, () => {
 *   // Process request within the extracted trace context
 *   handleRequest(request);
 * });
 *
 * // Kinesis consumer example
 * const messageAttributes = record.messageAttributes;
 * const extractedContext = extractContext(messageAttributes);
 * context.with(extractedContext, () => {
 *   processMessage(record);
 * });
 * ```
 */
export function extractContext(carrier: Record<string, unknown>): Context {
  return propagation.extract(context.active(), carrier);
}

/**
 * Execute a function within a specific trace context
 *
 * Useful for continuing traces from extracted context or creating isolated contexts.
 *
 * @param ctx - Context to execute within
 * @param fn - Function to execute
 * @returns Promise with the function's return value
 *
 * @example
 * ```typescript
 * const extractedContext = extractContext(request.headers);
 * await withContext(extractedContext, async () => {
 *   // This code runs within the extracted trace context
 *   await processRequest();
 * });
 * ```
 */
export async function withContext<T>(ctx: Context, fn: () => Promise<T>): Promise<T> {
  return context.with(ctx, fn);
}

/**
 * Execute a synchronous function within a specific trace context
 *
 * Useful for continuing traces from extracted context or creating isolated contexts.
 *
 * @param ctx - Context to execute within
 * @param fn - Synchronous function to execute
 * @returns The function's return value
 *
 * @example
 * ```typescript
 * const extractedContext = extractContext(messageAttributes);
 * const result = withContextSync(extractedContext, () => {
 *   return processMessage();
 * });
 * ```
 */
export function withContextSync<T>(ctx: Context, fn: () => T): T {
  return context.with(ctx, fn);
}
