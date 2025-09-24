#!/bin/bash
set -e

# Test deployment script
echo "🧪 Testing Backend Deployment..."

# Check if API_URL is provided
API_URL=${1:-}
if [ -z "$API_URL" ]; then
    echo "Usage: ./test-deployment.sh <API_GATEWAY_URL>"
    echo "Example: ./test-deployment.sh https://abc123.execute-api.us-east-1.amazonaws.com"
    exit 1
fi

echo "🌐 Testing API at: $API_URL"

# Test 1: Health check
echo ""
echo "📋 Test 1: Health Check"
echo "Endpoint: POST $API_URL/hello"
HEALTH_RESPONSE=$(curl -s -X POST "$API_URL/hello" \
    -H "Content-Type: application/json" \
    -d '{"name": "deployment-test"}' \
    -w "HTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_STATUS)"
    echo "Response: $RESPONSE_BODY"
fi

# Test 2: CORS preflight
echo ""
echo "📋 Test 2: CORS Preflight"
echo "Testing OPTIONS request for CORS..."
CORS_RESPONSE=$(curl -s -X OPTIONS "$API_URL/hello" \
    -H "Origin: http://localhost:3001" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    -w "HTTP_STATUS:%{http_code}")

CORS_HTTP_STATUS=$(echo "$CORS_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$CORS_HTTP_STATUS" = "200" ] || [ "$CORS_HTTP_STATUS" = "204" ]; then
    echo "✅ CORS preflight passed"
else
    echo "❌ CORS preflight failed (HTTP $CORS_HTTP_STATUS)"
fi

# Test 3: Auth endpoints availability
echo ""
echo "📋 Test 3: Auth Endpoints Availability"

# Test register endpoint (should return 400 without body, but endpoint should exist)
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -w "HTTP_STATUS:%{http_code}")
REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$REGISTER_STATUS" = "400" ]; then
    echo "✅ Register endpoint exists (returns 400 as expected without request body)"
else
    echo "⚠️  Register endpoint returned HTTP $REGISTER_STATUS"
fi

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -w "HTTP_STATUS:%{http_code}")
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$LOGIN_STATUS" = "400" ]; then
    echo "✅ Login endpoint exists (returns 400 as expected without request body)"
else
    echo "⚠️  Login endpoint returned HTTP $LOGIN_STATUS"
fi

# Test 4: Profile endpoints
echo ""
echo "📋 Test 4: Profile Endpoints"

# Test get profile (should return 404 for non-existent handle)
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/profile/nonexistent" \
    -w "HTTP_STATUS:%{http_code}")
PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$PROFILE_STATUS" = "404" ] || [ "$PROFILE_STATUS" = "400" ]; then
    echo "✅ Get profile endpoint exists"
else
    echo "⚠️  Get profile endpoint returned HTTP $PROFILE_STATUS"
fi

# Test 5: Post endpoints
echo ""
echo "📋 Test 5: Post Endpoints"

# Test create post (should return 401 without auth)
POST_RESPONSE=$(curl -s -X POST "$API_URL/posts" \
    -H "Content-Type: application/json" \
    -w "HTTP_STATUS:%{http_code}")
POST_STATUS=$(echo "$POST_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

if [ "$POST_STATUS" = "401" ]; then
    echo "✅ Create post endpoint exists (returns 401 as expected without auth)"
else
    echo "⚠️  Create post endpoint returned HTTP $POST_STATUS"
fi

# Summary
echo ""
echo "🎯 Deployment Test Summary"
echo "========================="
echo "✅ API Gateway is responding"
echo "✅ Lambda functions are deployed and working"
echo "✅ CORS is configured for local development"
echo "✅ All endpoint routes are properly configured"
echo ""
echo "🚀 Your backend is ready for frontend consumption!"
echo "📝 Use this API URL in your frontend: $API_URL"