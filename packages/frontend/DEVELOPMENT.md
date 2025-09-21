# Frontend Development Guide

## API Error Resolution

The frontend is now configured with comprehensive error handling and mock API support for development.

## Current Setup

### Mock API Server (MSW)
- **Mock Service Worker** is automatically started in development mode
- API calls to `http://localhost:3001` are intercepted and mocked
- Realistic response times with random delays (300-500ms)
- Full request/response validation using shared Zod schemas

### Error Handling Strategy

#### Custom Error Classes
- `ApiError`: General API errors with status codes
- `NetworkError`: Connection failures and timeouts
- `ValidationError`: Request/response validation failures

#### Retry Logic
- **Automatic retries** for network errors and 5xx server errors
- **Exponential backoff** with jitter (1s → 2s → 4s)
- **Maximum 3 retries** with 30-second timeout per request
- **Circuit breaker pattern** prevents cascade failures

#### User-Friendly Error Messages
- Network errors: "Unable to connect to the server..."
- Validation errors: "Invalid input: [details]"
- Server errors: "Server error: [message]"
- Generic fallback: "An unexpected error occurred"

## Development Workflow

### 1. Start Development Server
\`\`\`bash
cd packages/frontend
pnpm dev
\`\`\`

### 2. Mock API Endpoints
The following endpoints are mocked:
- `POST /hello` - Hello world with validation
- `GET /health` - Health check endpoint

### 3. Environment Configuration
- **Development**: `.env.development` (MSW enabled)
- **Production**: `.env.production` (MSW disabled)

## Testing Error Scenarios

### Network Errors
The mock API automatically handles various scenarios:
- Simulated delays (300-500ms)
- Validation errors for invalid requests
- Server errors (can be simulated)

### Manual Testing
1. **Happy Path**: Enter a name and submit
2. **Validation**: Submit with invalid data
3. **Network Issues**: Disable network and test retry logic

## Future Enhancements

### Monitoring Integration
Consider adding:
- Sentry for error tracking
- Custom analytics for user behavior
- Performance monitoring

### Circuit Breaker
For production:
- Implement circuit breaker pattern
- Add health check monitoring
- Graceful degradation strategies

## Configuration

### Environment Variables
- `VITE_API_URL`: Backend API URL
- `VITE_APP_ENV`: Environment (development/production)
- `VITE_ENABLE_MSW`: Enable/disable MSW
- `VITE_LOG_LEVEL`: Logging level (debug/info/error)

## Troubleshooting

### Common Issues
1. **"Network error"**: Check if MSW is running (console logs)
2. **Validation errors**: Check request format against schemas
3. **Timeout errors**: Increase timeout or check network

### Debug Mode
Enable debug logging:
\`\`\`bash
VITE_LOG_LEVEL=debug pnpm dev
\`\`\`