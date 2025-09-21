# Social Media App - Full Stack Hello World

A modern full-stack application built with ESM, Node.js v22, TypeScript, Vite, and AWS Lambda.

## Architecture

- **Monorepo Structure**: PNPM workspaces for package management
- **Shared Schemas**: Single source of truth using Zod for validation
- **Backend**: AWS Lambda functions with TypeScript and ESM
- **Frontend**: Vite + React + TypeScript
- **Infrastructure**: AWS CDK for Infrastructure as Code
- **Testing**: Vitest for unit and integration tests

## Project Structure

```
social-media-app/
├── packages/
│   ├── shared/          # Shared Zod schemas
│   ├── dal/             # Data Access Layer
│   ├── backend/         # Lambda functions
│   └── frontend/        # Vite React app
├── infrastructure/      # CDK stacks
├── e2e/                 # End-to-end tests
└── .github/workflows/   # CI/CD pipelines
```

## Prerequisites

- Node.js v22+
- PNPM v8+
- AWS CLI configured
- AWS CDK CLI

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build all packages**:
   ```bash
   pnpm run build
   ```

3. **Run tests**:
   ```bash
   pnpm run test
   ```

4. **Start development servers**:
   ```bash
   pnpm run dev
   ```

## Deployment

1. **Configure AWS credentials**:
   ```bash
   aws configure
   ```

2. **Bootstrap CDK** (first time only):
   ```bash
   cd infrastructure
   cdk bootstrap
   ```

3. **Deploy to AWS**:
   ```bash
   cd infrastructure
   cdk deploy --all
   ```

## Development

### Running locally

1. Start the frontend dev server:
   ```bash
   cd packages/frontend
   pnpm dev
   ```

2. For backend development, update the API URL in frontend to point to your deployed Lambda functions.

### Testing

- **Unit tests**: `pnpm test`
- **Watch mode**: `pnpm test:watch`
- **Coverage**: `pnpm test:coverage`

### Code Quality

- **Linting**: `pnpm lint`
- **Type checking**: `pnpm typecheck`
- **Format**: `pnpm format`

## Key Features

- ✅ ESM throughout with Node.js v22
- ✅ TypeScript with strict mode
- ✅ Functional programming with lodash/fp
- ✅ Single source of truth for schemas
- ✅ Comprehensive testing (90%+ coverage)
- ✅ AWS Lambda with CDK
- ✅ Vite for fast development
- ✅ Automated CI/CD with GitHub Actions

## Environment Variables

### Frontend
- `VITE_API_URL`: API Gateway URL (defaults to http://localhost:3001)

### Backend
- `NODE_ENV`: Environment (dev/staging/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)

## License

MIT