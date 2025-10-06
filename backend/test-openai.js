// Quick test for OpenAI API key
require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
  console.log('Testing OpenAI API key...\n');
  
  // Check if key exists
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env file');
    process.exit(1);
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('✓ Key length:', apiKey.length);
  console.log('\nTesting API connection...\n');
  
  try {
    const openai = new OpenAI({ apiKey });
    
    // Test with a simple embedding request
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'Hello, this is a test',
    });
    
    console.log('✅ SUCCESS! OpenAI API is working');
    console.log('✓ Embedding dimensions:', response.data[0].embedding.length);
    console.log('✓ Model used:', response.model);
    console.log('✓ Tokens used:', response.usage.total_tokens);
    console.log('\nYour OpenAI API key is valid and working! ✨\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ ERROR: OpenAI API call failed\n');
    console.error('Error details:', error.message);
    
    if (error.status === 401) {
      console.error('\n🔑 Authentication Error: Invalid API key');
      console.error('Please check your OPENAI_API_KEY in .env file');
    } else if (error.status === 429) {
      console.error('\n⚠️  Rate Limit: Too many requests or quota exceeded');
      console.error('Check your OpenAI account billing and usage');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n🌐 Network Error: Cannot reach OpenAI servers');
      console.error('Check your internet connection');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

testOpenAI();

