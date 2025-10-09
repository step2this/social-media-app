#!/bin/bash

# Sequential Development Server Startup Script
# Ensures LocalStack initialization completes before starting application servers
# This prevents stream processor initialization failures

set -e

echo "🚀 Starting development environment sequentially..."
echo ""

# Step 1: Start LocalStack
echo "1️⃣  Starting LocalStack..."
docker-compose -f docker-compose.local.yml up -d

# Step 2: Wait for LocalStack init script to complete
echo "2️⃣  Waiting for LocalStack initialization..."
echo "   (Checking for DynamoDB table + streams setup...)"

MAX_WAIT=30
ELAPSED=0
INIT_COMPLETE=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Check docker logs for initialization complete message
  if docker logs tamafriends-localstack 2>&1 | grep -q "✅ TamaFriends LocalStack initialization complete"; then
    INIT_COMPLETE=true
    break
  fi

  sleep 1
  ELAPSED=$((ELAPSED + 1))

  # Show progress dots
  if [ $((ELAPSED % 3)) -eq 0 ]; then
    echo -n "."
  fi
done

echo ""

if [ "$INIT_COMPLETE" = false ]; then
  echo "❌ LocalStack initialization timed out after ${MAX_WAIT}s"
  echo ""
  echo "🔍 Troubleshooting:"
  echo "   - Check LocalStack logs: docker logs tamafriends-localstack"
  echo "   - Verify LocalStack health: curl http://localhost:4566/_localstack/health"
  echo "   - Check init script: .localstack/init.sh"
  exit 1
fi

echo "✅ LocalStack initialized successfully!"
echo ""

# Step 3: Start backend server
echo "3️⃣  Starting backend server (with stream processor)..."
pnpm --filter @social-media-app/backend dev:local &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Step 4: Start frontend server
echo "4️⃣  Starting frontend server..."
pnpm --filter @social-media-app/frontend dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Development environment started!"
echo ""
echo "📊 Services:"
echo "   LocalStack:  http://localhost:4566"
echo "   Backend API: http://localhost:3001"
echo "   Frontend:    http://localhost:3000"
echo ""
echo "🔄 Stream Processor: Active (polls DynamoDB Streams every 2s)"
echo "📈 Profile stats will update automatically"
echo ""
echo "⏹️  To stop: pnpm servers:stop"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
