# SigNoz Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: ClickHouse Container Fails to Start

**Symptom:**
```
dependency failed to start: container signoz-clickhouse is unhealthy
```

**Diagnosis:**
```bash
# Check ClickHouse logs
docker logs signoz-clickhouse

# Check container status
docker ps -a | grep signoz
```

**Solutions:**

#### Solution A: Clean Restart
```bash
# Stop all containers and remove volumes
docker compose -f docker-compose.signoz.yml down -v

# Remove any orphaned volumes
docker volume prune -f

# Start fresh
docker compose -f docker-compose.signoz.yml up -d

# Watch logs
docker compose -f docker-compose.signoz.yml logs -f
```

#### Solution B: Port Conflicts
```bash
# Check if ports are already in use
lsof -i :9000    # ClickHouse native protocol
lsof -i :8123    # ClickHouse HTTP
lsof -i :4317    # OTLP gRPC
lsof -i :4318    # OTLP HTTP
lsof -i :3301    # SigNoz UI

# If ports are in use, either:
# 1. Stop the conflicting service
# 2. Or modify docker-compose.signoz.yml to use different ports:
#    ports:
#      - "9001:9000"  # Instead of 9000:9000
```

#### Solution C: Memory Issues
ClickHouse needs ~2GB RAM minimum. Check Docker resources:

**Docker Desktop:**
1. Open Docker Desktop → Settings → Resources
2. Ensure Memory is at least 4GB (8GB recommended)
3. Apply & Restart

**Linux:**
```bash
# Check available memory
free -h

# If low on memory, you can reduce ClickHouse memory usage
# Add to docker-compose.signoz.yml under clickhouse environment:
environment:
  - CLICKHOUSE_DB=signoz
  - MAX_MEMORY_USAGE=2000000000  # 2GB limit
```

#### Solution D: ARM Architecture (M1/M2 Macs)
ClickHouse Alpine images can have issues on ARM. Use platform override:

```bash
# Edit docker-compose.signoz.yml, change clickhouse service:
clickhouse:
  platform: linux/amd64  # Force AMD64 emulation
  image: clickhouse/clickhouse-server:23.11-alpine
  # ... rest of config
```

Or use a different image:
```yaml
clickhouse:
  image: clickhouse/clickhouse-server:23.11  # Non-alpine version
```

#### Solution E: Permission Issues
```bash
# Ensure Docker has permission to create volumes
# On Linux, you might need to fix ownership:
sudo chown -R 101:101 ./docker-volumes/signoz/clickhouse

# Or use named volumes (already configured in updated docker-compose.signoz.yml)
```

---

### Issue 2: "Found orphan containers"

**Symptom:**
```
WARN Found orphan containers (tamafriends-localstack, tamafriends-postgres-local, ...)
```

**Solution:**
```bash
# This is just a warning. To clean up orphaned containers:
docker compose -f docker-compose.signoz.yml up -d --remove-orphans
```

---

### Issue 3: Traces Not Appearing in SigNoz

**Diagnosis:**
```bash
# 1. Check all containers are running
docker compose -f docker-compose.signoz.yml ps

# 2. Check OTLP collector logs
docker logs signoz-otel-collector

# 3. Test OTLP endpoint is reachable
curl http://localhost:4318/v1/traces
# Should return: 405 Method Not Allowed (means it's listening)
```

**Solutions:**

#### Check Environment Variables
```bash
# In apps/web/.env.local and packages/graphql-server/.env
echo $OTEL_EXPORTER_OTLP_ENDPOINT
# Should output: http://localhost:4318/v1/traces
```

#### Verify Instrumentation is Running
```bash
# Start Next.js and look for this log:
pnpm dev
# Should see: [OpenTelemetry] Instrumentation registered for social-media-web

# Start GraphQL server:
cd packages/graphql-server
pnpm dev:server
# Should see: [OpenTelemetry] SDK started successfully
```

#### Generate Test Trace
```bash
# Hit an API endpoint to generate a trace
curl http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","username":"test"}'

# Then check SigNoz UI at http://localhost:3301
```

---

### Issue 4: Can't Access SigNoz UI

**Symptom:** Browser shows "Can't connect" when visiting http://localhost:3301

**Solutions:**

```bash
# 1. Check frontend container is running
docker ps | grep signoz-frontend

# 2. Check frontend logs
docker logs signoz-frontend

# 3. Verify query-service is healthy
docker logs signoz-query-service

# 4. Try accessing directly
curl http://localhost:3301
# Should return HTML
```

---

## Alternative: Use SigNoz Cloud

If local setup is problematic, use SigNoz Cloud (free tier available):

1. **Sign up:** https://signoz.io/teams/

2. **Get Ingestion Key:** After signup, you'll get an OTLP endpoint like:
   ```
   https://ingest.{region}.signoz.cloud:443/v1/traces
   ```

3. **Update Environment Variables:**
   ```bash
   # apps/web/.env.local
   OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us.signoz.cloud:443/v1/traces
   OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<your-token>

   # packages/graphql-server/.env
   OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.us.signoz.cloud:443/v1/traces
   OTEL_EXPORTER_OTLP_HEADERS=signoz-access-token=<your-token>
   ```

4. **Update Instrumentation:**
   ```typescript
   // apps/web/instrumentation.node.ts
   import { registerOTel } from '@vercel/otel';

   export function register() {
     registerOTel({
       serviceName: 'social-media-web',
       // Add headers for SigNoz Cloud
       traceExporterOptions: {
         headers: {
           'signoz-access-token': process.env.SIGNOZ_ACCESS_TOKEN || '',
         },
       },
     });
   }
   ```

5. **No Docker Required!** Just start your apps and traces will appear in SigNoz Cloud.

---

## Simplified Local Setup (No SigNoz)

If you just want to see traces locally without SigNoz:

### Option 1: Console Exporter
Traces printed to console (good for debugging):

```typescript
// apps/web/instrumentation.node.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  serviceName: 'social-media-web',
  traceExporter: new ConsoleSpanExporter(),
});

sdk.start();
```

### Option 2: Jaeger (Lighter Alternative)
```bash
# Single container, much lighter than SigNoz
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Access UI: http://localhost:16686
```

---

## Health Check Commands

```bash
# Check all containers
docker compose -f docker-compose.signoz.yml ps

# Check logs for all services
docker compose -f docker-compose.signoz.yml logs

# Check specific service
docker compose -f docker-compose.signoz.yml logs clickhouse
docker compose -f docker-compose.signoz.yml logs otel-collector
docker compose -f docker-compose.signoz.yml logs query-service
docker compose -f docker-compose.signoz.yml logs frontend

# Restart a specific service
docker compose -f docker-compose.signoz.yml restart clickhouse

# Complete teardown
docker compose -f docker-compose.signoz.yml down -v
docker volume prune -f
docker network prune -f
```

---

## Still Having Issues?

1. **Check Docker Desktop is running** (if using Docker Desktop)

2. **Check Docker version:**
   ```bash
   docker --version
   docker compose version
   ```
   Requires: Docker 20.10+ and Docker Compose 2.0+

3. **Try the official SigNoz installation:**
   ```bash
   git clone https://github.com/SigNoz/signoz.git
   cd signoz/deploy
   docker compose -f docker/clickhouse-setup/docker-compose.yaml up -d
   ```

4. **Use logs-only mode:** You can still use Pino logging without OTel/SigNoz:
   - Comment out OTEL_EXPORTER_OTLP_ENDPOINT in .env files
   - Logs will still have trace IDs (generated locally)
   - View logs in files: `apps/web/logs/app.log`
   - Pretty print: `cat apps/web/logs/app.log | pnpm exec pino-pretty`

---

## Performance Tuning

If SigNoz is running but slow:

```yaml
# docker-compose.signoz.yml
clickhouse:
  environment:
    - MAX_CONCURRENT_QUERIES=100
    - MAX_SERVER_MEMORY_USAGE=8000000000  # 8GB
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        memory: 2G
```

---

## Quick Reference

| Service | Port | Purpose |
|---------|------|---------|
| ClickHouse (Native) | 9000 | Database connection |
| ClickHouse (HTTP) | 8123 | Health checks, queries |
| OTLP gRPC | 4317 | Receive traces (gRPC) |
| OTLP HTTP | 4318 | Receive traces (HTTP) |
| Query Service | 8080 | Backend API |
| Frontend | 3301 | SigNoz UI |
