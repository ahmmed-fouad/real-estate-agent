// Test if embeddings are actually stored in the database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testEmbeddings() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Testing document embeddings in database...\n');

  // Check if documents exist
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, title, embedding')
    .limit(10);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError.message);
    return;
  }

  console.log(`✓ Found ${docs.length} documents\n`);

  if (docs.length === 0) {
    console.log('❌ No documents in database. Run the seed script first.');
    return;
  }

  // Check embeddings
  docs.forEach((doc, idx) => {
    const hasEmbedding = doc.embedding !== null && doc.embedding !== undefined;
    console.log(`${idx + 1}. ${doc.title}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Has embedding: ${hasEmbedding ? '✅' : '❌'}`);
    if (hasEmbedding) {
      console.log(`   Embedding type: ${typeof doc.embedding}`);
      console.log(`   Embedding value: ${JSON.stringify(doc.embedding).substring(0, 100)}...`);
    }
    console.log('');
  });

  // Test the match_documents function
  console.log('Testing match_documents function...\n');
  
  // Create a test embedding (array of 1536 numbers)
  const testEmbedding = new Array(1536).fill(0.1);
  
  const { data: matchData, error: matchError } = await supabase
    .rpc('match_documents', {
      query_embedding: testEmbedding,
      match_threshold: 0.1,
      match_count: 5,
      filter_agent_id: null
    });

  if (matchError) {
    console.error('❌ match_documents function error:', matchError.message);
    console.error('Full error:', matchError);
    return;
  }

  console.log(`✓ match_documents returned ${matchData?.length || 0} results`);
  
  if (matchData && matchData.length > 0) {
    console.log('\nMatched documents:');
    matchData.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.title} (similarity: ${doc.similarity})`);
    });
  }
}

testEmbeddings().catch(console.error);

