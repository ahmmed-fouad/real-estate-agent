#!/usr/bin/env node

/**
 * Script to reset a WhatsApp conversation session
 * Usage: node reset-session.js <phone_number>
 * Example: node reset-session.js whatsapp:+201234567890
 */

const Redis = require('ioredis');

async function resetSession(phoneNumber) {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  console.log('Connecting to Redis...');
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  await redis.connect();
  console.log('✅ Connected to Redis');

  // Generate session key
  const sessionKey = `session:${phoneNumber}`;

  console.log(`Looking for session: ${sessionKey}`);

  // Check if session exists
  const exists = await redis.exists(sessionKey);

  if (!exists) {
    console.log('❌ Session not found');
    await redis.quit();
    return;
  }

  // Get current session
  const sessionData = await redis.get(sessionKey);
  const session = JSON.parse(sessionData);

  console.log('\n📊 Current session state:');
  console.log(`   - State: ${session.state}`);
  console.log(`   - Customer: ${session.customerId}`);
  console.log(`   - Messages: ${session.context.messageHistory?.length || 0}`);
  if (session.context.escalationTime) {
    console.log(`   - Escalated at: ${session.context.escalationTime}`);
  }

  // Reset the session
  session.state = 'ACTIVE';
  delete session.context.escalationTime;
  delete session.context.escalationReason;

  // Save back to Redis
  await redis.set(sessionKey, JSON.stringify(session));

  console.log('\n✅ Session reset to ACTIVE state');
  console.log('   - Escalation cleared');
  console.log('   - Ready to receive AI responses');

  await redis.quit();
  console.log('\n🎉 Done! You can now send WhatsApp messages.');
}

// Main execution
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('❌ Error: Phone number required');
  console.error('Usage: node reset-session.js <phone_number>');
  console.error('Example: node reset-session.js whatsapp:+201234567890');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: '../.env' });

resetSession(phoneNumber).catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
