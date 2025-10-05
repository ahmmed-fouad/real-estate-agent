import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Load test environment variables
config({ path: '.env.test' });

// Global test database and Redis instances
let testPrisma: PrismaClient;
let testRedis: Redis;

// Setup before all integration tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.WHATSAPP_API_TOKEN = 'test-whatsapp-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';

  // Initialize test database
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Initialize test Redis
  testRedis = new Redis(process.env.REDIS_URL);

  // Connect to test database
  await testPrisma.$connect();
  await testRedis.connect();

  // Clean up test data
  await cleanupTestData();
});

// Cleanup after all integration tests
afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
  
  // Disconnect from services
  await testPrisma.$disconnect();
  await testRedis.disconnect();
});

// Cleanup before each test
beforeEach(async () => {
  await cleanupTestData();
});

// Cleanup after each test
afterEach(async () => {
  await cleanupTestData();
});

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    // Clean up in reverse order of dependencies
    await testPrisma.analyticsEvent.deleteMany();
    await testPrisma.scheduledViewing.deleteMany();
    await testPrisma.message.deleteMany();
    await testPrisma.conversation.deleteMany();
    await testPrisma.paymentPlan.deleteMany();
    await testPrisma.property.deleteMany();
    await testPrisma.agent.deleteMany();
    
    // Clean up Redis
    await testRedis.flushdb();
  } catch (error) {
    console.warn('Error during test cleanup:', error);
  }
}

// Export test instances for use in tests
export { testPrisma, testRedis };

// Mock external services for integration tests
jest.mock('../../src/config/openai-client', () => ({
  getOpenAIClient: jest.fn().mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      },
    },
  }),
}));

jest.mock('../../src/config/whatsapp.config', () => ({
  whatsappConfig: {
    accountSid: 'test-account-sid',
    whatsappNumber: '+1234567890',
    apiUrl: 'https://api.twilio.com/2010-04-01',
    authToken: 'test-auth-token',
  },
}));

// Mock axios for external API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({
      data: { sid: 'test-message-id', status: 'queued' },
    }),
    get: jest.fn().mockResolvedValue({
      data: { sid: 'test-message-id', status: 'delivered' },
    }),
  })),
}));
