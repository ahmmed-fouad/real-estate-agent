# WhatsApp AI Agent - Quick Start Guide

## 🚀 Complete Setup in 5 Minutes

This guide will get your WhatsApp AI Agent up and running with test data.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- OpenAI API key
- Supabase account (free tier works)
- Redis instance (Upstash free tier or local)

---

## Step 1: Environment Variables

1. Copy the environment template:

   ```bash
   cp env.template .env
   ```

2. Fill in these **REQUIRED** values in `.env`:

   ```bash
   # OpenAI (REQUIRED)
   OPENAI_API_KEY=sk-your-key-here

   # Database (REQUIRED)
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key

   # Redis (REQUIRED)
   REDIS_URL=rediss://...

   # JWT (REQUIRED)
   JWT_SECRET=your-random-32-char-secret

   # WhatsApp (Optional for testing)
   TWILIO_ACCOUNT_SID=your-sid
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   WHATSAPP_VERIFY_TOKEN=any-random-string
   ```

> **Tip**: Generate JWT secret with: `openssl rand -base64 32`

---

## Step 2: One-Command Setup

Run the complete setup script:

```bash
npm run setup-all
```

This will:

1. ✅ Run database migrations
2. ✅ Create an agent account (email: agent@test.com, password: Test123!)
3. ✅ Seed 21+ properties (including New Zayed/Sheikh Zayed)
4. ✅ Seed knowledge base documents
5. ✅ Generate embeddings for all properties

**Expected time**: 2-3 minutes (depending on OpenAI API speed)

---

## Step 3: Verify Setup

Check that everything is properly configured:

```bash
npm run verify-setup
```

You should see:

```
✅ Agents: 1 agent(s) found
✅ Properties: 21 properties found
   - New Zayed properties: 8
   - Properties with embeddings: 21
✅ Documents: 6 documents found
```

---

## Step 4: Start the Server

```bash
npm run dev
```

Server will start on http://localhost:3000

Check:

- API: http://localhost:3000
- Swagger docs: http://localhost:3000/api-docs

---

## Step 5: Start Admin Portal

In a **new terminal**:

```bash
cd ../admin-portal
npm install  # First time only
npm run dev
```

Portal will start on http://localhost:5173

**Login credentials**:

- Email: `agent@test.com`
- Password: `Test123!`

---

## Step 6: Test with WhatsApp (Optional)

### Local Testing with ngrok:

1. **Install ngrok**: https://ngrok.com/download

2. **Start ngrok**:

   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Configure Twilio webhook**:
   - Go to Twilio Console → Messaging → WhatsApp
   - Set webhook URL: `https://abc123.ngrok.io/api/webhook/whatsapp`
   - Set verify token: (value from your `.env` file)

5. **Send test message** to your Twilio WhatsApp number:

   ```
   I want a 2 bedroom apartment in New Zayed
   ```

6. **Expected response**:
   The AI should respond with multiple property options including:
   - Aeon Towers - New Zayed
   - Green Square - New Zayed
   - The Axis - New Zayed
   - Sky Condos - New Zayed

---

## 📊 What Data Was Seeded?

### Properties (21 total):

- **6 existing** properties (North Coast, 6th October, New Cairo, etc.)
- **15 new** properties in New Zayed and Sheikh Zayed:
  - 8 properties in **New Zayed**
  - 7 properties in **Sheikh Zayed**
  - Price range: 2.4M - 12M EGP
  - Various types: apartments, villas, townhouses, penthouses
  - 1-4 bedrooms

### Documents (6 total):

- Company overview
- Payment plans guide
- FAQ document
- Contract terms
- Property brochures
- Investment guide

---

## 🧪 Testing the Agent

### Test Queries to Try:

1. **Basic search**:
   - "I want a 2 bedroom apartment in New Zayed"
   - "Show me properties in Sheikh Zayed"

2. **Price-based**:
   - "2 bedroom apartment under 3 million in New Zayed"
   - "What's available for 4 million EGP?"

3. **Feature-based**:
   - "I need an apartment with swimming pool"
   - "Properties with smart home features"

4. **General questions**:
   - "What payment plans do you offer?"
   - "Tell me about your company"
   - "How does the buying process work?"

---

## 🛠️ Useful Commands

```bash
# Create a new agent
npm run create-agent [email] [password] [name] [phone]

# Reseed properties (if needed)
npm run seed-properties

# Reseed documents
npm run seed-documents

# Verify setup anytime
npm run verify-setup

# View database
npm run db:studio

# Check API docs
# Visit: http://localhost:3000/api-docs
```

---

## 🔧 Troubleshooting

### "No properties found" in AI responses

**Check**:

```bash
npm run verify-setup
```

**Fix**:

- Ensure OPENAI_API_KEY is valid
- Reseed properties: `npm run seed-properties`
- Check embeddings were generated (logs should show "Generating embedding...")

### Database connection errors

**Check**:

- DATABASE_URL is correct
- Supabase project is not paused (free tier)
- Run migrations: `npm run migrate:deploy`

### Redis connection errors

**Check**:

- REDIS_URL is correct and accessible
- For Upstash: URL should start with `rediss://`
- For local: `redis://localhost:6379`

### Agent can't login to portal

**Check**:

- JWT_SECRET is set in `.env`
- Backend server is running
- Try creating new agent: `npm run create-agent`

---

## 📚 Next Steps

1. **Customize Properties**: Add your real property data via:
   - Admin portal bulk upload (CSV/Excel)
   - API endpoints
   - Direct database insertion

2. **Configure WhatsApp**: Set up production WhatsApp number

3. **Customize AI Responses**:
   - Edit prompts in `src/services/ai/prompt-builder.service.ts`
   - Edit templates in `src/services/ai/response-templates.ts`

4. **Add Documents**: Upload company-specific documents via portal

5. **Production Deployment**: See `docs/` for deployment guides

---

## 📖 Documentation

- **Complete setup guide**: `SETUP-CHECKLIST.md`
- **Project structure**: `docs/PROJECT_STRUCTURE.md`
- **RAG integration**: `RAG_INTEGRATION_SUMMARY.md`
- **API documentation**: http://localhost:3000/api-docs

---

## 🆘 Support

For issues:

1. Check `SETUP-CHECKLIST.md` for detailed troubleshooting
2. Review server logs for specific errors
3. Run `npm run verify-setup` to identify issues
4. Check Swagger API docs for endpoint testing

---

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] `npm run setup-all` completed successfully
- [ ] `npm run verify-setup` passes
- [ ] Server starts without errors
- [ ] Admin portal accessible and can login
- [ ] Properties visible in portal
- [ ] (Optional) WhatsApp responds to test messages

---

**Last Updated**: October 2025  
**Version**: 1.0

Happy coding! 🎉
