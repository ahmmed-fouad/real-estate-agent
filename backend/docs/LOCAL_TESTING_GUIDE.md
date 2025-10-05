# Local Testing Guide - No ngrok Required!

## Overview

You can test the entire backend flow locally **without ngrok**. You only need ngrok when connecting to the actual WhatsApp Business API.

---

## Testing Options

### Option 1: Run E2E Tests (Recommended)

The project has comprehensive E2E tests that simulate the entire flow:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific conversation flow test
npx playwright test tests/e2e/conversation-flow.test.ts

# Run with UI to see what's happening
npx playwright test --ui
```

**What these tests cover:**

- ✅ Webhook message reception
- ✅ Message processing and AI response
- ✅ Conversation creation
- ✅ Lead scoring
- ✅ Agent portal interaction
- ✅ Scheduling flow
- ✅ Data upload

---

### Option 2: Manual Testing with curl

Use the provided test script:

```bash
# Make it executable
chmod +x test-webhook-locally.sh

# Run the test
./test-webhook-locally.sh
```

Or test individual endpoints:

#### 1. Test Webhook Verification (GET)

```bash
curl -X GET "http://localhost:3000/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=your_verify_token_here&hub.challenge=test_challenge_123"
```

Expected response: `test_challenge_123`

#### 2. Simulate Incoming Message (POST)

```bash
curl -X POST "http://localhost:3000/webhooks/whatsapp" \
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
```

Expected response: `{"success": true}`

#### 3. Check Conversation Created

```bash
# First, login to get JWT token
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-agent@example.com",
    "password": "your-password"
  }'

# Use the token to check conversations
curl -X GET "http://localhost:3000/api/conversations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Option 3: Use Postman/Insomnia

1. Import the Swagger/OpenAPI spec: `http://localhost:3000/api-docs`
2. Create requests for webhook endpoints
3. Simulate different message types

---

## Testing the Complete Flow

### Step 1: Start the Backend

```bash
cd backend
npm run dev
```

### Step 2: Verify Services are Running

```bash
# Check server health
curl http://localhost:3000/health

# Check webhook health
curl http://localhost:3000/webhooks/health
```

### Step 3: Create Test Agent and Properties

```bash
# Register an agent
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-agent@example.com",
    "password": "Test123!@#",
    "fullName": "Test Agent",
    "phoneNumber": "+201234567890",
    "companyName": "Test Real Estate"
  }'

# Login to get token
TOKEN=$(curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-agent@example.com",
    "password": "Test123!@#"
  }' | jq -r '.token')

# Add a test property
curl -X POST "http://localhost:3000/api/properties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "New Cairo Residence",
    "propertyType": "apartment",
    "city": "Cairo",
    "district": "New Cairo",
    "area": 150,
    "bedrooms": 3,
    "bathrooms": 2,
    "basePrice": 2500000,
    "currency": "EGP",
    "description": "Beautiful 3-bedroom apartment in New Cairo with modern amenities",
    "amenities": ["pool", "gym", "parking", "security"],
    "status": "available"
  }'
```

### Step 4: Simulate Customer Conversation

```bash
# Customer sends first message
curl -X POST "http://localhost:3000/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "201111111111",
            "id": "wamid.msg001",
            "timestamp": "'$(date +%s)'",
            "type": "text",
            "text": {
              "body": "Hi, I am looking for a 3-bedroom apartment in New Cairo"
            }
          }]
        }
      }]
    }]
  }'

# Wait a few seconds for processing...
sleep 5

# Check the conversation was created
curl -X GET "http://localhost:3000/api/conversations" \
  -H "Authorization: Bearer $TOKEN" | jq

# Get conversation details
CONV_ID=$(curl -X GET "http://localhost:3000/api/conversations" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.conversations[0].id')

curl -X GET "http://localhost:3000/api/conversations/$CONV_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Monitoring During Tests

### Watch Backend Logs

The backend logs will show:

- Webhook messages received
- Message processing
- AI responses generated
- Database operations

### Check Database

```bash
# Connect to your database
npx prisma studio

# Or use psql
psql $DATABASE_URL

# Check conversations
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 5;

# Check messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;
```

### Check Redis (Session Data)

```bash
# If using local Redis
redis-cli

# List all keys
KEYS *

# Check a session
GET session:201111111111
```

---

## When DO You Need ngrok?

You only need ngrok (or similar) when:

1. **Registering webhook with WhatsApp Business API**
   - WhatsApp needs a public HTTPS URL
   - During initial setup with 360dialog/Twilio

2. **Testing with real WhatsApp messages**
   - Sending actual messages from WhatsApp app
   - Testing with real phone numbers

3. **Demo/Presentation**
   - Showing live WhatsApp integration

### Setting up ngrok (when needed):

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Start ngrok tunnel
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io

# Register this URL with WhatsApp:
# Webhook URL: https://abc123.ngrok.io/webhooks/whatsapp
# Verify Token: (your WHATSAPP_VERIFY_TOKEN from .env)
```

---

## Troubleshooting

### Issue: Webhook returns 403

- Check your `WHATSAPP_VERIFY_TOKEN` in `.env`
- Ensure it matches what you're sending in the request

### Issue: Message not processed

- Check backend logs for errors
- Verify Redis is running: `redis-cli ping`
- Check database connection: `npx prisma db pull`
- Ensure message queue is working

### Issue: No AI response

- Check OpenAI API key is set: `echo $OPENAI_API_KEY`
- Check OpenAI API credits
- Look for errors in logs

### Issue: Properties not found

- Verify properties are added to database
- Check embeddings are generated
- Verify vector search is working

---

## Next Steps

After local testing is successful:

1. ✅ Run all E2E tests: `npm run test:e2e`
2. ✅ Run integration tests: `npm run test:integration`
3. ✅ Run unit tests: `npm run test:unit`
4. ✅ Test admin portal locally
5. ✅ Set up ngrok for WhatsApp integration
6. ✅ Register webhook with 360dialog
7. ✅ Test with real WhatsApp messages

---

## Summary

**For testing the backend flow:**

- ❌ ngrok is NOT needed
- ✅ Use E2E tests (recommended)
- ✅ Use curl/Postman to simulate webhooks
- ✅ Use the provided test script
- ✅ Monitor logs and database

**ngrok is only needed when:**

- Connecting to actual WhatsApp Business API
- Testing with real WhatsApp messages
- Initial webhook registration with 360dialog/Twilio
