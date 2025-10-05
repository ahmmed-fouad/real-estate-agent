import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// E2E test database instance
let e2ePrisma: PrismaClient;

// Initialize E2E test database
export async function initializeE2EDatabase() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
  process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.WHATSAPP_API_TOKEN = 'test-whatsapp-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';

  // Initialize test database
  e2ePrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connect to test database
  await e2ePrisma.$connect();

  // Clean up test data
  await cleanupE2EData();

  return e2ePrisma;
}

// Cleanup E2E test data
export async function cleanupE2EData() {
  try {
    // Clean up in reverse order of dependencies
    await e2ePrisma.analyticsEvent.deleteMany();
    await e2ePrisma.scheduledViewing.deleteMany();
    await e2ePrisma.message.deleteMany();
    await e2ePrisma.conversation.deleteMany();
    await e2ePrisma.paymentPlan.deleteMany();
    await e2ePrisma.property.deleteMany();
    await e2ePrisma.agent.deleteMany();
  } catch (error) {
    console.warn('Error during E2E cleanup:', error);
  }
}

// Create test agent for E2E tests
export async function createE2ETestAgent() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testAgent = await e2ePrisma.agent.create({
    data: {
      email: 'e2e-test@example.com',
      passwordHash: hashedPassword,
      fullName: 'E2E Test Agent',
      phoneNumber: '+1234567890',
      companyName: 'E2E Test Company',
      whatsappNumber: '+0987654321',
    },
  });

  // Create test properties
  await e2ePrisma.property.createMany({
    data: [
      {
        agentId: testAgent.id,
        projectName: 'E2E Test Villa',
        propertyType: 'villa',
        city: 'Cairo',
        district: 'New Cairo',
        basePrice: 5000000,
        pricePerMeter: 25000,
        area: 200,
        bedrooms: 4,
        bathrooms: 3,
        status: 'available',
        description: 'Beautiful villa for E2E testing',
        amenities: ['Swimming Pool', 'Garden', 'Parking'],
      },
      {
        agentId: testAgent.id,
        projectName: 'E2E Test Apartment',
        propertyType: 'apartment',
        city: 'Cairo',
        district: 'Maadi',
        basePrice: 2000000,
        pricePerMeter: 16667,
        area: 120,
        bedrooms: 3,
        bathrooms: 2,
        status: 'available',
        description: 'Modern apartment for E2E testing',
        amenities: ['Balcony', 'Parking', 'Elevator'],
      },
    ],
  });

  return testAgent;
}

// Close E2E database connection
export async function closeE2EDatabase() {
  await cleanupE2EData();
  await e2ePrisma.$disconnect();
}

// Export E2E Prisma instance
export { e2ePrisma };
