# 📱 WhatsApp Integration Setup Guide

A quick guide to get the real estate AI agent running on WhatsApp.

---

## 📋 **Prerequisites**

Before you start, make sure you have:
- ✅ Node.js installed (v18 or higher)
- ✅ OpenAI API key with credits
- ✅ Supabase account and database
- ✅ Twilio account (for WhatsApp)
- ✅ Ngrok account (for webhook tunneling)

---

## 🚀 **Step 1: Install Dependencies**

```bash
# Install backend dependencies
cd backend
npm install

# Install ngrok globally (if not already installed)
npm install -g ngrok
```

---

## 🔑 **Step 2: Configure Environment Variables**

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env  # If .env.example exists, otherwise create new .env
```

Add the following variables to `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Twilio sandbox number

# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (if using Upstash or cloud Redis)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true
```

---

## 🗄️ **Step 3: Setup Database**

### 3.1 Run Migrations
```bash
cd backend
npx prisma migrate deploy
# OR if you have issues:
npx prisma db push
```

### 3.2 Generate Prisma Client
```bash
npx prisma generate
```

### 3.3 Seed Test Data (Properties & Documents)
```bash
# Seed properties
npx ts-node prisma/seeds/properties.seed.ts

# Seed documents
npx ts-node prisma/seeds/documents.seed.ts
```

### 3.4 Setup Vector Search Functions in Supabase

Go to your Supabase SQL Editor and run:

**For Properties:**
```sql
-- File: backend/prisma/migrations/20250105_property_vector_search_function.sql
-- Copy and run the entire SQL file in Supabase SQL Editor
```

**For Documents:**
```sql
-- File: backend/prisma/migrations/20250106_document_vector_search_function.sql
-- Copy and run the entire SQL file in Supabase SQL Editor
```

---

## 🌐 **Step 4: Setup Ngrok**

### 4.1 Authenticate Ngrok
```bash
# Sign up at https://ngrok.com and get your auth token
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN
```

### 4.2 Start Ngrok Tunnel
```bash
# In a NEW terminal window
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy the `https://` URL** - you'll need it for Twilio!

---

## 📞 **Step 5: Configure Twilio Webhook**

### 5.1 Go to Twilio Console
1. Visit https://console.twilio.com
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Or go to your WhatsApp Sandbox settings

### 5.2 Set Webhook URL
In the **"When a message comes in"** field, enter:
```
https://YOUR-NGROK-URL.ngrok-free.app/api/webhook/whatsapp
```

**Example:**
```
https://abc123.ngrok-free.app/api/webhook/whatsapp
```

**Important:** 
- Use `/api/webhook/whatsapp` (not just `/webhook/whatsapp`)
- Make sure it's `https://` (not `http://`)

### 5.3 Save Configuration
Click **Save** in Twilio console.

---

## ▶️ **Step 6: Start the Backend Server**

```bash
cd backend
npm run dev
```

You should see:
```
[INFO] Server started successfully
[INFO] Available endpoints
[INFO] Development mode: Use ngrok or similar tool to expose webhook endpoint to WhatsApp
```

---

## 📱 **Step 7: Test WhatsApp Integration**

### 7.1 Join Twilio Sandbox
1. Send the join code to the Twilio WhatsApp number
2. Usually: `join <your-sandbox-name>` to `+1 415 523 8886`

### 7.2 Send Test Message
Send this message to the Twilio WhatsApp number:
```
مرحبا
```
or
```
Hello
```

### 7.3 Expected AI Response
The AI should respond with:
```
مرحباً! 😊 أنا مساعدك العقاري الذكي، هنا عشان أساعدك تلاقي العقار المثالي ليك.
ممكن أعرف اسمك؟ وإيه نوع العقار اللي بتدور عليه؟
```

---

## ✅ **Step 8: Verify Everything Works**

### Check Terminal Logs
You should see:
```
[INFO] Webhook message received
[INFO] Processing message from queue
[INFO] === PROPERTIES FOUND: 6 ===
[INFO] AI response generated
[INFO] Message sent successfully via Twilio
```

### Test Full Conversation Flow
1. **Message 1:** `مرحبا` → AI asks for name and property type
2. **Message 2:** `اسمي أحمد، أريد شقة` → AI asks for location
3. **Message 3:** `القاهرة الجديدة` → AI asks for budget
4. **Message 4:** `حوالي 4 مليون` → AI shows 2-3 properties with details

---

## 🐛 **Troubleshooting**

### Issue: No response from AI
**Solution:**
1. Check if backend server is running (`npm run dev`)
2. Check if ngrok tunnel is active
3. Verify Twilio webhook URL is correct
4. Check terminal logs for errors

### Issue: "No properties found"
**Solution:**
1. Verify properties are seeded: `npx ts-node prisma/seeds/properties.seed.ts`
2. Check vector search functions are created in Supabase
3. Verify OpenAI API key has credits

### Issue: Webhook 404 error
**Solution:**
- Webhook URL should be: `https://YOUR-NGROK-URL/api/webhook/whatsapp`
- Note the `/api` prefix!

### Issue: OpenAI quota exceeded
**Solution:**
1. Go to https://platform.openai.com/account/billing
2. Add credits ($5-10 should be enough for testing)
3. Update `OPENAI_API_KEY` in `.env` if needed

### Issue: Conversation stuck (escalated)
**Solution:**
- Wait 1 minute and send another message
- AI will automatically recover from escalation

---

## 📊 **Available Test Data**

After seeding, you'll have:

### Properties (6 total):
1. **Marassi Compound** - North Coast (3BR apartment, 4.5M EGP)
2. **Palm Hills October** (4BR villa, 8M EGP)
3. **New Capital - The Waterway** (3BR apartment, 5.4M EGP)
4. **Eastown Residences** - New Cairo (2BR apartment, 3.6M EGP)
5. **Mountain View iCity** (3BR townhouse, 6.5M EGP)
6. **Telal El Sokhna** (2BR chalet, 2.5M EGP)

### Documents (6 total):
- Payment Plans Guide
- Property Buying Process
- Company Information
- FAQs
- Investment Guide
- After-Sales Policy

---

## 🔄 **Daily Development Workflow**

### Starting Your Day:
```bash
# Terminal 1: Start ngrok
ngrok http 3000

# Terminal 2: Start backend
cd backend
npm run dev
```

### Update Twilio Webhook:
- Ngrok URL changes each time you restart it
- Update Twilio webhook with new ngrok URL
- Or use `ngrok http 3000 --domain=your-static-domain` (paid feature)

---

## 📝 **Important Notes**

1. **Ngrok Free Tier:** URL changes on every restart. Update Twilio webhook each time.
2. **OpenAI Costs:** Each message costs ~$0.01-0.05 depending on context length.
3. **Twilio Sandbox:** Limited to pre-approved numbers. For production, get a Twilio WhatsApp Business Account.
4. **Redis:** Required for session management. Use Upstash (free tier) or local Redis.
5. **Escalation Timeout:** Currently set to 1 minute for testing. Change to 10 minutes for production.

---

## 🎯 **Production Deployment**

For production deployment:

1. **Replace Ngrok** with a proper domain:
   - Deploy backend to Heroku, Railway, or AWS
   - Use your domain: `https://api.yourdomain.com/api/webhook/whatsapp`

2. **Upgrade Twilio** to WhatsApp Business Account:
   - Get approved by Facebook/Meta
   - Use your own WhatsApp Business number

3. **Update Environment:**
   - Set `NODE_ENV=production`
   - Use production Redis (not local)
   - Enable proper logging and monitoring

4. **Security:**
   - Enable Twilio signature verification
   - Use environment-specific API keys
   - Set up rate limiting

---

## 📚 **Additional Resources**

- **Backend Documentation:** `backend/README.md`
- **Improvements Summary:** `backend/IMPROVEMENTS_SUMMARY.md`
- **Quick Test Guide:** `backend/QUICK_TEST_GUIDE.md`
- **Ngrok Setup:** `backend/docs/NGROK_SETUP.md`
- **Documents Setup:** `backend/docs/DOCUMENTS_SETUP.md`

---

## 🆘 **Need Help?**

If you encounter issues:
1. Check terminal logs for error messages
2. Review the troubleshooting section above
3. Check `backend/IMPROVEMENTS_SUMMARY.md` for recent changes
4. Verify all environment variables are set correctly

---

**🎉 You're all set! The AI is now ready to help customers find their dream properties on WhatsApp!**

*Last Updated: January 8, 2025*
