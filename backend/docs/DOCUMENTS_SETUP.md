# Documents Setup Guide

This guide explains how to set up and use the document management system for the RAG (Retrieval Augmented Generation) knowledge base.

## Overview

The document system allows you to store and manage various types of documents (brochures, FAQs, contracts, guides) that the AI can reference when answering customer questions. Documents are stored in a vector database for semantic search.

## Database Schema

### Documents Table

The `documents` table stores all knowledge base documents with the following fields:

- **id**: Unique identifier
- **agent_id**: Agent who owns the document
- **property_id**: Optional link to specific property
- **title**: Document title
- **description**: Document description
- **document_type**: Type of document (brochure, floor_plan, contract, policy, faq, guide)
- **category**: Category (property_info, legal, financial, company_info)
- **file_url**: URL to the actual file
- **file_name**: Original file name
- **file_type**: File type (pdf, docx, txt)
- **file_size**: File size in bytes
- **content_text**: Extracted text content
- **content_chunks**: JSON array of text chunks for RAG
- **embedding_text**: Text used for generating embeddings
- **embedding**: Vector embedding (1536 dimensions for OpenAI)
- **tags**: Array of tags
- **language**: Language (en, ar, mixed)
- **is_active**: Whether document is active
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

## Setup Instructions

### 1. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

This will:
- Create the `documents` table
- Add vector search function `match_documents`
- Create necessary indexes

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Seed Test Documents

```bash
npx ts-node prisma/seeds/documents.seed.ts
```

This will create 6 test documents:
1. **Company Overview** - General company information
2. **Payment Plans Guide** - Detailed payment and financing options
3. **FAQ** - Common questions and answers
4. **Contract Terms** - Standard purchase contract terms
5. **New Cairo Brochure** - Property listings for New Cairo
6. **Foreign Investment Guide** - Guide for international buyers

## Usage

### Ingest a Document

```typescript
import { documentService } from './services/document';

const result = await documentService.ingestDocument({
  agentId: 'agent-uuid',
  title: 'Property Brochure',
  description: 'Detailed property information',
  documentType: 'brochure',
  category: 'property_info',
  fileUrl: 'https://example.com/brochure.pdf',
  fileName: 'brochure.pdf',
  fileType: 'pdf',
  fileSize: 524288,
  contentText: 'Your document text content here...',
  tags: ['property', 'brochure'],
  language: 'en',
});
```

### Search Documents

```typescript
// Vector similarity search
const documents = await documentService.searchDocuments({
  agentId: 'agent-uuid',
  query: 'What are the payment plans?',
  topK: 5,
  threshold: 0.7,
});

// Filter by type
const faqs = await documentService.searchDocuments({
  agentId: 'agent-uuid',
  documentType: 'faq',
  topK: 10,
});
```

### Get Documents by Agent

```typescript
const documents = await documentService.getDocumentsByAgent('agent-uuid', {
  documentType: 'guide',
  category: 'company_info',
});
```

### Update Document

```typescript
await documentService.updateDocument(documentId, {
  title: 'Updated Title',
  description: 'Updated description',
  isActive: true,
});
```

### Delete Document

```typescript
await documentService.deleteDocument(documentId);
```

## Document Types

### brochure
Property brochures with specifications, amenities, and pricing

### floor_plan
Floor plans and layout diagrams

### contract
Purchase contracts and legal documents

### policy
Company policies and procedures

### faq
Frequently asked questions and answers

### guide
Guides and how-to documents

## Categories

### property_info
Information about specific properties

### legal
Legal documents and contracts

### financial
Payment plans, financing options

### company_info
Company overview, services, contact information

## Best Practices

### 1. Content Extraction
- Extract clean text from PDFs/documents before ingesting
- Remove headers, footers, page numbers
- Keep formatting simple
- Include both English and Arabic content when available

### 2. Chunking
- Documents are automatically chunked into 500-character segments
- Overlapping chunks preserve context
- Each chunk gets its own embedding

### 3. Embeddings
- Embeddings are generated automatically using OpenAI
- Vector dimension: 1536 (text-embedding-3-large)
- Embeddings enable semantic search

### 4. Metadata
- Use descriptive titles and descriptions
- Add relevant tags for filtering
- Set appropriate document type and category
- Link to property when relevant

### 5. Maintenance
- Keep documents up to date
- Set `is_active = false` for outdated documents
- Review and update regularly

## Integration with RAG

Documents are automatically integrated with the RAG system:

1. **Customer asks question**
2. **System generates query embedding**
3. **Vector search finds relevant documents**
4. **Document content is added to AI context**
5. **AI generates response using document knowledge**

## API Endpoints (Future)

These endpoints can be added for document management via API:

- `POST /api/documents` - Create document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/search` - Search documents
- `POST /api/documents/batch` - Batch ingest

## Troubleshooting

### Documents not appearing in search
- Check if embeddings were generated
- Verify `is_active = true`
- Check similarity threshold (try lowering it)
- Verify agent_id matches

### Slow search performance
- Ensure vector index is created: `documents_embedding_idx`
- Check database performance
- Consider increasing `lists` parameter in index

### Out of memory errors
- Reduce chunk size
- Process documents in smaller batches
- Increase database memory

## Next Steps

After setting up documents:

1. **Ingest your actual documents**
2. **Test document search**
3. **Integrate with RAG service** (next TODO item)
4. **Train AI to use documents effectively**
5. **Monitor document usage and effectiveness**

## Support

For issues or questions:
- Check logs: `backend/logs/`
- Review Prisma migrations
- Test with seed data first
- Contact development team

