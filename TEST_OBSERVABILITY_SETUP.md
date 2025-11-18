# Testing Your Observability Setup

This guide walks you through testing the new Jaeger + Prometheus + Grafana observability stack.

## Prerequisites

✅ Docker containers running:
```bash
docker compose -f docker-compose.observability.yml ps
```

Expected output - all healthy:
```
NAME         STATUS
jaeger       Up (healthy)
prometheus   Up (healthy)  
grafana      Up (healthy)
```

---

## Step 1: Verify Services Are Accessible

### 1.1 Test Jaeger UI
```bash
# Open in browser
open http://localhost:16686

# Or test with curl
curl -I http://localhost:16686
# Expected: HTTP/1.1 200 OK
```

**What you should see:**
- Jaeger UI homepage with search interface
- Service dropdown (empty for now - no traces yet)
- Clean interface without errors

### 1.2 Test Prometheus
```bash
# Open in browser
open http://localhost:9090

# Or test with curl
curl -I http://localhost:9090
# Expected: HTTP/1.1 200 OK
```

**What you should see:**
- Prometheus expression browser
- Graph interface
- Status → Targets page showing configured scrape targets

### 1.3 Test Grafana
```bash
# Open in browser
open http://localhost:3001

# Or test with curl
curl -I http://localhost:3001
# Expected: HTTP/1.1 200 OK
```

**Login credentials:**
- Username: `admin`
- Password: `admin`

**What you should see:**
- Grafana login page
- After login: Grafana home dashboard
- Left sidebar with navigation

---

## Step 2: Verify Grafana Datasources

1. **Navigate to datasources:**
   - Click on hamburger menu (☰) → Connections → Data sources

2. **Verify Prometheus datasource:**
   - Should see "Prometheus" listed
   - Click on it
   - Scroll down and click "Save & test"
   - Should see: ✅ "Successfully queried the Prometheus API"

3. **Verify Jaeger datasource:**
   - Go back to Data sources
   - Should see "Jaeger" listed
   - Click on it
   - URL should be: `http://jaeger:16686`
   - Click "Save & test"
   - Should see: ✅ "Data source is working"

---

## Step 3: Verify OTLP Endpoints

Test that Jaeger is accepting OTLP traces:

```bash
# Test OTLP HTTP endpoint
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: HTTP 400 (bad request is good - means it's listening)
# If you get "connection refused", Jaeger isn't running
```

---

## Step 4: Start Your Applications

Now let's generate some traces!

### 4.1 Update Your Local Environment Files

**Next.js app** (`apps/web/.env.local`):
```bash
# If file doesn't exist, create it from example
cp apps/web/.env.example apps/web/.env.local

# Ensure these values are set:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=social-media-web
LOG_LEVEL=debug
```

**GraphQL server** (`packages/graphql-server/.env`):
```bash
# If file doesn't exist, create it from example
cp packages/graphql-server/.env.example packages/graphql-server/.env

# Ensure these values are set:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=social-media-graphql
LOG_LEVEL=debug
```

### 4.2 Start Next.js App

**Terminal 1:**
```bash
cd /Users/shaperosteve/social-media-app/apps/web
pnpm dev
```

**Look for:**
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
```

**Check for OpenTelemetry initialization** (may be in the logs):
```
[OpenTelemetry] Instrumentation registered for social-media-web
```

### 4.3 Start GraphQL Server

**Terminal 2:**
```bash
cd /Users/shaperosteve/social-media-app/packages/graphql-server
pnpm dev:server
```

**Look for:**
```
🎉 GraphQL server ready!
[OpenTelemetry] SDK started successfully
```

---

## Step 5: Generate Test Traces

Now let's create some activity that will generate traces:

### 5.1 Simple Health Check
```bash
# Hit Next.js homepage
curl http://localhost:3000

# Hit GraphQL health check (if you have one)
curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### 5.2 User Registration (If Available)
1. Open http://localhost:3000 in your browser
2. Navigate to registration page
3. Register a test user
4. This will create traces across:
   - Next.js API route
   - GraphQL mutation
   - DynamoDB write

### 5.3 Or Any User Action
- Login
- Create a post
- Browse the feed
- Like a post
- Any action that calls your GraphQL API

---

## Step 6: View Traces in Jaeger

### 6.1 Open Jaeger UI
```bash
open http://localhost:16686
```

### 6.2 Search for Traces

**Method 1 - By Service:**
1. In "Service" dropdown, select `social-media-web` or `social-media-graphql`
2. Click "Find Traces"
3. You should see a list of traces!

**Method 2 - By Operation:**
1. Select service
2. In "Operation" dropdown, select an operation (e.g., `POST /api/auth/register`)
3. Click "Find Traces"

**Method 3 - By Tags:**
1. Add tag filter: `http.method=POST`
2. Click "Find Traces"

### 6.3 Explore a Trace

Click on any trace in the list. You should see:

**Trace Timeline:**
- Horizontal bars showing spans
- Duration for each operation
- Parent-child relationships

**Span Details:**
- Service name
- Operation name
- Duration
- Tags (metadata)
- Logs (if any)

**Example trace structure:**
```
social-media-web: POST /api/auth/register (150ms)
  └─ social-media-graphql: mutation register (120ms)
      └─ DynamoDB: PutItem users (80ms)
```

---

## Step 7: Verify Trace Context in Logs

Your logs should include trace IDs. Let's verify:

### 7.1 Check Next.js Logs

**In Terminal 1** (where Next.js is running), you should see structured logs:

```json
{
  "level": "info",
  "time": 1732032451234,
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "msg": "API request received"
}
```

### 7.2 Check Log Files

```bash
# Pretty-print recent logs
tail -20 apps/web/logs/app.log | pnpm exec pino-pretty

# Search for a specific trace ID
grep "4bf92f3577b34da6a3ce929d0e0e4736" apps/web/logs/app.log | pnpm exec pino-pretty
```

### 7.3 Correlate Logs with Traces

1. Copy a `trace_id` from your logs
2. Go to Jaeger UI (http://localhost:16686)
3. Search by "Trace ID" and paste the trace ID
4. You should see the exact trace that generated those logs!

---

## Step 8: Check Prometheus Targets

Even though we haven't implemented metrics yet, let's verify Prometheus is configured:

1. Open http://localhost:9090
2. Go to **Status → Targets**
3. You should see:
   - `nextjs-app` (host.docker.internal:9464) - **DOWN** (expected - not exporting metrics yet)
   - `graphql-server` (host.docker.internal:9465) - **DOWN** (expected - not exporting metrics yet)
   - `prometheus` (localhost:9090) - **UP** ✅ (Prometheus self-monitoring)

**This is expected!** We'll implement metrics in Phase 3.

---

## Troubleshooting

### Issue: No traces appearing in Jaeger

**Possible causes:**
1. Applications aren't sending traces
2. Environment variables incorrect
3. Jaeger not running or not accessible

**Solutions:**
```bash
# 1. Verify Jaeger is running and healthy
docker compose -f docker-compose.observability.yml ps
# jaeger should be "Up (healthy)"

# 2. Check environment variables in your apps
# Next.js (.env.local)
cat apps/web/.env.local | grep OTEL

# GraphQL (.env)
cat packages/graphql-server/.env | grep OTEL

# 3. Check application logs for OpenTelemetry errors
# Look for "OpenTelemetry" or "OTLP" in logs

# 4. Test OTLP endpoint manually
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{}'
# Should return 400 (endpoint is working)
```

### Issue: Traces missing trace context (no trace_id in logs)

**Solution:**
This means OpenTelemetry instrumentation isn't running or context isn't being propagated.

```bash
# For Next.js - ensure instrumentation.node.ts exists
ls apps/web/instrumentation.node.ts

# For GraphQL - ensure instrumentation is imported FIRST
head -5 packages/graphql-server/src/lambda.ts
# Should see: import './infrastructure/instrumentation.js';

# Restart applications after fixing
```

### Issue: Grafana datasources not working

**Solution:**
```bash
# 1. Check containers can communicate
docker exec grafana ping -c 1 prometheus
docker exec grafana ping -c 1 jaeger

# 2. Verify datasource URLs in Grafana UI
# Prometheus: http://prometheus:9090 (NOT localhost!)
# Jaeger: http://jaeger:16686

# 3. Check datasource configuration
cat grafana/provisioning/datasources/datasources.yml
```

### Issue: Applications won't start after env changes

**Solution:**
```bash
# Restart applications to pick up new environment variables
# Stop all running processes (Ctrl+C in terminals)

# Then start again:
cd apps/web && pnpm dev
cd packages/graphql-server && pnpm dev:server
```

---

## Success Checklist

Once you complete the testing, you should have:

- ✅ All three Docker containers running and healthy
- ✅ Grafana datasources configured and working
- ✅ Applications running with OpenTelemetry enabled
- ✅ Traces visible in Jaeger UI
- ✅ Logs showing trace_id and span_id
- ✅ Ability to correlate logs to traces

---

## What's Next?

After verifying the current setup works:

1. **Commit your local environment files** (optional - `.env.local` and `.env` are git-ignored)
2. **Proceed to Phase 3** - Add metrics collection
3. **Create Grafana dashboards** - RED, USE, and Business KPIs metrics

The foundation is now solid! 🎉

---

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| **Jaeger UI** | http://localhost:16686 | None |
| **Prometheus** | http://localhost:9090 | None |
| **Grafana** | http://localhost:3001 | admin/admin |
| **Next.js App** | http://localhost:3000 | - |
| **GraphQL Server** | http://localhost:4000 | - |

---

## Tips

- Keep Jaeger UI open in a browser tab while developing
- After any API call, check Jaeger for new traces
- Use the trace timeline to identify slow operations
- Copy trace IDs from logs and search in Jaeger to correlate
- Check Prometheus targets page periodically (Status → Targets)