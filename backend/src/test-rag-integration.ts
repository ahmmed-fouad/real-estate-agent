/**
 * Test Script for RAG Integration
 * Tests the unified RAG service with document knowledge
 */

import { unifiedRAGService } from './services/ai/unified-rag.service';
import { prisma } from './config/prisma-client';
import { createServiceLogger } from './utils/logger';

const logger = createServiceLogger('RAGIntegrationTest');

async function testRAGIntegration() {
  try {
    console.log('========================================');
    console.log('Testing Unified RAG Integration');
    console.log('========================================\n');

    // Get first agent from database
    const agent = await prisma.agent.findFirst();
    
    if (!agent) {
      console.error('❌ No agent found in database');
      console.log('Please ensure you have at least one agent in the database');
      process.exit(1);
    }

    console.log(`✓ Using agent: ${agent.fullName} (${agent.id})\n`);

    // Test queries
    const testQueries = [
      {
        query: 'What payment plans do you offer?',
        description: 'Document-based query (should retrieve payment guide)',
      },
      {
        query: 'Show me 3-bedroom apartments in New Cairo',
        description: 'Property-based query (should retrieve properties)',
      },
      {
        query: 'How can I schedule a viewing?',
        description: 'FAQ query (should retrieve FAQ document)',
      },
      {
        query: 'What is your company about?',
        description: 'Company info query (should retrieve company overview)',
      },
      {
        query: 'Tell me about apartments with 2 bedrooms under 3 million EGP',
        description: 'Combined query (might retrieve both properties and documents)',
      },
    ];

    for (const test of testQueries) {
      console.log('----------------------------------------');
      console.log(`Query: "${test.query}"`);
      console.log(`Description: ${test.description}`);
      console.log('----------------------------------------\n');

      try {
        const startTime = Date.now();
        
        // Smart retrieve (auto-detects source)
        const result = await unifiedRAGService.smartRetrieve(
          test.query,
          agent.id,
          {
            topK: 3,
            threshold: 0.7,
          }
        );

        const duration = Date.now() - startTime;

        console.log('✓ Retrieval successful!');
        console.log(`  Duration: ${duration}ms`);
        console.log(`  Properties found: ${result.sources.propertyCount}`);
        console.log(`  Documents found: ${result.sources.documentCount}`);
        console.log(`  Context length: ${result.combinedContext.length} characters`);

        if (result.properties.length > 0) {
          console.log('\n  📋 Properties:');
          result.properties.forEach((prop, idx) => {
            console.log(`    ${idx + 1}. ${prop.projectName} - ${prop.location.city}`);
          });
        }

        if (result.documents.length > 0) {
          console.log('\n  📚 Documents:');
          result.documents.forEach((doc, idx) => {
            console.log(`    ${idx + 1}. ${doc.title} (${doc.document_type || doc.documentType})`);
          });
        }

        console.log('\n  💬 Sample Context (first 200 chars):');
        console.log(`    ${result.combinedContext.substring(0, 200)}...\n`);

      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log('========================================');
    console.log('RAG Integration Test Complete!');
    console.log('========================================\n');

    // Test source detection
    console.log('Testing automatic source detection...\n');
    
    const sourceTests = [
      'What payment plans are available?',
      'Show me apartments',
      'How does your company work?',
    ];

    for (const query of sourceTests) {
      const source = await unifiedRAGService.detectKnowledgeSource(query);
      console.log(`"${query}"`);
      console.log(`  → Detected source: ${source}\n`);
    }

    console.log('✅ All tests completed!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    logger.error('RAG integration test failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
if (require.main === module) {
  testRAGIntegration();
}

