/**
 * Complete Setup Script
 * Automates the entire setup process for WhatsApp AI Agent
 *
 * Usage: npm run setup-all
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('\n' + '='.repeat(70));
console.log('🚀 WhatsApp AI Agent - Complete Setup');
console.log('='.repeat(70) + '\n');

// Check .env exists
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found!');
  console.log('📝 Please copy env.template to .env and fill in your values');
  console.log('\nRequired environment variables:');
  console.log('  - OPENAI_API_KEY');
  console.log('  - DATABASE_URL');
  console.log('  - SUPABASE_URL');
  console.log('  - SUPABASE_ANON_KEY');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  console.log('  - REDIS_URL');
  console.log('  - JWT_SECRET');
  console.log('\nSee SETUP-CHECKLIST.md for complete list\n');
  process.exit(1);
}

console.log('✅ .env file found\n');

// Check critical environment variables
const criticalVars = ['OPENAI_API_KEY', 'DATABASE_URL', 'SUPABASE_URL', 'REDIS_URL', 'JWT_SECRET'];

const env = require('dotenv').config({ path: envPath });
const missingVars = criticalVars.filter((varName) => !env.parsed?.[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing critical environment variables:');
  missingVars.forEach((varName) => console.log(`   - ${varName}`));
  console.log('\nPlease add these to your .env file\n');
  process.exit(1);
}

console.log('✅ Critical environment variables found\n');

// Step 1: Run migrations
console.log('📦 Step 1: Running database migrations...');
console.log('-'.repeat(70));
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Migrations completed successfully\n');
} catch (error) {
  console.error('❌ Migration failed. Please check your DATABASE_URL');
  console.log('   Make sure:');
  console.log('   1. Database is accessible');
  console.log('   2. DATABASE_URL is correct');
  console.log('   3. Supabase project is not paused\n');
  process.exit(1);
}

// Step 2: Create agent
console.log('👤 Step 2: Creating agent account...');
console.log('-'.repeat(70));
try {
  execSync('tsx scripts/create-agent.ts agent@test.com Test123! "Test Agent" +201234567890', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('✅ Agent created successfully\n');
} catch (error) {
  console.log('⚠️  Agent might already exist, continuing...\n');
}

// Step 3: Seed properties
console.log('🏘️  Step 3: Seeding properties (this may take 2-3 minutes)...');
console.log('-'.repeat(70));
console.log('⏳ Generating embeddings for each property...');
try {
  execSync('tsx prisma/seeds/properties.seed.ts', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('✅ Properties seeded successfully\n');
} catch (error) {
  console.error('❌ Property seeding failed');
  console.log('   Common causes:');
  console.log('   1. Invalid OPENAI_API_KEY');
  console.log('   2. OpenAI API rate limit or quota exceeded');
  console.log('   3. Database connection issue\n');
  process.exit(1);
}

// Step 4: Seed documents
console.log('📄 Step 4: Seeding knowledge base documents...');
console.log('-'.repeat(70));
try {
  execSync('tsx prisma/seeds/documents.seed.ts', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('✅ Documents seeded successfully\n');
} catch (error) {
  console.error('❌ Document seeding failed');
  console.log('   This is optional, but recommended for better AI responses\n');
  // Don't exit - documents are nice-to-have
}

// Final summary
console.log('\n' + '='.repeat(70));
console.log('✅ SETUP COMPLETE!');
console.log('='.repeat(70));
console.log('\n🎉 Your WhatsApp AI Agent is ready!');
console.log('\n📋 Next steps:');
console.log('   1. Start the server:');
console.log('      npm run dev');
console.log('');
console.log('   2. Start the admin portal (in a new terminal):');
console.log('      cd ../admin-portal && npm run dev');
console.log('');
console.log('   3. Login to portal:');
console.log('      URL: http://localhost:5173');
console.log('      Email: agent@test.com');
console.log('      Password: Test123!');
console.log('');
console.log('   4. Configure WhatsApp webhook (optional):');
console.log('      - Run: ngrok http 3000');
console.log('      - Configure webhook in Twilio console');
console.log('      - See SETUP-CHECKLIST.md for details');
console.log('');
console.log('   5. Verify setup:');
console.log('      npm run verify-setup');
console.log('\n' + '='.repeat(70));
console.log('📚 Documentation:');
console.log('   - Setup guide: SETUP-CHECKLIST.md');
console.log('   - API docs: http://localhost:3000/api-docs (after starting server)');
console.log('   - Project structure: docs/PROJECT_STRUCTURE.md');
console.log('='.repeat(70) + '\n');
