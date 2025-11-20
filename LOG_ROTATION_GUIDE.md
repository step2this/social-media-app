# Log Rotation Guide

## Overview

Your logging infrastructure now includes **automatic daily log rotation** with compression and retention management. Logs are written as JSON for efficient searching and automatically rotated each day to prevent massive log files.

## What Changed

### Before
- Next.js: Pretty-printed logs to single file (no rotation)
- GraphQL: Pretty-printed logs to single file (no rotation)
- Files could grow unbounded

### After
- Next.js: **JSON logs** with **daily rotation** to `apps/web/logs/app.log`
- GraphQL: **JSON logs** with **daily rotation** to `packages/graphql-server/logs/graphql.log`
- **14-day retention** - old logs automatically deleted
- **Gzip compression** - rotated logs compressed to save space
- **Fresh log each day** - prevents massive log files

## Log File Structure

### Next.js App
```bash
# Current log file (JSON format)
apps/web/logs/app.log

# Rotated log files (compressed)
apps/web/logs/app-20241120.log.gz  # Yesterday's logs
apps/web/logs/app-20241119.log.gz  # Two days ago
# ... up to 14 days

# View live logs (pipe through pino-pretty for formatting)
tail -f apps/web/logs/app.log | pnpm exec pino-pretty

# View as JSON (for grep/jq parsing)
tail -f apps/web/logs/app.log
```

### GraphQL Server
```bash
# Current log file (JSON format)
packages/graphql-server/logs/graphql.log

# Rotated log files (compressed)
packages/graphql-server/logs/graphql-20241120.log.gz
packages/graphql-server/logs/graphql-20241119.log.gz
# ... up to 14 days

# View live logs (pipe through pino-pretty for formatting)
tail -f packages/graphql-server/logs/graphql.log | pnpm exec pino-pretty

# View as JSON (for grep/jq parsing)
tail -f packages/graphql-server/logs/graphql.log
```

### Rotation Schedule
- **Frequency**: Daily at midnight
- **Retention**: 14 days (2 weeks)
- **Compression**: Gzip (rotated files only)
- **Current file**: Uncompressed JSON for fast writes
- **Rotated files**: Compressed to save disk space

## Log Format

Logs are automatically formatted like this:

```
[2024-11-20 13:45:23.456] INFO: User logged in successfully
    env: "development"
    app: "social-media-web"
    trace_id: "4bf92f3577b34da6a3ce929d0e0e4736"
    span_id: "00f067aa0ba902b7"
    userId: "user-123"
    email: "user@example.com"
```

### Key Features
- **Human-readable timestamps** (not Unix epoch)
- **Colored log levels** (when viewing in terminal)
- **Indented metadata** for easy scanning
- **Automatic trace context** (trace_id, span_id)
- **Clean, organized output**

## Usage Examples

### 1. View Recent Logs

```bash
# Last 50 lines from Next.js app
tail -50 apps/web/logs/app.log

# Last 50 lines from GraphQL server
tail -50 packages/graphql-server/logs/graphql.log

# Follow logs in real-time
tail -f apps/web/logs/app.log
```

### 2. Search for Specific Trace

```bash
# Find all logs for a specific request (using trace_id)
grep "4bf92f3577b34da6a3ce929d0e0e4736" apps/web/logs/app.log

# Search across both services
grep "4bf92f3577b34da6a3ce929d0e0e4736" apps/web/logs/app.log packages/graphql-server/logs/graphql.log
```

### 3. Filter by Log Level

```bash
# Show only errors
grep "ERROR:" apps/web/logs/app.log

# Show errors and warnings
grep -E "(ERROR|WARN):" apps/web/logs/app.log

# Count errors in the last hour
grep "ERROR:" apps/web/logs/app.log | wc -l
```

### 4. Search for Specific User Activity

```bash
# Find all logs for a specific user
grep "userId.*user-123" apps/web/logs/app.log

# Find login events
grep "logged in" apps/web/logs/app.log
```

### 5. Time-Range Queries

```bash
# Find logs from a specific time (example: 13:45)
grep "13:45" apps/web/logs/app.log

# Last 100 lines with context (10 lines before/after match)
grep -C 10 "error" apps/web/logs/app.log | tail -100
```

## Optional: Enable Console Output

By default, logs only go to files. If you want to see them in the console too:

```bash
# Set environment variable
export CONSOLE_LOGS=true

# Then start your app
cd apps/web
pnpm dev
```

This will output pretty logs to **both** console and file.

## Production Behavior

### Next.js (Vercel/Serverless)
- File logging won't work on serverless (ephemeral filesystem)
- Consider using cloud logging (CloudWatch, Datadog, etc.)
- Or keep JSON console output for log aggregation

### GraphQL (AWS Lambda)
- In production, logs go to JSON stdout (for CloudWatch)
- Pretty file logs are **development-only**
- CloudWatch Logs Insights can query the JSON logs

## Log Rotation Details

### How It Works
- **rotating-file-stream** package handles rotation
- New file created at midnight each day
- Current day's log: `app.log` or `graphql.log` (uncompressed)
- Previous days: `app-20241120.log.gz`, `app-20241119.log.gz`, etc.
- Compression: Gzip (automatically applied after rotation)
- Retention: Automatically deletes files older than 14 days

### Disk Space Savings
```
Example: 14 days of logs

Without rotation (uncompressed):
- Single file: ~2.8 GB
- Hard to search, slow to open

With rotation (compressed):
- Current day: ~200 MB (uncompressed)
- 13 previous days: ~130 MB each (gzipped)
- Total: ~1.9 GB (32% savings)
- Each file easy to search and analyze
```

### Viewing Rotated Logs
```bash
# View compressed logs
zcat apps/web/logs/app-20241120.log.gz | pnpm exec pino-pretty

# Search compressed logs
zgrep "trace_id.*abc123" apps/web/logs/app-20241120.log.gz | pnpm exec pino-pretty

# List all log files with sizes
ls -lh apps/web/logs/
```

## Distributed Tracing Workflow

1. **User performs action** → Next.js creates trace ID
2. **Trace ID propagated** → GraphQL server receives it
3. **Both services log** with same trace_id
4. **Search logs** by trace_id to see the full flow

Example workflow:
```bash
# 1. Find a trace_id from any log
grep "User registration" apps/web/logs/app.log | head -1

# Output shows: trace_id: "abc123def456"

# 2. View ALL logs for that trace across both services
grep "abc123def456" apps/web/logs/app.log packages/graphql-server/logs/graphql.log

# 3. See the complete request flow!
```

## Troubleshooting

### Logs directory doesn't exist
The logger automatically creates it, but if needed:
```bash
mkdir -p apps/web/logs
mkdir -p packages/graphql-server/logs
```

### No logs appearing
1. Check that the app is running (not just building)
2. Verify log level: `LOG_LEVEL=debug` in `.env.local`
3. Trigger a log by hitting an API route

### Want JSON logs back?
Edit the logger config and remove the transport configuration to revert to JSON output.

## Benefits

✅ **No more piping** - Logs are readable immediately
✅ **Easy debugging** - Human-friendly format
✅ **Fast searching** - Use standard grep/awk tools
✅ **Trace correlation** - Follow requests across services
✅ **Developer friendly** - No need to remember pino-pretty syntax
✅ **Production ready** - Automatic trace context in every log

## Configuration

### Log Levels
Set in `.env.local` (Next.js) or `.env` (GraphQL):
```bash
LOG_LEVEL=debug  # Very verbose, development only
LOG_LEVEL=info   # Standard logging (recommended)
LOG_LEVEL=warn   # Only warnings and errors
LOG_LEVEL=error  # Only errors
```

### Pino-Pretty Options
Edit `/Users/shaperosteve/social-media-app/apps/web/lib/logger.ts` or `/Users/shaperosteve/social-media-app/packages/graphql-server/src/infrastructure/logger.ts` to customize:

```typescript
{
  target: 'pino-pretty',
  options: {
    colorize: false,        // ANSI colors (false for files)
    translateTime: 'yyyy-mm-dd HH:MM:ss.l',  // Timestamp format
    ignore: 'pid,hostname', // Fields to hide
    singleLine: false,      // Single vs multi-line output
  },
}
```

## Next Steps

1. Start your apps and generate some logs
2. Open the log files and see the pretty output
3. Try searching for traces across services
4. Set up log rotation if needed

Happy logging! 🎉
