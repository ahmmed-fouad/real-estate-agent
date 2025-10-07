# Ngrok Setup Guide

This guide will help you expose your backend to the internet using ngrok for WhatsApp webhook testing.

## Prerequisites

- Backend server configured and ready to run
- Valid WhatsApp Business API credentials (Twilio)
- Ngrok account (free tier works fine)

## Step 1: Install Ngrok

### Option A: Download and Install
1. Go to https://ngrok.com/download
2. Download for Windows
3. Extract to a permanent location (e.g., `C:\ngrok\`)
4. Add to PATH or use full path

### Option B: Use Chocolatey (Windows)
```powershell
choco install ngrok
```

### Option C: Use npm (included in project)
```bash
npm install -g ngrok
```

## Step 2: Authenticate Ngrok

1. Sign up at https://ngrok.com/
2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Step 3: Start the Backend Server

In one terminal:
```powershell
cd D:\programming\projects\real-estate-agent\backend
npm run dev
```

Wait for: `Server started successfully` with `port: 3000`

## Step 4: Start Ngrok Tunnel

In a **second terminal**:
```powershell
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abcd-1234-5678.ngrok-free.app -> http://localhost:3000
```

**Important**: Copy the `https://....ngrok-free.app` URL

## Step 5: Configure WhatsApp Webhook

### For Twilio WhatsApp
1. Go to https://console.twilio.com/
2. Navigate to: **Messaging** → **Settings** → **WhatsApp Sender**
3. Find your WhatsApp number
4. Set Webhook URL to: `https://YOUR-NGROK-URL.ngrok-free.app/webhook/whatsapp`
5. Set HTTP Method to: `POST`
6. Save

### Verify Webhook
The webhook verification endpoint is: `GET https://YOUR-NGROK-URL.ngrok-free.app/webhook/whatsapp`

Twilio will verify with these parameters:
- `hub.mode=subscribe`
- `hub.verify_token=YOUR_WHATSAPP_VERIFY_TOKEN` (from .env)
- `hub.challenge=RANDOM_STRING`

## Step 6: Test the Setup

### Test 1: Health Check
```powershell
curl https://YOUR-NGROK-URL.ngrok-free.app/
```

Expected: `{"status":"ok","service":"WhatsApp AI Sales Agent API"}`

### Test 2: Webhook Health
```powershell
curl https://YOUR-NGROK-URL.ngrok-free.app/webhook/health
```

Expected: `{"status":"ok","message":"Webhook endpoint is healthy"}`

### Test 3: Send WhatsApp Message
Send a message from your phone to the WhatsApp Business number. You should see:
- Message received in backend logs
- AI response sent back to your phone

## Monitoring

### Ngrok Web Interface
Open http://127.0.0.1:4040 in your browser to see:
- Live request logs
- Request/response details
- Replay requests for debugging

### Backend Logs
Watch backend terminal for:
```
INFO: Message received from WhatsApp
INFO: Processing message in queue
INFO: AI response generated
INFO: Message sent successfully
```

## Important Notes

### Free Tier Limitations
- Ngrok free tier URLs **change** on every restart
- Must update WhatsApp webhook URL when ngrok restarts
- Session expires after 2 hours (restart needed)

### Production Alternative
For production, use:
- Paid ngrok plan (static URLs)
- Deploy to cloud (Railway, Render, AWS, etc.)
- Use your own domain with SSL

### Keep Alive
Both terminals must stay open:
1. Backend server terminal
2. Ngrok tunnel terminal

## Troubleshooting

### Error: "Connection Refused"
- Ensure backend is running on port 3000
- Check if port is already in use: `netstat -ano | findstr :3000`

### Error: "Webhook Verification Failed"
- Verify `WHATSAPP_VERIFY_TOKEN` in `.env` matches Twilio settings
- Check ngrok URL is correct and accessible

### Error: "Tunnel Not Found"
- Restart ngrok
- Update webhook URL with new ngrok URL

### Messages Not Received
- Check ngrok web interface (http://127.0.0.1:4040) for incoming requests
- Verify WhatsApp webhook URL is correct
- Check backend logs for errors

## Environment Variables

Ensure these are set in `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_VERIFY_TOKEN=your_verify_token_here

# Database
DATABASE_URL=your_supabase_postgres_url

# Redis
REDIS_URL=your_redis_url

# OpenAI
OPENAI_API_KEY=your_openai_key

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
```

## Quick Reference Commands

```powershell
# Start backend
cd backend
npm run dev

# Start ngrok (in new terminal)
ngrok http 3000

# Test health
curl https://YOUR-NGROK-URL.ngrok-free.app/

# View logs
# Backend: Check terminal running npm run dev
# Ngrok: Visit http://127.0.0.1:4040
```

## Next Steps

After successful setup:
1. ✅ Backend running on port 3000
2. ✅ Ngrok tunnel active
3. ✅ WhatsApp webhook configured
4. ✅ Test message flow working

You're ready to test the full WhatsApp AI sales agent! 🎉

