import { test as setup, expect } from '@playwright/test';
import { testPrisma } from '../integration/setup';
import bcrypt from 'bcrypt';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Create test agent for E2E tests
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testAgent = await testPrisma.agent.create({
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
  await testPrisma.property.createMany({
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

  // Perform authentication steps
  await page.goto('/login');
  
  // Fill in login form
  await page.fill('[data-testid="email-input"]', 'e2e-test@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');

  // Wait for successful login
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toContainText('E2E Test Agent');

  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });
});
