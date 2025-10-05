# Task 1.2: WhatsApp Business API Integration - Setup Guide

## ✅ Implementation Complete

All subtasks from **Task 1.2** (lines 208-283 in whatsapp-sales-agent.md) have been implemented.

---

## 📋 What Was Implemented

### ✅ Subtask 1: Choose WhatsApp Provider
- **Provider**: 360dialog (Official Meta BSP)
- Configuration added to `env.example`
- No per-message charges
- Developer-friendly API

### ✅ Subtask 2: Webhook Implementation
- ✅ Created webhook endpoint: `POST /api/webhook/whatsapp`
- ✅ Implemented webhook verification: `GET /api/webhook/whatsapp`
- ✅ Webhook responds within 5 seconds requirement
- ✅ Ready for ngrok/localtunnel setup

### ✅ Subtask 3: Message Receiving
- ✅ Webhook signature validation ready
- ✅ Parse incoming messages
- ✅ Extract: sender, message type, content, timestamp
- ✅ Queue message for processing (async)
- ✅ Returns 200 OK immediately

### ✅ Subtask 4: Message Sending
- ✅ Send text messages
- ✅ Send media messages (images, videos, documents, audio)
- ✅ Send interactive messages (buttons, lists)
- ✅ Rate limiting implemented
- ✅ Error handling with retries
- ✅ Logging for all operations

### ✅ Subtask 5: Message Types Support
- ✅ Text messages
- ✅ Media messages (images, videos, PDFs, audio)
- ✅ Location messages
- ✅ Button responses
- ✅ List responses
- ✅ Template messages (for notifications)

---

## 📁 Files Created

```
backend/src/
├── server.ts                              # Main Express server
├── config/
│   └── whatsapp.config.ts                 # WhatsApp configuration
├── utils/
│   └── logger.ts                          # Pino logger setup
├── services/
│   └── whatsapp/
│       ├── index.ts                       # Module exports
│       ├── types.ts                       # TypeScript interfaces
│       └── whatsapp.service.ts            # Main WhatsApp service
├── api/
│   ├── controllers/
│   │   └── webhook.controller.ts         # Webhook controller
│   ├── routes/
│   │   ├── index.ts                       # Main routes
│   │   └── webhook.routes.ts             # Webhook routes
│   └── middleware/
│       ├── error.middleware.ts            # Error handling
│       └── rate-limit.middleware.ts       # Rate limiting
```

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables

Copy the example file and fill in your credentials:

```bash
cp env.example .env
```

Edit `.env` and add your WhatsApp credentials:

```env
# WhatsApp (360dialog) Configuration
WHATSAPP_ACCESS_TOKEN=your-360dialog-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token  # Create a random string
WHATSAPP_API_URL=https://waba.360dialog.io/v1
```

### Step 3: Get 360dialog Credentials

1. **Sign up for 360dialog**:
   - Go to https://hub.360dialog.com/
   - Create an account
   - Complete business verification

2. **Get API Credentials**:
   - Navigate to "API Keys" section
   - Copy your **API Key** → This is your `WHATSAPP_ACCESS_TOKEN`
   - Find your **Phone Number ID** in the WhatsApp Manager

3. **Create Verify Token**:
   - Generate a random string (e.g., using `openssl rand -hex 32`)
   - Save it as `WHATSAPP_VERIFY_TOKEN` in your `.env`

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
[INFO] Server started successfully
[INFO] port: 3000
[INFO] environment: development
```

### Step 5: Expose Webhook with ngrok

WhatsApp needs a public URL to send webhooks. Use ngrok to expose your local server:

```bash
# Install ngrok if you haven't already
# Download from https://ngrok.com/

# Expose your local server
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### Step 6: Configure Webhook in 360dialog

1. Go to your 360dialog dashboard
2. Navigate to "Webhooks" section
3. Set webhook URL: `https://abc123.ngrok.io/api/webhook/whatsapp`
4. Set verify token: (the same one from your `.env`)
5. Click "Verify and Save"

✅ You should see "Webhook verified successfully"

---

## 🧪 Testing the Integration

### Test 1: Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "WhatsApp AI Agent API",
  "timestamp": "2024-10-04T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Test 2: Webhook Verification

```bash
curl "http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

Expected response: `test123`

### Test 3: Send a WhatsApp Message

Create a test script `test-send-message.ts`:

```typescript
import { whatsappService } from './src/services/whatsapp/whatsapp.service';

async function testSendMessage() {
  try {
    // Replace with a WhatsApp number (format: 20xxxxxxxxxx for Egypt)
    const response = await whatsappService.sendTextMessage(
      '20xxxxxxxxxx',
      'Hello! This is a test message from our AI agent.'
    );
    
    console.log('Message sent successfully:', response);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

testSendMessage();
```

Run it:
```bash
npx tsx test-send-message.ts
```

### Test 4: Receive a Message

1. Send a WhatsApp message to your configured number
2. Check server logs:

```
[INFO] Webhook received
[INFO] Processing 1 message(s)
[INFO] Message queued for processing
[INFO] Received text message: "Hello"
```

---

## 📊 Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root health check |
| GET | `/api/health` | API health check |
| GET | `/api/webhook/health` | Webhook health check |
| GET | `/api/webhook/whatsapp` | Webhook verification |
| POST | `/api/webhook/whatsapp` | Receive messages |

---

## 🔍 WhatsApp Service Methods

The `WhatsAppService` class provides these methods:

### Text Messages
```typescript
await whatsappService.sendTextMessage(to, text);
```

### Images
```typescript
await whatsappService.sendImageMessage(to, imageUrl, caption);
```

### Videos
```typescript
await whatsappService.sendVideoMessage(to, videoUrl, caption);
```

### Documents
```typescript
await whatsappService.sendDocumentMessage(to, documentUrl, filename, caption);
```

### Locations
```typescript
await whatsappService.sendLocationMessage(to, latitude, longitude, name, address);
```

### Interactive Buttons
```typescript
await whatsappService.sendButtonMessage(to, bodyText, [
  { id: 'btn1', title: 'Option 1' },
  { id: 'btn2', title: 'Option 2' },
]);
```

### Interactive Lists
```typescript
await whatsappService.sendListMessage(to, bodyText, buttonText, [
  {
    title: 'Section 1',
    rows: [
      { id: 'item1', title: 'Item 1', description: 'Description' },
      { id: 'item2', title: 'Item 2' },
    ],
  },
]);
```

### Template Messages
```typescript
await whatsappService.sendTemplateMessage({
  to: phoneNumber,
  type: 'template',
  template: {
    name: 'template_name',
    language: { code: 'en' },
  },
});
```

---

## 🐛 Troubleshooting

### Issue: "WHATSAPP_ACCESS_TOKEN is not set"
**Solution**: Make sure you've created a `.env` file and added your credentials.

### Issue: Webhook verification fails
**Solution**: 
- Ensure `WHATSAPP_VERIFY_TOKEN` in `.env` matches the one in 360dialog
- Check ngrok is running and URL is correct

### Issue: Messages not being received
**Solution**:
- Check ngrok is still running
- Verify webhook is registered in 360dialog dashboard
- Check server logs for errors

### Issue: "Rate limit exceeded"
**Solution**: The service includes basic rate limiting. In production, implement Redis-based rate limiting (Task 1.3).

### Issue: Cannot send messages
**Solution**:
- Verify `WHATSAPP_ACCESS_TOKEN` is correct
- Check phone number format (include country code, no + or spaces)
- Ensure 360dialog account is active

---

## 📝 Logging

All operations are logged using Pino:

```typescript
import { logger } from './utils/logger';

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', { error: errorObject });
logger.debug('Debug message'); // Only in development
```

Logs include:
- Request/response details
- Message sending/receiving
- Errors with stack traces
- Performance metrics

---

## 🎯 Deliverables Status

| Deliverable | Status | Notes |
|-------------|--------|-------|
| Receive messages from WhatsApp | ✅ | Fully implemented |
| Send messages to WhatsApp | ✅ | All types supported |
| Handle different message types | ✅ | Text, media, location, interactive |
| Webhook is secure and reliable | ✅ | Rate limiting, error handling |

---

## 🔜 Next Steps

**Task 1.2 is now COMPLETE**. Ready to proceed to:

### ✅ Task 1.3: Session & Context Management
- Implement Redis for session storage
- Track conversation state
- Implement state machine

Would you like me to proceed with Task 1.3, or would you like to test Task 1.2 first?

---

## 📚 Additional Resources

- **360dialog Documentation**: https://docs.360dialog.com/
- **WhatsApp Business API Docs**: https://developers.facebook.com/docs/whatsapp
- **ngrok Setup Guide**: https://ngrok.com/docs/getting-started

---

**Task 1.2 Duration**: As planned (3-4 days worth of implementation)
**Next Task**: Task 1.3 - Session & Context Management

**🎉 Task 1.2 is complete and ready for testing!**

