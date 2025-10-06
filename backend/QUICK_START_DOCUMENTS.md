# Quick Start: Documents Setup

## Prerequisites

- Database URL configured in `.env`
- OpenAI API key configured in `.env`
- Node.js and npm installed
- Prisma CLI installed

## Option 1: Automated Setup (Recommended)

### Windows (PowerShell)
```powershell
cd backend
.\scripts\setup-documents.ps1
```

### Linux/Mac (Bash)
```bash
cd backend
chmod +x scripts/setup-documents.sh
./scripts/setup-documents.sh
```

## Option 2: Manual Setup

### Step 1: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### Step 2: Run Migrations
```bash
npx prisma migrate dev --name add_documents_table
```

### Step 3: Apply Vector Search Functions
Run the SQL migration against your database:
```bash
# Using psql
psql $DATABASE_URL -f prisma/migrations/20250106_document_vector_search_function.sql

# Or use your database client (DBeaver, pgAdmin, etc.)
# to run: backend/prisma/migrations/20250106_document_vector_search_function.sql
```

### Step 4: Seed Test Documents
```bash
npx ts-node prisma/seeds/documents.seed.ts
```

## Verify Setup

### Check Database
```sql
-- Count documents
SELECT COUNT(*) FROM documents;
-- Should return: 6

-- List documents
SELECT title, document_type, language FROM documents;
```

### Test Document Search
```typescript
import { documentService } from './src/services/document';

// Test search
const docs = await documentService.searchDocuments({
  agentId: 'your-agent-id', // Use actual agent ID from database
  query: 'payment plans',
  topK: 3,
});

console.log('Found documents:', docs.length);
```

## What You Get

After setup, you'll have:

1. ✅ **Documents table** in your database
2. ✅ **Vector search function** for semantic search
3. ✅ **6 test documents**:
   - Company Overview
   - Payment Plans Guide
   - FAQ
   - Contract Terms
   - New Cairo Brochure
   - Foreign Investment Guide

4. ✅ **Vector embeddings** for all documents
5. ✅ **Document service** ready to use

## Next Steps

1. **Verify documents in database**
2. **Test document search**
3. **Proceed to TODO item 3**: Setup RAG for ingesting documents
4. **Integrate with AI chat** to use document knowledge

## Troubleshooting

### "Prisma client not found"
```bash
npx prisma generate
```

### "Migration failed"
- Check DATABASE_URL in .env
- Ensure database is running
- Verify database connection

### "Cannot find module '@prisma/client'"
```bash
npm install
npx prisma generate
```

### "Embedding generation failed"
- Check OPENAI_API_KEY in .env
- Verify OpenAI API access
- Check network connection

### "Vector extension not found"
Your database needs pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Files Reference

- **Schema**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/20250106_*`
- **Service**: `backend/src/services/document/`
- **Seeder**: `backend/prisma/seeds/documents.seed.ts`
- **Docs**: `backend/docs/DOCUMENTS_SETUP.md`

## Support

For detailed documentation, see: `backend/docs/DOCUMENTS_SETUP.md`
For implementation details, see: `backend/DOCUMENTS_IMPLEMENTATION_SUMMARY.md`

