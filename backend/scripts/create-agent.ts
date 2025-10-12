/**
 * Create Agent Script
 * Easily create agent accounts with proper password hashing
 *
 * Usage:
 *   npm run create-agent
 *   npm run create-agent agent@example.com MyPassword123 "Agent Name" +201234567890
 */

import { prisma } from '../src/config/prisma-client';
import bcrypt from 'bcrypt';
import { createServiceLogger } from '../src/utils/logger';

const logger = createServiceLogger('CreateAgent');

async function createAgent() {
  try {
    const email = process.argv[2] || 'agent@realestate.com';
    const password = process.argv[3] || 'Test123!';
    const fullName = process.argv[4] || 'Real Estate Agent';
    const whatsappNumber = process.argv[5] || '+201234567890';

    logger.info('Creating agent account...', { email, fullName });

    // Check if agent already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { email },
    });

    if (existingAgent) {
      console.error(`\n❌ Error: Agent with email ${email} already exists!`);
      console.log(`Agent ID: ${existingAgent.id}`);
      console.log(`Full Name: ${existingAgent.fullName}\n`);
      process.exit(1);
    }

    // Hash password
    logger.info('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create agent
    logger.info('Creating agent in database...');
    const agent = await prisma.agent.create({
      data: {
        email,
        passwordHash,
        fullName,
        whatsappNumber,
        companyName: 'Real Estate Solutions Egypt',
        status: 'active',
        settings: {
          workingHours: {
            sunday: { start: '09:00', end: '18:00' },
            monday: { start: '09:00', end: '18:00' },
            tuesday: { start: '09:00', end: '18:00' },
            wednesday: { start: '09:00', end: '18:00' },
            thursday: { start: '09:00', end: '18:00' },
          },
          greetingMessage: 'Welcome! How can I help you find your perfect property today?',
          language: 'mixed', // Arabic and English
        },
      },
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Agent created successfully!');
    console.log('='.repeat(60));
    console.log(`Email: ${agent.email}`);
    console.log(`Password: ${password}`);
    console.log(`Agent ID: ${agent.id}`);
    console.log(`Full Name: ${agent.fullName}`);
    console.log(`WhatsApp: ${agent.whatsappNumber}`);
    console.log(`Company: ${agent.companyName}`);
    console.log('='.repeat(60));
    console.log('\n📝 Next steps:');
    console.log('1. Save these credentials (especially the password!)');
    console.log('2. Seed properties: npm run seed-properties');
    console.log('3. Seed documents: npm run seed-documents');
    console.log('4. Start server: npm run dev');
    console.log('5. Login to portal at http://localhost:5173\n');

    logger.info('Agent creation completed successfully');
  } catch (error) {
    logger.error('Failed to create agent', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\n❌ Error creating agent:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAgent();
