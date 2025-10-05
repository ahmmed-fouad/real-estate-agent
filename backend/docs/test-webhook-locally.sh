#!/bin/bash

# Test WhatsApp Webhook Locally (No ngrok needed!)
# This script simulates WhatsApp sending messages to your local backend

BASE_URL="http://localhost:3000"
WEBHOOK_ENDPOINT="${BASE_URL}/webhooks/whatsapp"

echo "=== Testing WhatsApp Webhook Flow Locally ==="
echo ""

# Test 1: Webhook Verification (GET request)
echo "1. Testing Webhook Verification..."
curl -X GET "${WEBHOOK_ENDPOINT}?hub.mode=subscribe&hub.verify_token=your_verify_token_here&hub.challenge=test_challenge_123"
echo -e "\n"

# Test 2: Simulate incoming text message (POST request)
echo "2. Simulating incoming text message..."
curl -X POST "${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "201234567890",
            "id": "wamid.test123",
            "timestamp": "1234567890",
            "type": "text",
            "text": {
              "body": "I want a 3-bedroom apartment in New Cairo under 3 million EGP"
            }
          }]
        }
      }]
    }]
  }'
echo -e "\n"

# Test 3: Simulate property inquiry with Arabic
echo "3. Simulating Arabic message..."
curl -X POST "${WEBHOOK_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "201234567890",
            "id": "wamid.test124",
            "timestamp": "1234567891",
            "type": "text",
            "text": {
              "body": "عايز شقة في التجمع الخامس"
            }
          }]
        }
      }]
    }]
  }'
echo -e "\n"

# Test 4: Check conversation was created
echo "4. Checking conversations via API..."
echo "   (You need to login first and use the JWT token)"
echo "   Example: curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' ${BASE_URL}/api/conversations"
echo ""

echo "=== Testing Complete ==="
echo ""
echo "To monitor the backend logs, check your terminal where the server is running."
echo "You can also check the database to verify conversations and messages were created."
