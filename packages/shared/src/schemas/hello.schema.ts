import { z } from 'zod';

/**
 * Re-export z for consumers
 */
export { z };

/**
 * Schema for the Hello request payload
 */
export const HelloRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().default('World'),
  timestamp: z.string().datetime().optional()
});

/**
 * Schema for the Hello response payload
 */
export const HelloResponseSchema = z.object({
  message: z.string(),
  name: z.string(),
  timestamp: z.string().datetime(),
  serverTime: z.string().datetime()
});

/**
 * Type definitions derived from schemas
 */
export type HelloRequest = z.infer<typeof HelloRequestSchema>;
export type HelloResponse = z.infer<typeof HelloResponseSchema>;