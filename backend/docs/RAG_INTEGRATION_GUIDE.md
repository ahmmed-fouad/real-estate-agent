# RAG Integration Guide

## Overview

The Unified RAG (Retrieval Augmented Generation) system integrates multiple knowledge sources to provide the AI with comprehensive context for answering customer questions.

## Architecture

### Knowledge Sources

1. **Properties Database** - Real estate listings with specifications, pricing, amenities
2. **Documents Knowledge Base** - Company info, FAQs, payment guides, contracts, brochures

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified RAG Service                       │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Property Search │         │ Document Search  │         │
│  │  (RAG Service)   │         │ (Doc Service)    │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
│           └──────────┬──────────────────┘                    │
│                      │                                       │
│              ┌───────▼───────┐                              │
│              │ Context Merger │                              │
│              └───────┬────────┘                              │
│                      │                                       │
│              ┌───────▼────────┐                             │
│              │ Prompt Augment │                             │
│              └────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  LLM Service   │
              └────────────────┘
```

## How It Works

### 1. Query Processing

When a customer message arrives:

1. **Intent Classification** - Determine what the customer wants
2. **Entity Extraction** - Extract specific requirements (price, location, bedrooms, etc.)
3. **Source Detection** - Automatically detect if query needs properties, documents, or both

### 2. Smart Retrieval

The system automatically determines the best knowledge source(s):

**Property Queries** (Keywords: property, apartment, villa, bedroom, price, buy)
- Searches properties database only
- Applies entity-based filters (price range, location, bedrooms, etc.)
- Returns relevant property listings

**Document Queries** (Keywords: how, what, payment plan, company, contract, FAQ)
- Searches documents knowledge base only
- Retrieves FAQs, guides, policy documents
- Returns relevant document chunks

**Combined Queries** (Mixed or unclear)
- Searches BOTH sources
- Merges results intelligently
- Provides comprehensive context

### 3. Context Building

Retrieved information is formatted into structured context:

```
=== KNOWLEDGE BASE ===
Document 1: Payment Plans Guide
Type: guide
Category: financial

[Relevant content from document...]

=== AVAILABLE PROPERTIES ===
Property 1: Luxury Apartments New Cairo
- Location: Fifth Settlement, New Cairo
- Type: Apartment
- Price: 3,500,000 EGP
...
```

### 4. Prompt Augmentation

The system prompt is enhanced with retrieved context:

```
[Original System Prompt]

## RETRIEVED CONTEXT
Use the following information to answer accurately:

[Combined Context from Properties and Documents]

## IMPORTANT INSTRUCTIONS
- Use the context above to provide accurate answers
- Reference property listings when available
- Use knowledge base for general questions
...
```

### 5. Response Generation

LLM generates response using:
- Original system prompt
- Retrieved context
- Conversation history
- Customer's language preference

## Implementation

### Basic Usage

```typescript
import { unifiedRAGService } from './services/ai/unified-rag.service';

// Smart retrieval (auto-detects source)
const result = await unifiedRAGService.smartRetrieve(
  "What payment plans do you offer?",
  agentId,
  {
    topK: 5,
    threshold: 0.7,
  }
);

console.log(`Properties: ${result.sources.propertyCount}`);
console.log(`Documents: ${result.sources.documentCount}`);
console.log(`Context: ${result.combinedContext}`);
```

### Search Specific Sources

```typescript
// Search only documents
const docs = await unifiedRAGService.searchDocuments(
  "How does the buying process work?",
  agentId,
  { topK: 3 }
);

// Search only properties
const properties = await unifiedRAGService.searchProperties(
  "3-bedroom apartments under 3 million",
  agentId,
  { topK: 5, filters: { maxPrice: 3000000, bedrooms: 3 } }
);

// Search both (explicit)
const both = await unifiedRAGService.retrieveContext(
  "Tell me about properties and payment options",
  agentId,
  { source: KnowledgeSource.BOTH }
);
```

### Prompt Augmentation

```typescript
// Augment system prompt with context
const augmentedPrompt = await unifiedRAGService.augmentPrompt(
  systemPrompt,
  userQuery,
  agentId,
  { topK: 5 }
);

// Use augmented prompt with LLM
const response = await llmService.generateResponse(
  augmentedPrompt,
  userQuery
);
```

## Source Detection Logic

### Automatic Detection Algorithm

```typescript
// Property keywords
const propertyKeywords = [
  'property', 'apartment', 'villa', 'unit', 
  'bedroom', 'bathroom', 'price', 'sqm', 
  'available', 'listing', 'buy', 'purchase'
];

// Document keywords
const documentKeywords = [
  'how', 'what', 'why', 'payment plan', 
  'contract', 'process', 'company', 'service', 
  'faq', 'policy', 'guide', 'help'
];

// Detection logic
if (hasPropertyKeywords && !hasDocumentKeywords) {
  return KnowledgeSource.PROPERTIES;
} else if (hasDocumentKeywords && !hasPropertyKeywords) {
  return KnowledgeSource.DOCUMENTS;
} else {
  return KnowledgeSource.BOTH;
}
```

### Manual Override

```typescript
// Force specific source
const result = await unifiedRAGService.retrieveContext(
  query,
  agentId,
  { source: KnowledgeSource.DOCUMENTS } // Force documents only
);
```

## Configuration

### Default Settings

```typescript
{
  topK: 5,              // Return top 5 results per source
  threshold: 0.7,       // 70% similarity minimum
  source: 'auto',       // Auto-detect source
}
```

### Customization

```typescript
const result = await unifiedRAGService.smartRetrieve(
  query,
  agentId,
  {
    topK: 10,                    // More results
    threshold: 0.8,              // Higher similarity requirement
    documentTypes: ['faq'],      // Only FAQs
    documentCategories: ['financial'], // Only financial docs
    filters: {                   // Property filters
      minPrice: 2000000,
      maxPrice: 4000000,
      city: 'New Cairo',
    },
  }
);
```

## Message Processor Integration

The unified RAG is integrated into the message processing flow:

```typescript
// In message-processor.ts

// Extract search filters from customer message
const searchFilters = entityExtractor.extractSearchFilters(
  session.context.extractedInfo
);

// Retrieve context from both properties and documents
const unifiedResult = await unifiedRAGService.smartRetrieve(
  message.content,
  session.agentId,
  {
    topK: 5,
    filters: searchFilters,
    threshold: 0.7,
  }
);

// Use combined context for AI response
const ragContext = unifiedResult.combinedContext;
const systemPrompt = promptBuilder.buildSystemPromptFromSession(
  session,
  ragContext
);

// Generate response
const llmResponse = await llmService.generateResponse(
  systemPrompt,
  message.content
);
```

## Testing

### Run Integration Test

```bash
cd backend
npx ts-node src/test-rag-integration.ts
```

### Expected Output

```
========================================
Testing Unified RAG Integration
========================================

✓ Using agent: John Doe (uuid-here)

----------------------------------------
Query: "What payment plans do you offer?"
Description: Document-based query
----------------------------------------

✓ Retrieval successful!
  Duration: 450ms
  Properties found: 0
  Documents found: 2
  Context length: 2450 characters

  📚 Documents:
    1. Payment Plans Guide (guide)
    2. FAQ (faq)

  💬 Sample Context:
    Based on the query: "What payment plans do you offer?"

    === KNOWLEDGE BASE ===
    Document 1: Payment Plans Guide
    ...
```

## Performance

### Metrics

- **Average retrieval time**: 300-500ms
- **Vector search**: ~100-200ms per source
- **Context building**: ~50-100ms
- **Total overhead**: ~400-700ms added to response time

### Optimization Tips

1. **Adjust topK** - Fewer results = faster retrieval
2. **Increase threshold** - Higher threshold = fewer results = faster
3. **Use specific sources** - Search only what you need
4. **Cache frequently accessed docs** - Store common FAQs in memory
5. **Optimize embeddings** - Pre-generate embeddings for all docs

## Troubleshooting

### No results returned

**Problem**: Query returns 0 properties and 0 documents

**Solutions**:
- Check if documents are seeded: `SELECT COUNT(*) FROM documents;`
- Check if properties exist: `SELECT COUNT(*) FROM properties;`
- Lower similarity threshold: `threshold: 0.5`
- Check OpenAI API key is valid
- Verify embeddings are generated

### Slow performance

**Problem**: Retrieval takes >2 seconds

**Solutions**:
- Check vector indexes exist: `\d documents_embedding_idx`
- Reduce topK: `topK: 3`
- Check database performance
- Monitor OpenAI API latency
- Consider caching frequent queries

### Incorrect source detection

**Problem**: Document query searches properties instead

**Solutions**:
- Use explicit source: `source: KnowledgeSource.DOCUMENTS`
- Adjust detection keywords
- Check query language (Arabic keywords included)
- Review detection logic

### Context too large

**Problem**: Combined context exceeds token limits

**Solutions**:
- Reduce topK per source
- Truncate document content (currently limited to 1000 chars)
- Use chunk selection (take only first 2-3 chunks)
- Implement intelligent chunk ranking

## Best Practices

### 1. Let Source Detection Work

Use `smartRetrieve()` and let the system detect the best source automatically.

```typescript
// Good
const result = await unifiedRAGService.smartRetrieve(query, agentId);

// Only use explicit source when necessary
const result = await unifiedRAGService.retrieveContext(
  query,
  agentId,
  { source: KnowledgeSource.DOCUMENTS }
);
```

### 2. Apply Entity Filters

Always pass extracted entities as filters for better results:

```typescript
const searchFilters = entityExtractor.extractSearchFilters(extractedInfo);
const result = await unifiedRAGService.smartRetrieve(
  query,
  agentId,
  { filters: searchFilters }
);
```

### 3. Monitor Context Size

Keep an eye on combined context length to avoid token limits:

```typescript
if (result.combinedContext.length > 5000) {
  // Consider reducing topK or chunking differently
  logger.warn('Large context detected', {
    size: result.combinedContext.length,
  });
}
```

### 4. Handle Empty Results Gracefully

```typescript
if (result.sources.propertyCount === 0 && result.sources.documentCount === 0) {
  // Provide helpful fallback message
  return "I couldn't find specific information about that. Could you rephrase your question?";
}
```

### 5. Log Retrieval Metrics

```typescript
logger.info('RAG retrieval', {
  query: query.substring(0, 50),
  propertiesFound: result.sources.propertyCount,
  documentsFound: result.sources.documentCount,
  duration: retrievalTime,
});
```

## Future Enhancements

### Planned Features

1. **Hybrid Search** - Combine vector search with full-text search
2. **Re-ranking** - Use LLM to re-rank results by relevance
3. **Query Expansion** - Expand user queries with synonyms
4. **Multi-language Embeddings** - Better Arabic support
5. **Caching Layer** - Cache frequent queries/results
6. **Analytics** - Track which documents/properties are most useful
7. **Feedback Loop** - Learn from user interactions

### Experimental Features

1. **Chain-of-Thought RAG** - Multi-step reasoning with RAG
2. **Conversational RAG** - Use conversation history for better retrieval
3. **Agentic RAG** - Let AI decide when/what to retrieve
4. **Knowledge Graph** - Connect related documents and properties

## Related Documentation

- [Documents Setup Guide](./DOCUMENTS_SETUP.md)
- [RAG Service Implementation](../src/services/ai/rag.service.ts)
- [Unified RAG Service](../src/services/ai/unified-rag.service.ts)
- [Message Processor](../src/services/queue/message-processor.ts)

## Support

For questions or issues:
- Check logs: `backend/logs/`
- Run test script: `npx ts-node src/test-rag-integration.ts`
- Review implementation: `src/services/ai/unified-rag.service.ts`
- Contact development team

