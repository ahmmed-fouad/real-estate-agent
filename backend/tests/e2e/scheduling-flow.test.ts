import { test, expect } from '@playwright/test';
import { e2ePrisma } from './e2e-setup';
import axios from 'axios';

// Use the authenticated state from setup
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('Scheduling Flow E2E Tests', () => {
  test.beforeEach(async () => {
    // Clean up any existing test viewings
    await e2ePrisma.scheduledViewing.deleteMany({
      where: {
        customerPhone: '+1234567890',
      },
    });
  });

  test('should complete full scheduling workflow from inquiry to confirmation', async ({ page }) => {
    // Step 1: Customer inquires about property
    const propertyInquiry = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_scheduling_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I am very interested in the E2E Test Villa. Can I schedule a viewing?',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', propertyInquiry);

    // Step 2: AI responds with available time slots
    // (This would be handled by the AI service automatically)

    // Step 3: Customer selects time slot
    const timeSelection = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_scheduling_002',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Yes, I would like to visit this Saturday at 2 PM',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', timeSelection);

    // Step 4: Verify scheduling in agent portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="scheduled-viewings"]')).toBeVisible();
    await expect(page.locator('[data-testid="viewing-item"]')).toHaveCount(1);

    // Step 5: Verify viewing details
    await expect(page.locator('[data-testid="customer-name"]')).toContainText('+1234567890');
    await expect(page.locator('[data-testid="property-name"]')).toContainText('E2E Test Villa');
    await expect(page.locator('[data-testid="scheduled-time"]')).toContainText('Saturday');
    await expect(page.locator('[data-testid="scheduled-time"]')).toContainText('2 PM');
    await expect(page.locator('[data-testid="viewing-status"]')).toContainText('scheduled');

    // Step 6: Agent confirms viewing
    await page.click('[data-testid="viewing-item"]');
    await page.click('[data-testid="confirm-viewing-button"]');
    await page.fill('[data-testid="confirmation-notes"]', 'Confirmed viewing for Saturday 2 PM');
    await page.click('[data-testid="send-confirmation-button"]');

    // Step 7: Verify confirmation
    await expect(page.locator('[data-testid="viewing-status"]')).toContainText('confirmed');
    await expect(page.locator('[data-testid="confirmation-sent"]')).toBeVisible();

    // Step 8: Check conversation for confirmation message
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('confirmed');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('Saturday 2 PM');
  });

  test('should handle viewing rescheduling workflow', async ({ page }) => {
    // Step 1: Create initial viewing
    const initialViewing = await e2ePrisma.scheduledViewing.create({
      data: {
        conversationId: 'test-conversation-id',
        propertyId: 'test-property-id',
        agentId: 'test-agent-id',
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        scheduledTime: new Date('2024-12-28T14:00:00Z'),
        status: 'confirmed',
        notes: 'Initial viewing scheduled',
      },
    });

    // Step 2: Customer requests rescheduling
    const rescheduleRequest = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_reschedule_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I need to reschedule my viewing to Sunday at 3 PM instead',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', rescheduleRequest);

    // Step 3: Verify rescheduling request in portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="reschedule-request"]')).toBeVisible();
    await expect(page.locator('[data-testid="reschedule-indicator"]')).toBeVisible();

    // Step 4: Agent processes rescheduling
    await page.click('[data-testid="viewing-item"]');
    await page.click('[data-testid="reschedule-viewing-button"]');
    await page.fill('[data-testid="new-time-input"]', '2024-12-29T15:00:00');
    await page.fill('[data-testid="reschedule-reason"]', 'Customer requested change');
    await page.click('[data-testid="confirm-reschedule-button"]');

    // Step 5: Verify rescheduling
    await expect(page.locator('[data-testid="viewing-status"]')).toContainText('rescheduled');
    await expect(page.locator('[data-testid="new-scheduled-time"]')).toContainText('Sunday 3 PM');
    await expect(page.locator('[data-testid="reschedule-notification"]')).toBeVisible();
  });

  test('should handle viewing cancellation workflow', async ({ page }) => {
    // Step 1: Create confirmed viewing
    const confirmedViewing = await e2ePrisma.scheduledViewing.create({
      data: {
        conversationId: 'test-conversation-id',
        propertyId: 'test-property-id',
        agentId: 'test-agent-id',
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        scheduledTime: new Date('2024-12-28T14:00:00Z'),
        status: 'confirmed',
        notes: 'Confirmed viewing',
      },
    });

    // Step 2: Customer cancels viewing
    const cancellationRequest = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_cancel_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I need to cancel my viewing for Saturday. Something came up.',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', cancellationRequest);

    // Step 3: Verify cancellation request in portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="cancellation-request"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancellation-indicator"]')).toBeVisible();

    // Step 4: Agent processes cancellation
    await page.click('[data-testid="viewing-item"]');
    await page.click('[data-testid="cancel-viewing-button"]');
    await page.fill('[data-testid="cancellation-reason"]', 'Customer requested cancellation');
    await page.click('[data-testid="confirm-cancellation-button"]');

    // Step 5: Verify cancellation
    await expect(page.locator('[data-testid="viewing-status"]')).toContainText('cancelled');
    await expect(page.locator('[data-testid="cancellation-notification"]')).toBeVisible();

    // Step 6: Verify cancellation message sent
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('cancelled');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('sorry');
  });

  test('should handle multiple viewing requests workflow', async ({ page }) => {
    // Step 1: Customer requests multiple viewings
    const multipleViewings = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_multiple_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I would like to see both the villa and apartment. Can I schedule viewings for both?',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', multipleViewings);

    // Step 2: AI responds with options
    const timeSelection = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_multiple_002',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Yes, I want to see the villa on Saturday 2 PM and the apartment on Sunday 3 PM',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', timeSelection);

    // Step 3: Verify multiple viewings in portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="viewing-item"]')).toHaveCount(2);

    // Step 4: Verify viewing details
    const viewingItems = page.locator('[data-testid="viewing-item"]');
    await expect(viewingItems.first()).toContainText('E2E Test Villa');
    await expect(viewingItems.first()).toContainText('Saturday 2 PM');
    await expect(viewingItems.last()).toContainText('E2E Test Apartment');
    await expect(viewingItems.last()).toContainText('Sunday 3 PM');

    // Step 5: Confirm both viewings
    await viewingItems.first().click();
    await page.click('[data-testid="confirm-viewing-button"]');
    await page.click('[data-testid="send-confirmation-button"]');

    await page.goto('/schedule');
    await viewingItems.last().click();
    await page.click('[data-testid="confirm-viewing-button"]');
    await page.click('[data-testid="send-confirmation-button"]');

    // Step 6: Verify both viewings confirmed
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="viewing-status"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="viewing-status"]').filter({ hasText: 'confirmed' })).toHaveCount(2);
  });

  test('should handle viewing reminder workflow', async ({ page }) => {
    // Step 1: Create viewing scheduled for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const upcomingViewing = await e2ePrisma.scheduledViewing.create({
      data: {
        conversationId: 'test-conversation-id',
        propertyId: 'test-property-id',
        agentId: 'test-agent-id',
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        scheduledTime: tomorrow,
        status: 'confirmed',
        notes: 'Upcoming viewing',
        reminderSent: false,
      },
    });

    // Step 2: Check reminder system in portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="upcoming-viewings"]')).toBeVisible();
    await expect(page.locator('[data-testid="reminder-pending"]')).toBeVisible();

    // Step 3: Send reminder manually
    await page.click('[data-testid="viewing-item"]');
    await page.click('[data-testid="send-reminder-button"]');
    await page.fill('[data-testid="reminder-message"]', 'Reminder: Your property viewing is scheduled for tomorrow at 2 PM');
    await page.click('[data-testid="send-reminder-confirm"]');

    // Step 4: Verify reminder sent
    await expect(page.locator('[data-testid="reminder-sent"]')).toBeVisible();
    await expect(page.locator('[data-testid="reminder-status"]')).toContainText('sent');

    // Step 5: Check conversation for reminder message
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('reminder');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('tomorrow');
  });

  test('should handle viewing completion workflow', async ({ page }) => {
    // Step 1: Create completed viewing
    const completedViewing = await e2ePrisma.scheduledViewing.create({
      data: {
        conversationId: 'test-conversation-id',
        propertyId: 'test-property-id',
        agentId: 'test-agent-id',
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        scheduledTime: new Date('2024-12-20T14:00:00Z'),
        status: 'completed',
        notes: 'Viewing completed successfully',
      },
    });

    // Step 2: Verify completed viewing in portal
    await page.goto('/schedule');
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    await expect(page.locator('[data-testid="viewing-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="viewing-status"]')).toContainText('completed');

    // Step 3: Add follow-up notes
    await page.click('[data-testid="viewing-item"]');
    await page.click('[data-testid="add-followup-button"]');
    await page.fill('[data-testid="followup-notes"]', 'Customer was very interested. Follow up in 2 days.');
    await page.selectOption('[data-testid="followup-priority"]', 'high');
    await page.click('[data-testid="save-followup-button"]');

    // Step 4: Verify follow-up added
    await expect(page.locator('[data-testid="followup-added"]')).toBeVisible();
    await expect(page.locator('[data-testid="followup-notes"]')).toContainText('Customer was very interested');
    await expect(page.locator('[data-testid="followup-priority"]')).toContainText('high');

    // Step 5: Schedule follow-up task
    await page.click('[data-testid="schedule-followup-button"]');
    await page.fill('[data-testid="followup-date"]', '2024-12-22');
    await page.fill('[data-testid="followup-time"]', '10:00');
    await page.click('[data-testid="create-followup-task"]');

    // Step 6: Verify follow-up task created
    await expect(page.locator('[data-testid="followup-task-created"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-date"]')).toContainText('2024-12-22');
    await expect(page.locator('[data-testid="task-time"]')).toContainText('10:00');
  });

  test('should handle calendar integration workflow', async ({ page }) => {
    // Step 1: Navigate to calendar view
    await page.goto('/schedule/calendar');
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();

    // Step 2: Create viewing from calendar
    await page.click('[data-testid="calendar-date"]', { position: { x: 100, y: 100 } });
    await page.click('[data-testid="add-viewing-button"]');

    // Step 3: Fill viewing form
    await page.fill('[data-testid="customer-phone-input"]', '+1111111111');
    await page.fill('[data-testid="customer-name-input"]', 'Calendar Test Customer');
    await page.selectOption('[data-testid="property-select"]', 'E2E Test Villa');
    await page.fill('[data-testid="viewing-time-input"]', '15:00');
    await page.fill('[data-testid="viewing-notes"]', 'Calendar created viewing');
    await page.click('[data-testid="create-viewing-button"]');

    // Step 4: Verify viewing created on calendar
    await expect(page.locator('[data-testid="calendar-viewing"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-viewing"]')).toContainText('Calendar Test Customer');
    await expect(page.locator('[data-testid="calendar-viewing"]')).toContainText('E2E Test Villa');

    // Step 5: Edit viewing from calendar
    await page.click('[data-testid="calendar-viewing"]');
    await page.click('[data-testid="edit-viewing-button"]');
    await page.fill('[data-testid="viewing-time-input"]', '16:00');
    await page.click('[data-testid="save-viewing-button"]');

    // Step 6: Verify viewing updated
    await expect(page.locator('[data-testid="calendar-viewing"]')).toContainText('16:00');
    await expect(page.locator('[data-testid="viewing-updated"]')).toBeVisible();

    // Step 7: Export calendar
    await page.click('[data-testid="export-calendar-button"]');
    await page.selectOption('[data-testid="export-format-select"]', 'ics');
    await page.click('[data-testid="download-calendar-button"]');

    // Step 8: Verify calendar export
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.ics');
  });

  test('should handle viewing conflict resolution workflow', async ({ page }) => {
    // Step 1: Create conflicting viewing
    const conflictingTime = new Date('2024-12-28T14:00:00Z');
    
    const existingViewing = await e2ePrisma.scheduledViewing.create({
      data: {
        conversationId: 'test-conversation-id-1',
        propertyId: 'test-property-id',
        agentId: 'test-agent-id',
        customerPhone: '+1111111111',
        customerName: 'Existing Customer',
        scheduledTime: conflictingTime,
        status: 'confirmed',
        notes: 'Existing viewing',
      },
    });

    // Step 2: Try to schedule conflicting viewing
    const conflictRequest = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_conflict_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I want to schedule a viewing for Saturday at 2 PM',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', conflictRequest);

    // Step 3: Verify conflict detection in portal
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="scheduling-conflict"]')).toBeVisible();
    await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('Time slot unavailable');

    // Step 4: Resolve conflict with alternative time
    await page.click('[data-testid="resolve-conflict-button"]');
    await page.selectOption('[data-testid="alternative-time-select"]', '2024-12-28T16:00:00');
    await page.click('[data-testid="propose-alternative-button"]');

    // Step 5: Verify alternative proposed
    await expect(page.locator('[data-testid="alternative-proposed"]')).toBeVisible();
    await expect(page.locator('[data-testid="alternative-time"]')).toContainText('4 PM');

    // Step 6: Customer accepts alternative
    const acceptAlternative = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_accept_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Yes, 4 PM works for me',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', acceptAlternative);

    // Step 7: Verify conflict resolved
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="viewing-item"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible();
  });
});
