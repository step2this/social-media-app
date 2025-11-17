# Logging & Observability Research - 2025

**Date:** 2025-11-13
**Context:** Production-ready logging and monitoring for social media app

---

## Executive Summary

**Recommendation:** Use **Pino** for application logging + **OpenTelemetry** for observability.

- **Pino**: Fast, structured JSON logging (5x faster than Winston)
- **OpenTelemetry**: Industry standard for Next.js 15+ observability
- **Platform**: Consider SigNoz (open-source) or New Relic (commercial)

---

## Top Logging Libraries (2025)

### 🥇 Pino - Performance Champion

**Best for:** High-performance production apps, APIs, microservices

**Advantages:**
- ⚡ **5x faster than Winston** - minimal CPU/memory overhead
- 📊 **Structured JSON by default** - perfect for log aggregation
- 🚀 **Asynchronous logging** - non-blocking I/O
- 🎯 **Child loggers** - contextual logging with inheritance
- 🖥️ **Works client-side** - unlike Winston (no 'fs' dependency issues)
- 🎨 **Pretty printing in dev** - human-readable during development

**Stats:**
- ~5M weekly npm downloads
- Used by Fastify, NestJS, and other performance-focused frameworks

**Example:**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

logger.info({ userId: '123', action: 'login' }, 'User logged in');
```

---

### 🥈 Winston - Feature-Rich Option

**Best for:** Complex logging requirements, multiple destinations

**Advantages:**
- 📦 **Most popular** - 12M+ weekly downloads
- 🎯 **Multiple transports** - console, file, HTTP, databases
- 🔧 **Highly customizable** - custom formats and metadata
- 🏢 **Enterprise-ready** - mature ecosystem

**Drawbacks:**
- ⚠️ **Slower than Pino** - higher overhead
- ⚠️ **Poor defaults** - no timestamp or stack traces by default
- ❌ **Doesn't work client-side** - uses 'fs' library

**Example:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## Next.js 15 Observability

### OpenTelemetry - Industry Standard

Next.js 15 has **built-in OpenTelemetry support** via the `instrumentation.ts` file.

**Three Pillars of Observability:**
1. **Traces** - Request flow through your app
2. **Metrics** - Performance counters, gauges
3. **Logs** - Structured application logs

**Implementation:**
```typescript
// instrumentation.ts (Next.js 15+)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node');
  }
}

// instrumentation.node.ts
import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'social-media-app',
  });
}
```

**Next.js 15 Features:**
- ✅ `instrumentation.ts` API (stable)
- ✅ `onRequestError` hook for error reporting
- ✅ Built-in OpenTelemetry integration
- ✅ Works with Vercel, self-hosted, and Edge

---

## Monitoring Platforms (2025)

### Option 1: SigNoz (Open-Source) ⭐ Recommended

**Pros:**
- 🆓 **Open-source** - self-hosted or cloud
- 🔥 **OpenTelemetry-native**
- 📊 **Beautiful UI** - flamegraphs, Gantt charts
- 🚀 **Fast** - ClickHouse backend
- 💰 **Cost-effective** for startups

**Cons:**
- Requires self-hosting (or paid cloud)
- Smaller ecosystem than commercial options

**Pricing:** Free (self-hosted) or $199/month (cloud)

---

### Option 2: New Relic (Commercial)

**Pros:**
- 🏢 **Enterprise-grade**
- 🎯 **Deep Next.js integration** via `@newrelic/next`
- 📊 **Full-stack observability**
- 🤝 **Mature support**

**Cons:**
- 💰 Expensive for small teams
- Vendor lock-in

**Pricing:** $0-$349/month per user

---

### Option 3: Datadog

**Pros:**
- 🌐 **Best-in-class** for large-scale systems
- 🔍 **Deep integrations** - AWS, Docker, K8s
- 📊 **Comprehensive** - logs, metrics, traces, RUM

**Cons:**
- 💰 Most expensive option
- Can be overkill for smaller apps

---

### Option 4: Sentry (Error Tracking)

**Pros:**
- 🐛 **Best error tracking** in the industry
- ⚡ **Easy setup** - Next.js first-class support
- 🎯 **Session replay** - see what users did before error
- 💰 **Generous free tier**

**Cons:**
- Not full observability (just errors/performance)
- Need separate solution for logs/metrics

**Pricing:** Free up to 5K errors/month, then $29+/month

---

## Recommended Architecture

### For Production:

```
┌─────────────────────────────────────┐
│     Next.js App                     │
├─────────────────────────────────────┤
│                                     │
│  Pino Logger                        │
│  ├─ Server Actions                  │
│  ├─ API Routes                      │
│  └─ Server Components               │
│                                     │
│  OpenTelemetry                      │
│  ├─ Traces (request flow)           │
│  ├─ Metrics (counters)              │
│  └─ Logs (from Pino)                │
│                                     │
└──────────┬──────────────────────────┘
           │
           │ Export to...
           ▼
┌─────────────────────────────────────┐
│  Monitoring Platform                │
│  (SigNoz / New Relic / Datadog)     │
├─────────────────────────────────────┤
│  - Dashboards                       │
│  - Alerts                           │
│  - Search/Filter                    │
│  - Trace visualization              │
└─────────────────────────────────────┘
```

### For Errors:

```
┌─────────────────────────────────────┐
│     Next.js App                     │
├─────────────────────────────────────┤
│  onRequestError hook                │
│  └─ Sentry.captureException()       │
│                                     │
│  Client Error Boundary              │
│  └─ Sentry.captureException()       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Sentry                             │
│  - Error grouping                   │
│  - Stack traces                     │
│  - Session replay                   │
│  - Release tracking                 │
└─────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Basic Logging (Week 1)
**Goal:** Replace console.log with structured logging

**Tasks:**
- [ ] Install Pino (`pnpm add pino pino-pretty`)
- [ ] Create logger utility (`lib/logger.ts`)
- [ ] Replace console.log in Server Actions
- [ ] Replace console.log in API routes
- [ ] Add pretty printing in development
- [ ] Test JSON output in production mode

**Files to update:**
- `apps/web/lib/logger.ts` (new)
- `apps/web/app/actions/posts.ts`
- `apps/web/app/api/auth/*.ts`
- `apps/web/lib/auth/service.ts`
- `packages/graphql-server/src/` (GraphQL server)

---

### Phase 2: OpenTelemetry Integration (Week 2)
**Goal:** Add distributed tracing

**Tasks:**
- [ ] Install OpenTelemetry packages
- [ ] Create `instrumentation.ts`
- [ ] Configure @vercel/otel
- [ ] Add trace context to logs
- [ ] Test trace propagation
- [ ] Add custom spans for critical paths

**Packages:**
```bash
pnpm add @vercel/otel @opentelemetry/api
```

---

### Phase 3: Error Tracking (Week 2)
**Goal:** Catch and report all errors

**Tasks:**
- [ ] Install Sentry (`pnpm add @sentry/nextjs`)
- [ ] Run Sentry wizard (`npx @sentry/wizard@latest -i nextjs`)
- [ ] Configure `onRequestError` hook
- [ ] Add Error Boundary components
- [ ] Test error reporting
- [ ] Set up alerts

---

### Phase 4: Monitoring Platform (Week 3)
**Goal:** Deploy full observability

**Decision Point:** Choose platform
- Option A: SigNoz (self-hosted)
- Option B: Vercel + SigNoz Cloud
- Option C: New Relic / Datadog (if budget allows)

**Tasks:**
- [ ] Deploy monitoring platform
- [ ] Configure exporters
- [ ] Create dashboards
- [ ] Set up alerts
- [ ] Document runbook

---

## Best Practices

### ✅ DO:
- Use structured logging (JSON) in production
- Log request IDs for tracing
- Log user IDs for debugging (hashed if PII)
- Use log levels appropriately (debug, info, warn, error)
- Add context to errors (what was user doing?)
- Batch logs for performance (OpenTelemetry BatchProcessor)

### ❌ DON'T:
- Log sensitive data (passwords, tokens, credit cards)
- Log PII without consent/hashing
- Use console.log in production
- Log on every request (too noisy)
- Ignore log levels (everything at 'info')
- Log stack traces in client-side

---

## Code Examples

### Pino Logger Setup

```typescript
// apps/web/lib/logger.ts
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',

  // Pretty print in development
  transport: !isProduction ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  } : undefined,

  // Add default fields
  base: {
    env: process.env.NODE_ENV,
    service: 'social-media-app',
  },
});

// Create child loggers for different modules
export const authLogger = logger.child({ module: 'auth' });
export const postsLogger = logger.child({ module: 'posts' });
export const apiLogger = logger.child({ module: 'api' });
```

### Usage in Server Actions

```typescript
// app/actions/posts.ts
'use server';

import { postsLogger } from '@/lib/logger';

export async function likePost(postId: string) {
  postsLogger.info({ postId }, 'Liking post');

  try {
    const result = await graphqlClient.request(LIKE_POST, { postId });
    postsLogger.info({ postId, success: true }, 'Post liked successfully');
    return result;
  } catch (error) {
    postsLogger.error({ postId, error }, 'Failed to like post');
    throw error;
  }
}
```

### OpenTelemetry with Pino

```typescript
// instrumentation.node.ts
import { registerOTel } from '@vercel/otel';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';

export function register() {
  registerOTel({
    serviceName: 'social-media-app',
    instrumentations: [
      new PinoInstrumentation({
        logHook: (span, record) => {
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
        },
      }),
    ],
  });
}
```

---

## Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Pino** | ✅ Free (library) | N/A | Logging library |
| **SigNoz** | ✅ Free (self-hosted) | $199/mo | Startups, cost-conscious |
| **Sentry** | 5K errors/mo | $29+/mo | Error tracking |
| **New Relic** | 100GB/mo | $349+/mo | Enterprises |
| **Datadog** | 14-day trial | $15+/host/mo | Large scale |

**Recommendation for MVP:** Start with Pino + Sentry (free tiers), add OpenTelemetry + SigNoz later.

---

## Next Steps

1. **Immediate (This PR):**
   - Install Pino
   - Create logger utility
   - Replace console.log in new code

2. **Short-term (Next Sprint):**
   - Refactor existing console.logs
   - Add OpenTelemetry instrumentation
   - Set up Sentry

3. **Long-term (Before Production):**
   - Deploy monitoring platform
   - Create dashboards
   - Set up alerts

---

## References

- [Pino Documentation](https://getpino.io/)
- [Next.js OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry)
- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [SigNoz Next.js Guide](https://signoz.io/blog/opentelemetry-nextjs/)
- [Winston vs Pino Comparison](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/)

---

**Author:** Claude
**Last Updated:** 2025-11-13
