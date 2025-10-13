# AWS X-Ray Distributed Tracing Implementation

## Overview

This document describes the AWS X-Ray distributed tracing implementation for the social media application. X-Ray provides end-to-end visibility into request flow across all services, helping diagnose performance bottlenecks and debug production issues.

## Architecture

### Components Traced

1. **Lambda Functions**
   - All API handlers (Posts, Feed, Likes, Auth, Profile)
   - Stream processors (Kinesis consumers, DynamoDB stream handlers)
   - Background processors (notification, feed fanout)

2. **AWS Services**
   - DynamoDB (queries, puts, deletes)
   - Kinesis (event publishing and consumption)
   - S3 (presigned URL generation, object operations)
   - Redis/ElastiCache (cache operations)

3. **Custom Operations**
   - JWT verification
   - Request validation
   - Business logic operations
   - Cache hit/miss tracking

### Trace Structure

```
API Gateway Request
└── Lambda Handler (CREATE_POST)
    ├── JWT Verification
    ├── Request Validation
    ├── DynamoDB Operations
    │   ├── GetUserProfile
    │   └── CreatePost
    ├── S3 Operations
    │   └── GeneratePresignedUrl
    └── Kinesis Operations
        └── PublishEvent (POST_CREATED)
            └── Kinesis Consumer
                └── Redis Cache Update
```

## Implementation

### 1. Tracer Configuration

The tracer is configured in `/packages/backend/src/utils/tracer.ts`:

```typescript
import { Tracer } from '@aws-lambda-powertools/tracer';

export const tracer = new Tracer({
  serviceName: 'social-media-app',
  captureHTTPsRequests: !isProd,  // Disable in prod for performance
  enabled: !isLocal && !isTest     // Disable locally
});
```

### 2. Lambda Handler Instrumentation

All Lambda handlers are wrapped with the tracer:

```typescript
export const handler = tracer.captureLambdaHandler(async (event) => {
  // Handler logic
});
```

### 3. AWS SDK Instrumentation

AWS SDK clients are automatically instrumented:

```typescript
const dynamoClient = tracer.captureAWSv3Client(createDynamoDBClient());
const kinesisClient = tracer.captureAWSv3Client(createKinesisClient());
const s3Client = tracer.captureAWSv3Client(createS3Client());
```

### 4. Custom Subsegments

Critical operations are wrapped in subsegments:

```typescript
await tracedOperation('CreatePost', async () => {
  return await postService.createPost(userId, data);
});
```

### 5. Annotations and Metadata

#### Annotations (Indexed, Searchable)
- `operationType`: Type of operation (CREATE_POST, GET_FEED, etc.)
- `userId`: User performing the operation
- `postId`: Post being operated on
- `errorType`: Type of error encountered
- `cache.hit`: Cache hit/miss for read operations

#### Metadata (Detailed Context)
- Request bodies
- Validation errors
- DynamoDB query parameters
- Kinesis event payloads

## CDK Configuration

X-Ray tracing is enabled in CDK constructs:

```typescript
const lambda = new NodejsFunction(this, 'Function', {
  // ... other config
  tracing: lambda.Tracing.ACTIVE,  // Enable X-Ray
});
```

## Usage Patterns

### 1. Basic Operation Tracing

```typescript
// Trace a database operation
await tracedOperation('GetUserProfile', async () => {
  traceDynamoDBOperation('GetItem', tableName, { userId });
  return await profileService.getProfileById(userId);
});
```

### 2. Cache Operations

```typescript
// Track cache hit/miss
traceCacheOperation('get', `feed:${userId}`, cacheHit);
```

### 3. Event Publishing

```typescript
// Trace Kinesis events
traceKinesisPublish('POST_CREATED', eventId, partitionKey);
```

### 4. Error Capturing

```typescript
catch (error) {
  captureTraceError(error, {
    operation: 'createPost',
    userId,
    postId
  });
  throw error;
}
```

## Performance Considerations

### Overhead

- **Latency Impact**: < 1% (typically 1-5ms per request)
- **Memory Usage**: ~10MB per Lambda container
- **Cost**: ~$0.0001 per traced request

### Optimization Strategies

1. **Sampling**: Configure sampling rules for high-traffic endpoints
2. **Selective Tracing**: Disable response body capture in production
3. **Subsegment Limits**: Avoid creating excessive subsegments (< 50 per trace)

## Troubleshooting Guide

### Common Issues

#### 1. Traces Not Appearing

**Symptoms**: Lambda executes but no traces in X-Ray console

**Solutions**:
- Verify `tracing: lambda.Tracing.ACTIVE` in CDK
- Check Lambda has X-Ray write permissions
- Ensure `NODE_ENV` is not 'local' or 'test'
- Verify AWS region matches X-Ray console

#### 2. Incomplete Traces

**Symptoms**: Some segments missing from trace

**Solutions**:
- Check subsegment is properly closed
- Verify async operations are awaited
- Ensure error handlers close subsegments

#### 3. High Latency from Tracing

**Symptoms**: Increased Lambda duration

**Solutions**:
- Disable response capture in production
- Reduce custom subsegments
- Enable sampling for high-traffic functions

### Debug Commands

```bash
# Check if tracing is enabled for a Lambda
aws lambda get-function-configuration \
  --function-name social-media-app-create-post-dev \
  --query 'TracingConfig'

# View recent traces
aws xray get-trace-summaries \
  --time-range-type LastHour \
  --query 'TraceSummaries[?ServiceNames[?contains(@, `social-media-app`)]]'

# Get detailed trace
aws xray get-trace \
  --trace-id "1-5e1b4c87-07c5368a2a4c6c8a0a9c6c8a"
```

## Monitoring Queries

### X-Ray Service Map Filters

```
# Find slow requests (> 1 second)
responseTime > 1000

# Find errors
error = true OR fault = true

# Find specific user operations
annotation.userId = "user-123"

# Find cache misses
annotation.cache.hit = false

# Find specific operation types
annotation.operationType = "CREATE_POST"
```

### CloudWatch Insights Queries

```sql
-- Find slowest operations
fields @timestamp, duration, annotation.operationType
| filter serviceName = "social-media-app"
| sort duration desc
| limit 20

-- Cache hit rate by operation
fields annotation.operationType, annotation.cache.hit
| filter serviceName = "social-media-app"
| stats count() by annotation.operationType, annotation.cache.hit

-- Error rate by function
fields @timestamp, error.message, annotation.operationType
| filter error = true
| stats count() by annotation.operationType
```

## Best Practices

### DO:
- ✅ Add meaningful annotations for searching
- ✅ Use subsegments for external service calls
- ✅ Capture errors with context
- ✅ Close subsegments in finally blocks
- ✅ Use consistent naming conventions
- ✅ Track business metrics as annotations

### DON'T:
- ❌ Log sensitive data (passwords, tokens)
- ❌ Create excessive subsegments (> 50)
- ❌ Capture large payloads in metadata
- ❌ Enable in local development
- ❌ Forget to await async operations
- ❌ Leave subsegments unclosed

## Cost Analysis

### Pricing Model
- **Traces Recorded**: $5.00 per million traces
- **Traces Retrieved**: $0.50 per million traces
- **Traces Scanned**: $0.50 per million traces

### Example Monthly Cost (1M requests/month)
```
Traces Recorded: 1M × $5.00/M = $5.00
Traces Retrieved: 100K × $0.50/M = $0.05
Traces Scanned: 50K × $0.50/M = $0.025
------------------------
Total: ~$5.08/month
```

## Integration with Other Tools

### CloudWatch Integration
- X-Ray traces link to CloudWatch Logs
- Use correlation IDs to track across services
- Set up CloudWatch alarms on X-Ray metrics

### Third-Party APM Tools
- Export traces to DataDog via AWS Kinesis
- Send to New Relic via OpenTelemetry collector
- Forward to Splunk for centralized logging

## Future Enhancements

1. **Sampling Rules**: Implement dynamic sampling based on error rates
2. **Custom Dashboards**: Build Grafana dashboards from X-Ray metrics
3. **Automated Alerting**: Set up PagerDuty alerts for anomalies
4. **Performance Baselines**: Establish SLI/SLO based on trace data
5. **Canary Monitoring**: Use synthetic traces for proactive monitoring

## References

- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/)
- [AWS Lambda Powertools - Tracer](https://docs.powertools.aws.dev/lambda/typescript/latest/core/tracer/)
- [X-Ray Pricing](https://aws.amazon.com/xray/pricing/)
- [OpenTelemetry AWS Distro](https://aws-otel.github.io/docs/)