import { test, expect } from '@playwright/test';

// Use the authenticated state from setup
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('Agent Portal E2E Tests', () => {
  test('should complete agent registration and login flow', async ({ page }) => {
    // This test uses a new browser context without authentication
    const context = await page.context().browser()?.newContext();
    const newPage = await context?.newPage();
    
    if (!newPage) return;

    // Step 1: Navigate to registration page
    await newPage.goto('/register');
    await expect(newPage.locator('[data-testid="registration-form"]')).toBeVisible();

    // Step 2: Fill registration form
    await newPage.fill('[data-testid="email-input"]', 'new-agent@example.com');
    await newPage.fill('[data-testid="password-input"]', 'password123');
    await newPage.fill('[data-testid="confirm-password-input"]', 'password123');
    await newPage.fill('[data-testid="full-name-input"]', 'New Test Agent');
    await newPage.fill('[data-testid="phone-input"]', '+1234567890');
    await newPage.fill('[data-testid="company-input"]', 'New Test Company');
    await newPage.fill('[data-testid="whatsapp-input"]', '+0987654321');

    // Step 3: Submit registration
    await newPage.click('[data-testid="register-button"]');

    // Step 4: Verify successful registration
    await expect(newPage.locator('[data-testid="success-message"]')).toContainText('registered successfully');

    // Step 5: Login with new credentials
    await newPage.goto('/login');
    await newPage.fill('[data-testid="email-input"]', 'new-agent@example.com');
    await newPage.fill('[data-testid="password-input"]', 'password123');
    await newPage.click('[data-testid="login-button"]');

    // Step 6: Verify successful login
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.locator('[data-testid="user-name"]')).toContainText('New Test Agent');

    await newPage.close();
  });

  test('should complete property management workflow', async ({ page }) => {
    // Step 1: Navigate to properties page
    await page.goto('/properties');
    await expect(page.locator('[data-testid="properties-page"]')).toBeVisible();

    // Step 2: Add new property
    await page.click('[data-testid="add-property-button"]');
    await expect(page.locator('[data-testid="property-form"]')).toBeVisible();

    // Step 3: Fill property form
    await page.fill('[data-testid="project-name-input"]', 'E2E Test Property');
    await page.fill('[data-testid="developer-name-input"]', 'E2E Developer');
    await page.selectOption('[data-testid="property-type-select"]', 'villa');
    await page.fill('[data-testid="city-input"]', 'Cairo');
    await page.fill('[data-testid="district-input"]', 'New Cairo');
    await page.fill('[data-testid="address-input"]', '123 E2E Test Street');
    await page.fill('[data-testid="area-input"]', '250');
    await page.fill('[data-testid="bedrooms-input"]', '4');
    await page.fill('[data-testid="bathrooms-input"]', '3');
    await page.fill('[data-testid="base-price-input"]', '6000000');
    await page.fill('[data-testid="description-textarea"]', 'Beautiful villa for E2E testing with modern amenities');

    // Step 4: Add amenities
    await page.check('[data-testid="amenity-swimming-pool"]');
    await page.check('[data-testid="amenity-garden"]');
    await page.check('[data-testid="amenity-parking"]');

    // Step 5: Submit property
    await page.click('[data-testid="save-property-button"]');

    // Step 6: Verify property was created
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully');
    await expect(page.locator('[data-testid="property-item"]')).toContainText('E2E Test Property');

    // Step 7: Edit property
    await page.click('[data-testid="edit-property-button"]');
    await page.fill('[data-testid="base-price-input"]', '6500000');
    await page.click('[data-testid="save-property-button"]');

    // Step 8: Verify property was updated
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property updated successfully');
    await expect(page.locator('[data-testid="property-price"]')).toContainText('6,500,000');

    // Step 9: Delete property
    await page.click('[data-testid="delete-property-button"]');
    await page.click('[data-testid="confirm-delete-button"]');

    // Step 10: Verify property was deleted
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property deleted successfully');
    await expect(page.locator('[data-testid="property-item"]')).toHaveCount(2); // Only the original test properties remain
  });

  test('should complete bulk property upload workflow', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');
    await expect(page.locator('[data-testid="bulk-upload-page"]')).toBeVisible();

    // Step 2: Download template
    await page.click('[data-testid="download-template-button"]');
    
    // Step 3: Upload CSV file (simulate file upload)
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/sample-properties.csv');

    // Step 4: Verify file validation
    await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();

    // Step 5: Process upload
    await page.click('[data-testid="process-upload-button"]');

    // Step 6: Verify upload success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-count"]')).toContainText('3'); // Assuming 3 properties in CSV

    // Step 7: Verify properties appear in list
    await page.goto('/properties');
    await expect(page.locator('[data-testid="property-item"]')).toHaveCount(5); // 2 original + 3 uploaded
  });

  test('should complete conversation management workflow', async ({ page }) => {
    // Step 1: Navigate to conversations page
    await page.goto('/conversations');
    await expect(page.locator('[data-testid="conversations-page"]')).toBeVisible();

    // Step 2: Filter conversations
    await page.selectOption('[data-testid="status-filter"]', 'active');
    await page.selectOption('[data-testid="lead-quality-filter"]', 'hot');
    await page.fill('[data-testid="search-input"]', '+1234567890');

    // Step 3: Verify filtered results
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);

    // Step 4: Open conversation details
    await page.click('[data-testid="conversation-item"]');
    await expect(page.locator('[data-testid="conversation-details"]')).toBeVisible();

    // Step 5: Export conversation
    await page.click('[data-testid="export-conversation-button"]');
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');
    await page.click('[data-testid="download-export-button"]');

    // Step 6: Verify export (check for download)
    // Note: In a real test, you would verify the downloaded file

    // Step 7: Close conversation
    await page.click('[data-testid="close-conversation-button"]');
    await page.fill('[data-testid="closure-reason-input"]', 'Customer found property elsewhere');
    await page.click('[data-testid="confirm-close-button"]');

    // Step 8: Verify conversation is closed
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('closed');
  });

  test('should complete analytics dashboard workflow', async ({ page }) => {
    // Step 1: Navigate to analytics page
    await page.goto('/analytics');
    await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();

    // Step 2: Verify dashboard metrics
    await expect(page.locator('[data-testid="total-conversations"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-conversations"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-leads"]')).toBeVisible();
    await expect(page.locator('[data-testid="response-time"]')).toBeVisible();

    // Step 3: Change date range
    await page.fill('[data-testid="start-date-input"]', '2024-01-01');
    await page.fill('[data-testid="end-date-input"]', '2024-12-31');
    await page.click('[data-testid="apply-date-filter"]');

    // Step 4: Verify charts update
    await expect(page.locator('[data-testid="conversations-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-quality-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-performance-chart"]')).toBeVisible();

    // Step 5: Generate report
    await page.click('[data-testid="generate-report-button"]');
    await page.selectOption('[data-testid="report-type-select"]', 'weekly');
    await page.click('[data-testid="create-report-button"]');

    // Step 6: Verify report generation
    await expect(page.locator('[data-testid="report-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-download-link"]')).toBeVisible();
  });

  test('should complete settings configuration workflow', async ({ page }) => {
    // Step 1: Navigate to settings page
    await page.goto('/settings');
    await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();

    // Step 2: Update profile information
    await page.fill('[data-testid="full-name-input"]', 'Updated E2E Test Agent');
    await page.fill('[data-testid="phone-input"]', '+1111111111');
    await page.fill('[data-testid="company-input"]', 'Updated E2E Company');
    await page.click('[data-testid="save-profile-button"]');

    // Step 3: Verify profile update
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully');

    // Step 4: Configure response templates
    await page.click('[data-testid="response-templates-tab"]');
    await page.fill('[data-testid="greeting-template"]', 'مرحبا! Welcome to our real estate service. How can I help you today?');
    await page.fill('[data-testid="closing-template"]', 'Thank you for your interest. Feel free to contact us anytime!');
    await page.click('[data-testid="save-templates-button"]');

    // Step 5: Verify template update
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Templates updated successfully');

    // Step 6: Configure working hours
    await page.click('[data-testid="working-hours-tab"]');
    await page.check('[data-testid="monday-checkbox"]');
    await page.check('[data-testid="tuesday-checkbox"]');
    await page.check('[data-testid="wednesday-checkbox"]');
    await page.check('[data-testid="thursday-checkbox"]');
    await page.check('[data-testid="friday-checkbox"]');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '17:00');
    await page.click('[data-testid="save-working-hours-button"]');

    // Step 7: Verify working hours update
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Working hours updated successfully');

    // Step 8: Change password
    await page.click('[data-testid="security-tab"]');
    await page.fill('[data-testid="current-password-input"]', 'password123');
    await page.fill('[data-testid="new-password-input"]', 'newpassword123');
    await page.fill('[data-testid="confirm-password-input"]', 'newpassword123');
    await page.click('[data-testid="change-password-button"]');

    // Step 9: Verify password change
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Password changed successfully');
  });

  test('should handle responsive design on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Step 1: Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Step 2: Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();

    // Step 3: Navigate to properties
    await page.click('[data-testid="mobile-properties-link"]');
    await expect(page.locator('[data-testid="properties-page"]')).toBeVisible();

    // Step 4: Verify mobile layout
    await expect(page.locator('[data-testid="mobile-property-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-add-button"]')).toBeVisible();

    // Step 5: Test mobile form
    await page.click('[data-testid="mobile-add-button"]');
    await expect(page.locator('[data-testid="mobile-property-form"]')).toBeVisible();

    // Step 6: Verify form is mobile-friendly
    await expect(page.locator('[data-testid="mobile-form-inputs"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-save-button"]')).toBeVisible();
  });

  test('should handle error states and edge cases', async ({ page }) => {
    // Step 1: Test network error handling
    await page.route('**/api/properties', route => route.abort());
    await page.goto('/properties');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load properties');

    // Step 2: Test form validation
    await page.goto('/properties');
    await page.click('[data-testid="add-property-button"]');
    await page.click('[data-testid="save-property-button"]');

    // Step 3: Verify validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Project name is required');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Property type is required');

    // Step 4: Test unauthorized access
    const context = await page.context().browser()?.newContext();
    const newPage = await context?.newPage();
    
    if (newPage) {
      await newPage.goto('/properties');
      await expect(newPage.locator('[data-testid="login-redirect"]')).toBeVisible();
      await newPage.close();
    }

    // Step 5: Test 404 page
    await page.goto('/non-existent-page');
    await expect(page.locator('[data-testid="404-page"]')).toBeVisible();
  });
});
