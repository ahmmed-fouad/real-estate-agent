import { test, expect } from '@playwright/test';
import { e2ePrisma, cleanupE2EData } from './e2e-setup';
import axios from 'axios';

// Use the authenticated state from setup
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test.describe('Complete Conversation Flow E2E Tests', () => {
  test.beforeEach(async () => {
    // Clean up any existing test conversations
    await e2ePrisma.conversation.deleteMany({
      where: {
        customerPhone: '+1234567890',
      },
    });
  });

  test('should handle complete property inquiry conversation flow', async ({ page }) => {
    // Step 1: Simulate WhatsApp webhook message
    const webhookPayload = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_property_inquiry_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'مرحبا! I need help finding a villa in New Cairo with 4 bedrooms under 5 million EGP',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    // Send webhook to backend
    const webhookResponse = await axios.post('http://localhost:3000/webhooks/whatsapp', webhookPayload);
    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.data.status).toBe('success');

    // Step 2: Verify conversation was created in agent portal
    await page.goto('/conversations');
    
    // Wait for conversation to appear
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
    
    // Verify conversation details
    await expect(page.locator('[data-testid="customer-phone"]')).toContainText('+1234567890');
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('active');
    await expect(page.locator('[data-testid="lead-score"]')).toBeVisible();

    // Step 3: Open conversation details
    await page.click('[data-testid="conversation-item"]');
    await expect(page.locator('[data-testid="conversation-details"]')).toBeVisible();

    // Step 4: Verify message history
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-message"]')).toContainText('مرحبا! I need help finding a villa');
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();

    // Step 5: Verify extracted information
    await expect(page.locator('[data-testid="extracted-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-type"]')).toContainText('villa');
    await expect(page.locator('[data-testid="location"]')).toContainText('New Cairo');
    await expect(page.locator('[data-testid="bedrooms"]')).toContainText('4');
    await expect(page.locator('[data-testid="budget"]')).toContainText('5,000,000');

    // Step 6: Verify AI response contains relevant properties
    const aiResponse = await page.locator('[data-testid="ai-response"]').textContent();
    expect(aiResponse).toContain('villa');
    expect(aiResponse).toContain('New Cairo');
    expect(aiResponse).toContain('4 bedrooms');
  });

  test('should handle property comparison conversation flow', async ({ page }) => {
    // Step 1: Initial inquiry
    const initialMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_comparison_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I want to compare villas and apartments in Cairo',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', initialMessage);

    // Step 2: Follow-up message for comparison
    const followUpMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_comparison_002',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Show me the differences between the villa and apartment options',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', followUpMessage);

    // Step 3: Verify conversation in portal
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');

    // Step 4: Verify comparison response
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('comparison');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('villa');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('apartment');

    // Step 5: Verify message history shows context
    const messages = await page.locator('[data-testid="message-list"]').count();
    expect(messages).toBeGreaterThanOrEqual(4); // 2 user messages + 2 AI responses
  });

  test('should handle scheduling inquiry conversation flow', async ({ page }) => {
    // Step 1: Property inquiry
    const propertyInquiry = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_scheduling_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I am interested in the E2E Test Villa. Can I schedule a viewing?',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', propertyInquiry);

    // Step 2: Scheduling request
    const schedulingRequest = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_scheduling_002',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Yes, I would like to visit this Saturday at 2 PM',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', schedulingRequest);

    // Step 3: Verify conversation and scheduling in portal
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');

    // Step 4: Verify scheduling response
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('scheduled');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('Saturday');
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('2 PM');

    // Step 5: Check scheduled viewings
    await page.goto('/schedule');
    await expect(page.locator('[data-testid="scheduled-viewings"]')).toBeVisible();
    await expect(page.locator('[data-testid="viewing-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="customer-name"]')).toContainText('+1234567890');
    await expect(page.locator('[data-testid="property-name"]')).toContainText('E2E Test Villa');
  });

  test('should handle agent takeover and manual response', async ({ page }) => {
    // Step 1: Create conversation with complex inquiry
    const complexInquiry = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_takeover_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I need a very specific custom villa with special requirements that the AI cannot handle',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', complexInquiry);

    // Step 2: Agent takes over conversation
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');
    await page.click('[data-testid="takeover-button"]');

    // Step 3: Verify takeover status
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('waiting_agent');
    await expect(page.locator('[data-testid="agent-control-panel"]')).toBeVisible();

    // Step 4: Agent sends manual response
    await page.fill('[data-testid="agent-message-input"]', 'Hello! I am taking over this conversation to help you with your specific requirements.');
    await page.click('[data-testid="send-agent-message"]');

    // Step 5: Verify manual message was sent
    await expect(page.locator('[data-testid="agent-message"]')).toContainText('I am taking over this conversation');
    await expect(page.locator('[data-testid="message-role"]').last()).toContainText('agent');

    // Step 6: Return control to AI
    await page.click('[data-testid="return-to-ai"]');
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('active');
  });

  test('should handle media message conversation flow', async ({ page }) => {
    // Step 1: Customer sends image
    const imageMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_media_001',
      From: '+1234567890',
      To: '+0987654321',
      MediaUrl0: 'https://example.com/property-image.jpg',
      MediaContentType0: 'image/jpeg',
      Caption: 'This is the property I am interested in',
      MessageType: 'image',
      Timestamp: new Date().toISOString(),
      Body: '',
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', imageMessage);

    // Step 2: Verify media message in portal
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');

    // Step 3: Verify media message display
    await expect(page.locator('[data-testid="media-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="media-caption"]')).toContainText('This is the property I am interested in');
    await expect(page.locator('[data-testid="media-image"]')).toBeVisible();

    // Step 4: AI responds to media
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('image');
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('property');
  });

  test('should handle location message conversation flow', async ({ page }) => {
    // Step 1: Customer sends location
    const locationMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_location_001',
      From: '+1234567890',
      To: '+0987654321',
      Latitude: '30.0444',
      Longitude: '31.2357',
      MessageType: 'location',
      Timestamp: new Date().toISOString(),
      Body: '',
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', locationMessage);

    // Step 2: Verify location message in portal
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');

    // Step 3: Verify location display
    await expect(page.locator('[data-testid="location-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-coordinates"]')).toContainText('30.0444');
    await expect(page.locator('[data-testid="location-coordinates"]')).toContainText('31.2357');

    // Step 4: AI responds with nearby properties
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('location');
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('nearby');
  });

  test('should handle conversation escalation flow', async ({ page }) => {
    // Step 1: Customer expresses frustration
    const frustratedMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_escalation_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'I am very frustrated! I need to speak to a human agent immediately!',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', frustratedMessage);

    // Step 2: Verify escalation in portal
    await page.goto('/conversations');
    await expect(page.locator('[data-testid="escalated-conversation"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalation-indicator"]')).toBeVisible();

    // Step 3: Verify notification
    await expect(page.locator('[data-testid="escalation-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalation-reason"]')).toContainText('frustration');

    // Step 4: Agent handles escalation
    await page.click('[data-testid="escalated-conversation"]');
    await page.click('[data-testid="handle-escalation"]');
    
    await page.fill('[data-testid="agent-message-input"]', 'I understand your frustration. Let me help you personally with your inquiry.');
    await page.click('[data-testid="send-agent-message"]');

    // Step 5: Verify escalation resolution
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('waiting_agent');
    await expect(page.locator('[data-testid="escalation-resolved"]')).toBeVisible();
  });

  test('should handle conversation closure flow', async ({ page }) => {
    // Step 1: Create conversation
    const initialMessage = {
      AccountSid: 'test-account-sid',
      MessageSid: 'msg_closure_001',
      From: '+1234567890',
      To: '+0987654321',
      Body: 'Thank you for your help. I will contact you later.',
      MessageType: 'text',
      Timestamp: new Date().toISOString(),
    };

    await axios.post('http://localhost:3000/webhooks/whatsapp', initialMessage);

    // Step 2: Agent closes conversation
    await page.goto('/conversations');
    await page.click('[data-testid="conversation-item"]');
    await page.click('[data-testid="close-conversation"]');

    // Step 3: Verify closure
    await expect(page.locator('[data-testid="conversation-status"]')).toContainText('closed');
    await expect(page.locator('[data-testid="closure-reason"]')).toBeVisible();

    // Step 4: Verify conversation appears in closed list
    await page.goto('/conversations?status=closed');
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
  });
});
