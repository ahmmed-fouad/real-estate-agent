# Setup Checklist for WhatsApp AI Agent

## 1. Environment Variables (CRITICAL)

Copy `env.template` to `.env` and fill in these REQUIRED values:

### Must Configure (Agent Won't Work Without These):

- [ ] **OPENAI_API_KEY** - Get from https://platform.openai.com/api-keys
- [ ] **DATABASE_URL** - Your Supabase PostgreSQL connection string
- [ ] **SUPABASE_URL** - Your Supabase project URL
- [ ] **SUPABASE_ANON_KEY** - From Supabase project settings
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - From Supabase project settings (KEEP SECRET)
- [ ] **REDIS_URL** - Your Redis instance (Upstash or local Redis)
- [ ] **JWT_SECRET** - Random 32+ character string (generate with: `openssl rand -base64 32`)

### For WhatsApp Testing:

- [ ] **TWILIO_ACCOUNT_SID** - From Twilio console
- [ ] **TWILIO_AUTH_TOKEN** - From Twilio console
- [ ] **TWILIO_WHATSAPP_NUMBER** - Your Twilio WhatsApp number (format: whatsapp:+14155238886)
- [ ] **WHATSAPP_VERIFY_TOKEN** - Any random string for webhook verification

### Optional (Recommended):

- [ ] **SMTP_HOST** - For email notifications (e.g., smtp.gmail.com)
- [ ] **SMTP_USER** - Your email address
- [ ] **SMTP_PASSWORD** - App-specific password
- [ ] **OPENAI_MODEL** - Default: gpt-4 (can use gpt-5, o1-preview, etc.)

---

## 2. Database Setup

- [ ] **Run migrations**: `npm run migrate`
- [ ] **Verify pgvector extension** is enabled in Supabase dashboard:
  - Go to Database → Extensions
  - Enable `vector` extension
  - Create function: Check `prisma/migrations/20250104_vector_search_function.sql`

---

## 3. Create Agent Account

- [ ] **Run**: `npm run create-agent`
- [ ] **Save the login credentials** shown in the output
- [ ] Optional: Create with custom values:
  ```bash
  npm run create-agent youremail@example.com YourPassword123 "Your Name" +201234567890
  ```

---

## 4. Seed Test Data

### Properties (with embeddings):

- [ ] **Run**: `npm run seed-properties`
- [ ] **Wait** for embeddings to be generated (this may take 1-2 minutes)
- [ ] **Verify** success message shows properties seeded

### Knowledge Base Documents:

- [ ] **Run**: `npm run seed-documents`
- [ ] **Verify** documents are ingested successfully

---

## 5. Start Server

- [ ] **Run**: `npm run dev`
- [ ] **Verify** server starts without errors
- [ ] **Check**: http://localhost:3000 shows API status
- [ ] **Check**: http://localhost:3000/api-docs shows Swagger documentation

---

## 6. Test Agent Portal

- [ ] **Start admin portal**: `cd ../admin-portal && npm run dev`
- [ ] **Open**: http://localhost:5173
- [ ] **Login** with agent credentials from step 3
- [ ] **Verify**:
  - Dashboard shows statistics
  - Properties page shows seeded properties
  - Conversations page loads (empty initially)
  - Analytics page loads

---

## 7. Test WhatsApp (If Configured)

### Setup ngrok:

- [ ] **Install ngrok**: Download from https://ngrok.com
- [ ] **Run**: `ngrok http 3000`
- [ ] **Copy** the HTTPS URL (e.g., https://abc123.ngrok.io)
- [ ] **Configure webhook** in Twilio:
  - Webhook URL: `https://abc123.ngrok.io/api/webhook/whatsapp`
  - Verify token: Value from your WHATSAPP_VERIFY_TOKEN

### Test conversation:

- [ ] **Send test message** to your Twilio WhatsApp number
- [ ] **Try**: "I want a 2 bedroom apartment in New Zayed"
- [ ] **Verify** AI responds with property suggestions
- [ ] **Check** conversation appears in admin portal

---

## 8. Verify Complete Setup

- [ ] **Run verification**: `npm run verify-setup`
- [ ] **Ensure** all checks pass:
  - ✅ Agent exists
  - ✅ Properties with embeddings
  - ✅ Documents available
- [ ] **Test end-to-end**:
  - WhatsApp message → AI response
  - Conversation visible in portal
  - Lead scoring works
  - Property recommendations relevant

---

## Common Issues & Solutions

### "No properties found" response

**Cause**: Properties not seeded or embeddings missing

**Solution**:

```bash
# Check if properties exist
npm run verify-setup

# If no properties, seed them
npm run seed-properties

# Check logs for embedding generation errors
```

### "Connection refused" errors

**Cause**: Redis or Database not accessible

**Solution**:

- Check REDIS_URL is correct and instance is running
- Verify DATABASE_URL points to active database
- Ensure Supabase project is not paused (free tier)
- Test connection: `npx prisma db push`

### Agent can't login to portal

**Cause**: JWT or password issue

**Solution**:

- Verify JWT_SECRET is set in .env
- Try creating new agent: `npm run create-agent test@test.com Test123!`
- Check browser console for errors
- Verify backend is running (http://localhost:3000)

### Embeddings not generating

**Cause**: OpenAI API key invalid or rate limit

**Solution**:

- Verify OPENAI_API_KEY is correct
- Check OpenAI account has credits
- Check logs for specific error message
- Try with fewer properties first

### WhatsApp webhook not receiving messages

**Cause**: Webhook configuration or ngrok issue

**Solution**:

- Verify ngrok is running: `ngrok http 3000`
- Check webhook URL in Twilio matches ngrok URL
- Verify WHATSAPP_VERIFY_TOKEN matches in Twilio
- Check server logs for incoming webhook requests

---

## Quick Setup (All-in-One)

If you have all environment variables configured:

```bash
# Run complete setup
npm run setup-all

# Verify setup
npm run verify-setup

# Start server
npm run dev

# In another terminal, start portal
cd ../admin-portal && npm run dev
```

---

## Environment Variable Quick Reference

```bash
# Generate JWT Secret
openssl rand -base64 32

# Test Database Connection
npx prisma db push

# Test Redis Connection
redis-cli -u $REDIS_URL ping

# Test OpenAI API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## Next Steps After Setup

1. **Customize Properties**: Add your real property data via:
   - Admin portal bulk upload
   - API endpoint with CSV/Excel
   - Direct database insertion

2. **Configure WhatsApp**: Set up production WhatsApp number

3. **Customize AI Responses**: Modify prompts in:
   - `src/services/ai/prompt-builder.service.ts`
   - `src/services/ai/response-templates.ts`

4. **Add More Documents**: Upload company-specific documents via portal

5. **Configure Notifications**: Set up email/SMS for lead notifications

6. **Production Deployment**: Follow deployment guide in documentation

---

## Support

For issues not covered here:

- Check server logs: Backend logs show detailed error messages
- Review documentation: `docs/` folder has detailed guides
- Check Swagger API docs: http://localhost:3000/api-docs
- Verify environment: `npm run verify-setup`

---

**Last Updated**: October 2025  
**Version**: 1.0
