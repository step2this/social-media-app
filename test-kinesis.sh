#!/bin/bash

# Test Kinesis integration
echo "Testing Kinesis event publishing..."

# Generate unique email
EMAIL="kinesis-test-$(date +%s)@test.com"
echo "Registering user: $EMAIL"

# Register user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"TestPass123!\",\"fullName\":\"Kinesis Test User\",\"username\":\"kinesisuser$(date +%s)\"}")

# Extract token
TOKEN=$(echo $REGISTER_RESPONSE | python3 -c "import json,sys; print(json.load(sys.stdin).get('accessToken', 'NO_TOKEN'))")

if [ "$TOKEN" = "NO_TOKEN" ]; then
    echo "Failed to register user:"
    echo $REGISTER_RESPONSE | python3 -m json.tool
    exit 1
fi

echo "Token obtained: ${TOKEN:0:20}..."

# Create a post
echo "Creating post..."
POST_RESPONSE=$(curl -s -X POST http://localhost:3001/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"caption":"Kinesis test post","fileType":"image/jpeg"}')

# Extract post ID
POST_ID=$(echo $POST_RESPONSE | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('post', {}).get('id', 'NO_POST'))")

if [ "$POST_ID" = "NO_POST" ]; then
    echo "Failed to create post:"
    echo $POST_RESPONSE | python3 -m json.tool
    exit 1
fi

echo "Post created: $POST_ID"

# Read from Kinesis stream
echo "Checking Kinesis stream for events..."
aws kinesis get-shard-iterator \
  --stream-name feed-events-local \
  --shard-id shardId-000000000000 \
  --shard-iterator-type TRIM_HORIZON \
  --endpoint-url http://localhost:4566 \
  --output json | python3 -c "
import json, sys, subprocess

data = json.load(sys.stdin)
iterator = data.get('ShardIterator')

if iterator:
    # Get records
    result = subprocess.run([
        'aws', 'kinesis', 'get-records',
        '--shard-iterator', iterator,
        '--endpoint-url', 'http://localhost:4566'
    ], capture_output=True, text=True)

    records_data = json.loads(result.stdout)
    records = records_data.get('Records', [])

    print(f'Found {len(records)} records in stream')

    for record in records[-5:]:  # Show last 5 records
        import base64
        raw_data = base64.b64decode(record['Data'])
        event_data = json.loads(raw_data)
        if event_data.get('postId') == '$POST_ID':
            print(f\"✅ Found event for post {event_data['postId']}: {event_data['eventType']}\")
            print(json.dumps(event_data, indent=2))
"

echo "Test complete!"