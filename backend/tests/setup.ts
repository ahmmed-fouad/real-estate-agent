import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock external services by default
jest.mock('@supabase/supabase-js');
jest.mock('openai');
jest.mock('ioredis');
jest.mock('axios');

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.WHATSAPP_API_TOKEN = 'test-whatsapp-token';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
});

// Global test cleanup
afterAll(() => {
  jest.clearAllMocks();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
