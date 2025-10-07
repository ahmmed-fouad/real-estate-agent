# 🚀 Ngrok Quick Start Guide

Get your WhatsApp AI agent up and running with ngrok in 5 minutes!

## Prerequisites Check

Before starting, ensure you have:
- ✅ Backend `.env` file configured
- ✅ OpenAI API key with credits
- ✅ Twilio WhatsApp credentials
- ✅ Node.js and npm installed

## Quick Setup (3 Steps)

### Step 1: Install Ngrok

Choose one option:

**Option A: Download** (Recommended)
```powershell
# Download from: https://ngrok.com/download
# Extract and add to PATH
```

**Option B: Chocolatey**
```powershell
choco install ngrok
```

**Option C: NPM**
```powershell
npm install -g ngrok
```

Verify installation:
```powershell
ngrok version
```

### Step 2: Authenticate Ngrok

1. Sign up at https://ngrok.com/ (free)
2. Get your auth token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Step 3: Start Everything

**Option A: Automated Script** (Easy!)
```powershell
cd D:\programming\projects\real-estate-agent\backend
.\scripts\start-with-ngrok.ps1
```

This will:
- ✅ Start backend server
- ✅ Start ngrok tunnel
- ✅ Show your public URL

**Option B: Manual** (Two terminals)

Terminal 1 - Backend:
```powershell
cd D:\programming\projects\real-estate-agent\backend
npm run dev
```

Terminal 2 - Ngrok:
```powershell
ngrok http 3000
```

## Configure WhatsApp Webhook

1. **Copy your ngrok URL** from the ngrok terminal:
   ```
   Forwarding: https://abcd-1234-5678.ngrok-free.app
   ```

2. **Update Twilio webhook:**
   - Go to: https://console.twilio.com/
   - Navigate to: **Messaging** → **WhatsApp Sender**
   - Set Webhook URL:
     ```
     https://YOUR-NGROK-URL.ngrok-free.app/webhook/whatsapp
     ```
   - Method: `POST`
   - Save changes

## Test It!

### 1. Health Check
```powershell
curl https://YOUR-NGROK-URL.ngrok-free.app/
```
Expected: `{"status":"ok"}`

### 2. Send WhatsApp Message
- Open WhatsApp on your phone
- Send a message to your Twilio WhatsApp number
- Example: "Hello" or "Show me properties"
- You should get an AI response!

### 3. Monitor Requests
- Open: http://127.0.0.1:4040
- See all incoming requests in real-time
- Debug request/response payloads

## Common Issues

### "ngrok not found"
→ Install ngrok (see Step 1)

### "Backend not running"
→ Check backend terminal for errors
→ Ensure port 3000 is free: `netstat -ano | findstr :3000`

### "Webhook verification failed"
→ Check `WHATSAPP_VERIFY_TOKEN` in `.env`
→ Ensure ngrok URL is correct in Twilio

### "No response from AI"
→ Check OpenAI API key and credits
→ View backend logs for errors

## Important Notes

⚠️ **Ngrok free tier URLs change on restart**
- You'll need to update the webhook URL each time you restart ngrok
- Consider a paid plan for static URLs in production

🔒 **Keep terminals open**
- Both backend and ngrok terminals must stay running
- Close them to stop the services

## Success Checklist

After setup, verify:
- ✅ Backend running on http://localhost:3000
- ✅ Ngrok tunnel active (check http://127.0.0.1:4040)
- ✅ Webhook configured in Twilio
- ✅ Test message received and responded to

## Next Steps

Now you can:
1. Test property queries: "Show me apartments in New Cairo"
2. Test document queries: "What payment plans do you offer?"
3. Test scheduling: "Schedule a viewing for tomorrow"
4. Monitor conversations in admin portal

---

**Need help?** Check `docs/NGROK_SETUP.md` for detailed troubleshooting.

**Production?** See deployment guides for Railway, Render, or AWS.

🎉 **You're all set!** Start chatting with your AI sales agent via WhatsApp!

