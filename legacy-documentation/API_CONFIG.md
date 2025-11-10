# Frontend API Configuration Guide

## 🌐 Centralized API Configuration

Your frontend now uses a centralized, environment-based API configuration system:

### **Configuration Files:**

- **`.env.development`** → Points to AWS backend
- **`.env.production`** → Points to AWS backend
- **`.env.local`** → Points to local mocks (overrides development)

### **Current Setup:**

```bash
# Development (default) - connects to AWS
VITE_API_URL=https://sdf1ljix88.execute-api.us-east-1.amazonaws.com

# Production - connects to AWS
VITE_API_URL=https://sdf1ljix88.execute-api.us-east-1.amazonaws.com

# Local (optional) - connects to mocks
VITE_API_URL=http://localhost:3001
```

## 🚀 Easy Environment Switching

### **New npm Scripts:**

```bash
# Use AWS backend (default)
pnpm run dev:aws

# Use local mocks for development
pnpm run dev:local

# Regular dev (follows .env.development = AWS)
pnpm run dev
```

### **How it Works:**

- **`dev:aws`** - Removes `.env.local`, uses AWS backend
- **`dev:local`** - Creates `.env.local` with mocks enabled
- **`dev`** - Uses whatever configuration exists

## 📍 API Client Integration

The API configuration is centralized in `src/services/apiClient.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

This automatically uses the correct URL based on your environment files.

## 🔧 AWS CLI Configuration

AWS CLI is now properly configured:

```bash
aws configure list
# region: us-east-1 ✅
# access_key: ****************R6L4 ✅
# secret_key: ****************Xc3r ✅
```

## ✅ Current Status

- ✅ **Frontend points to AWS backend** by default
- ✅ **AWS CLI has proper region** (us-east-1)
- ✅ **Easy switching** between AWS and mocks
- ✅ **Server auto-restarted** with new config
- ✅ **Production config** already correct

## 🧪 Testing Your Configuration

1. **Check browser console** at http://localhost:3001
   - Look for: `🌐 API Client Configuration`
   - Should show AWS URL

2. **Test API calls** in browser network tab
   - Should go to `https://sdf1ljix88.execute-api.us-east-1.amazonaws.com`

3. **Switch to mocks if needed:**
   ```bash
   pnpm run dev:local
   ```

Your frontend is now perfectly configured to consume your deployed AWS backend!