#!/bin/bash

# Development Environment Cleanup Script
# Safely stops all development servers and services

echo "🧹 Cleaning up development environment..."

# Function to safely kill processes
safe_kill() {
    local pids="$1"
    local description="$2"

    if [ -n "$pids" ]; then
        echo "🔄 Stopping $description..."
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2

        # Force kill if still running
        local remaining=$(echo "$pids" | xargs ps -p 2>/dev/null | grep -v PID | awk '{print $1}' || true)
        if [ -n "$remaining" ]; then
            echo "⚡ Force stopping remaining $description..."
            echo "$remaining" | xargs kill -9 2>/dev/null || true
        fi
        echo "✅ $description stopped"
    else
        echo "✅ No $description running"
    fi
}

# Stop development servers on common ports
echo "🔍 Finding development servers..."
DEV_PIDS=$(lsof -ti :3000,:3001,:3002 2>/dev/null || true)
safe_kill "$DEV_PIDS" "development servers (ports 3000-3002)"

# Stop Vite dev servers (often run on 5173)
VITE_PIDS=$(lsof -ti :5173 2>/dev/null || true)
safe_kill "$VITE_PIDS" "Vite dev servers (port 5173)"

# Stop Node.js processes that might be dev servers
NODE_DEV_PIDS=$(pgrep -f "vite|webpack-dev-server|next.*dev|nuxt.*dev" 2>/dev/null || true)
safe_kill "$NODE_DEV_PIDS" "frontend dev servers"

# Stop LocalStack
echo "🐳 Stopping LocalStack..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || echo "LocalStack not running"

# Clean up any orphaned processes
echo "🔍 Checking for orphaned processes..."
ORPHANED=$(pgrep -f "node.*packages.*(frontend|backend)" 2>/dev/null || true)
safe_kill "$ORPHANED" "orphaned development processes"

echo "✨ Development environment cleanup complete!"
echo ""
echo "🚀 To start fresh:"
echo "   LocalStack mode: pnpm dev:localstack"
echo "   Mock mode:       pnpm dev:mocks"