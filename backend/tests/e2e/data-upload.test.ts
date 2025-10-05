import { test, expect } from '@playwright/test';
import { e2ePrisma } from './e2e-setup';

// Use the authenticated state from setup
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('Data Upload and Retrieval E2E Tests', () => {
  test('should complete CSV property upload workflow', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');
    await expect(page.locator('[data-testid="bulk-upload-page"]')).toBeVisible();

    // Step 2: Download template
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-template-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('property-template');

    // Step 3: Create test CSV content
    const csvContent = `projectName,developerName,propertyType,city,district,basePrice,area,bedrooms,bathrooms,description,amenities
Test Villa 1,Test Developer,Villa,Cairo,New Cairo,5000000,200,4,3,"Beautiful villa with garden","Swimming Pool,Garden,Parking"
Test Apartment 1,Test Developer,Apartment,Cairo,Maadi,2000000,120,3,2,"Modern apartment with balcony","Balcony,Parking,Elevator"
Test Villa 2,Test Developer,Villa,Alexandria,North Coast,8000000,300,5,4,"Luxury beach villa","Swimming Pool,Beach Access,Garden"`;

    // Step 4: Upload CSV file
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles({
      name: 'test-properties.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Step 5: Verify file validation
    await expect(page.locator('[data-testid="upload-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="valid-rows-count"]')).toContainText('3');
    await expect(page.locator('[data-testid="invalid-rows-count"]')).toContainText('0');

    // Step 6: Process upload
    await page.click('[data-testid="process-upload-button"]');

    // Step 7: Verify upload success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-count"]')).toContainText('3');
    await expect(page.locator('[data-testid="failed-count"]')).toContainText('0');

    // Step 8: Verify properties appear in list
    await page.goto('/properties');
    await expect(page.locator('[data-testid="property-item"]')).toHaveCount(5); // 2 original + 3 uploaded

    // Step 9: Verify uploaded property details
    await expect(page.locator('[data-testid="property-item"]').filter({ hasText: 'Test Villa 1' })).toBeVisible();
    await expect(page.locator('[data-testid="property-item"]').filter({ hasText: 'Test Apartment 1' })).toBeVisible();
    await expect(page.locator('[data-testid="property-item"]').filter({ hasText: 'Test Villa 2' })).toBeVisible();
  });

  test('should handle CSV upload with validation errors', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');

    // Step 2: Create CSV with validation errors
    const invalidCsvContent = `projectName,developerName,propertyType,city,district,basePrice,area,bedrooms,bathrooms,description,amenities
,Test Developer,Villa,Cairo,New Cairo,5000000,200,4,3,"Missing project name","Swimming Pool"
Test Villa 1,Test Developer,InvalidType,Cairo,New Cairo,5000000,200,4,3,"Invalid property type","Swimming Pool"
Test Villa 2,Test Developer,Villa,Cairo,New Cairo,-1000,200,4,3,"Negative price","Swimming Pool"
Test Villa 3,Test Developer,Villa,Cairo,New Cairo,5000000,0,4,3,"Zero area","Swimming Pool"`;

    // Step 3: Upload invalid CSV
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles({
      name: 'invalid-properties.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsvContent)
    });

    // Step 4: Verify validation errors
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="valid-rows-count"]')).toContainText('0');
    await expect(page.locator('[data-testid="invalid-rows-count"]')).toContainText('4');

    // Step 5: Verify error details
    await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Project name is required' })).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Invalid property type' })).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Price must be positive' })).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]').filter({ hasText: 'Area must be positive' })).toBeVisible();

    // Step 6: Verify process button is disabled
    await expect(page.locator('[data-testid="process-upload-button"]')).toBeDisabled();
  });

  test('should complete Excel property upload workflow', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');

    // Step 2: Download Excel template
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-excel-template-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('property-template.xlsx');

    // Step 3: Upload Excel file (simulate)
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles('tests/e2e/fixtures/sample-properties.xlsx');

    // Step 4: Verify Excel processing
    await expect(page.locator('[data-testid="excel-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="excel-sheets"]')).toBeVisible();

    // Step 5: Select sheet and process
    await page.selectOption('[data-testid="sheet-select"]', 'Properties');
    await page.click('[data-testid="process-excel-button"]');

    // Step 6: Verify Excel upload success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="excel-processed-count"]')).toContainText('5');
  });

  test('should complete image upload workflow', async ({ page }) => {
    // Step 1: Navigate to properties page
    await page.goto('/properties');

    // Step 2: Open property for editing
    await page.click('[data-testid="property-item"]:first-child');
    await page.click('[data-testid="edit-property-button"]');

    // Step 3: Upload property images
    const imageInput = page.locator('[data-testid="image-upload-input"]');
    await imageInput.setInputFiles([
      'tests/e2e/fixtures/property-image-1.jpg',
      'tests/e2e/fixtures/property-image-2.jpg',
      'tests/e2e/fixtures/property-image-3.jpg'
    ]);

    // Step 4: Verify image upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-images"]')).toHaveCount(3);

    // Step 5: Verify image previews
    await expect(page.locator('[data-testid="image-preview"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="image-thumbnail"]')).toHaveCount(3);

    // Step 6: Set primary image
    await page.click('[data-testid="set-primary-image-button"]:first-child');
    await expect(page.locator('[data-testid="primary-image-indicator"]')).toBeVisible();

    // Step 7: Save property with images
    await page.click('[data-testid="save-property-button"]');

    // Step 8: Verify images are saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property updated successfully');
    await expect(page.locator('[data-testid="property-images"]')).toHaveCount(3);
  });

  test('should complete document upload workflow', async ({ page }) => {
    // Step 1: Navigate to properties page
    await page.goto('/properties');

    // Step 2: Open property for editing
    await page.click('[data-testid="property-item"]:first-child');
    await page.click('[data-testid="edit-property-button"]');

    // Step 3: Upload property documents
    const documentInput = page.locator('[data-testid="document-upload-input"]');
    await documentInput.setInputFiles([
      'tests/e2e/fixtures/property-brochure.pdf',
      'tests/e2e/fixtures/floor-plan.pdf',
      'tests/e2e/fixtures/legal-documents.pdf'
    ]);

    // Step 4: Verify document upload
    await expect(page.locator('[data-testid="uploaded-documents"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="document-name"]')).toContainText('property-brochure.pdf');
    await expect(page.locator('[data-testid="document-name"]')).toContainText('floor-plan.pdf');
    await expect(page.locator('[data-testid="document-name"]')).toContainText('legal-documents.pdf');

    // Step 5: Verify document types
    await expect(page.locator('[data-testid="document-type"]').filter({ hasText: 'Brochure' })).toBeVisible();
    await expect(page.locator('[data-testid="document-type"]').filter({ hasText: 'Floor Plan' })).toBeVisible();
    await expect(page.locator('[data-testid="document-type"]').filter({ hasText: 'Legal' })).toBeVisible();

    // Step 6: Save property with documents
    await page.click('[data-testid="save-property-button"]');

    // Step 7: Verify documents are saved
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property updated successfully');
    await expect(page.locator('[data-testid="property-documents"]')).toHaveCount(3);
  });

  test('should complete data export workflow', async ({ page }) => {
    // Step 1: Navigate to properties page
    await page.goto('/properties');

    // Step 2: Select properties for export
    await page.check('[data-testid="select-all-properties"]');
    await page.uncheck('[data-testid="property-checkbox"]:first-child'); // Unselect one

    // Step 3: Initiate export
    await page.click('[data-testid="export-selected-button"]');
    await page.selectOption('[data-testid="export-format-select"]', 'csv');
    await page.click('[data-testid="start-export-button"]');

    // Step 4: Verify export progress
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-status"]')).toContainText('Processing');

    // Step 5: Wait for export completion
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-download-link"]')).toBeVisible();

    // Step 6: Download exported file
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-download-link"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('properties-export');
  });

  test('should complete conversation export workflow', async ({ page }) => {
    // Step 1: Navigate to conversations page
    await page.goto('/conversations');

    // Step 2: Open conversation
    await page.click('[data-testid="conversation-item"]:first-child');

    // Step 3: Export conversation
    await page.click('[data-testid="export-conversation-button"]');
    await page.selectOption('[data-testid="export-format-select"]', 'json');
    await page.click('[data-testid="export-button"]');

    // Step 4: Verify export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-export-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('conversation-export');

    // Step 5: Test different export formats
    await page.click('[data-testid="export-conversation-button"]');
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');
    await page.click('[data-testid="export-button"]');

    const pdfDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-export-button"]');
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
  });

  test('should complete analytics data export workflow', async ({ page }) => {
    // Step 1: Navigate to analytics page
    await page.goto('/analytics');

    // Step 2: Generate analytics report
    await page.click('[data-testid="generate-report-button"]');
    await page.selectOption('[data-testid="report-type-select"]', 'monthly');
    await page.fill('[data-testid="report-title-input"]', 'Monthly Analytics Report');
    await page.click('[data-testid="create-report-button"]');

    // Step 3: Verify report generation
    await expect(page.locator('[data-testid="report-generation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-complete"]')).toBeVisible();

    // Step 4: Download report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('analytics-report');

    // Step 5: Test email report
    await page.click('[data-testid="email-report-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="send-email-button"]');

    // Step 6: Verify email sent
    await expect(page.locator('[data-testid="email-sent-message"]')).toContainText('Report sent successfully');
  });

  test('should handle large file upload with progress tracking', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');

    // Step 2: Create large CSV file (simulate)
    const largeCsvHeader = 'projectName,developerName,propertyType,city,district,basePrice,area,bedrooms,bathrooms,description,amenities\n';
    const largeCsvRows = Array.from({ length: 1000 }, (_, i) => 
      `Test Property ${i},Test Developer,Villa,Cairo,New Cairo,${5000000 + i * 1000},200,4,3,"Property ${i}","Swimming Pool,Garden,Parking"`
    ).join('\n');
    const largeCsvContent = largeCsvHeader + largeCsvRows;

    // Step 3: Upload large file
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles({
      name: 'large-properties.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeCsvContent)
    });

    // Step 4: Verify progress tracking
    await expect(page.locator('[data-testid="upload-progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-percentage"]')).toBeVisible();

    // Step 5: Wait for upload completion
    await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-count"]')).toContainText('1000');

    // Step 6: Process large upload
    await page.click('[data-testid="process-upload-button"]');

    // Step 7: Verify batch processing
    await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-status"]')).toContainText('Processing batch');

    // Step 8: Wait for completion
    await expect(page.locator('[data-testid="batch-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-processed"]')).toContainText('1000');
  });

  test('should handle file upload errors and recovery', async ({ page }) => {
    // Step 1: Navigate to bulk upload page
    await page.goto('/properties/bulk-upload');

    // Step 2: Upload corrupted file
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles({
      name: 'corrupted-file.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('corrupted,data,file\ninvalid,content,here')
    });

    // Step 3: Verify error handling
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid file format');

    // Step 4: Retry with valid file
    const validCsvContent = `projectName,developerName,propertyType,city,district,basePrice,area,bedrooms,bathrooms,description,amenities
Recovery Test Villa,Test Developer,Villa,Cairo,New Cairo,5000000,200,4,3,"Recovery test property","Swimming Pool,Garden"`;

    await fileInput.setInputFiles({
      name: 'recovery-test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(validCsvContent)
    });

    // Step 5: Verify recovery success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="uploaded-count"]')).toContainText('1');

    // Step 6: Process recovery upload
    await page.click('[data-testid="process-upload-button"]');
    await expect(page.locator('[data-testid="upload-success"]')).toContainText('Properties uploaded successfully');
  });
});
