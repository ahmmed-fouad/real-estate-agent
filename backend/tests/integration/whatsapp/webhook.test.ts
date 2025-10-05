import request from 'supertest';
import express from 'express';
import { testPrisma } from '../setup';
import webhookRoutes from '../../../src/api/routes/webhook.routes';
import { errorHandler } from '../../../src/api/middleware/error.middleware';
import { verifyWebhookSignature } from '../../../src/utils/crypto';
import crypto from 'crypto';

// Mock the crypto utility
jest.mock('../../../src/utils/crypto', () => ({
  verifyWebhookSignature: jest.fn(),
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/webhooks', webhookRoutes);
app.use(errorHandler);

describe('WhatsApp Webhook Integration Tests', () => {
  let testAgent: any;

  beforeEach(async () => {
    // Create test agent
    const bcrypt = require('bcrypt');
    testAgent = await testPrisma.agent.create({
      data: {
        email: 'webhook-test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        fullName: 'Webhook Test Agent',
        phoneNumber: '+1234567890',
        companyName: 'Test Company',
        whatsappNumber: '+0987654321',
      },
    });

    // Mock webhook signature verification to return true
    (verifyWebhookSignature as jest.Mock).mockReturnValue(true);
  });

  describe('POST /webhooks/whatsapp', () => {
    it('should handle incoming text message webhook', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_123456789',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'Hello, I need help finding a property',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify conversation was created
      const conversation = await testPrisma.conversation.findFirst({
        where: { customerPhone: '+1234567890' },
        include: { messages: true },
      });

      expect(conversation).toBeTruthy();
      expect(conversation?.customerPhone).toBe('+1234567890');
      expect(conversation?.status).toBe('active');
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0].content).toBe('Hello, I need help finding a property');
      expect(conversation?.messages[0].role).toBe('user');
    });

    it('should handle incoming media message webhook', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_987654321',
        From: '+1234567890',
        To: '+0987654321',
        MediaUrl0: 'https://example.com/image.jpg',
        MediaContentType0: 'image/jpeg',
        Caption: 'Check out this property',
        MessageType: 'image',
        Timestamp: new Date().toISOString(),
        Body: '',
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify conversation and message were created
      const conversation = await testPrisma.conversation.findFirst({
        where: { customerPhone: '+1234567890' },
        include: { messages: true },
      });

      expect(conversation).toBeTruthy();
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0].messageType).toBe('image');
      expect(conversation?.messages[0].content).toBe('Check out this property');
    });

    it('should handle incoming location message webhook', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_location_123',
        From: '+1234567890',
        To: '+0987654321',
        Latitude: '30.0444',
        Longitude: '31.2357',
        MessageType: 'location',
        Timestamp: new Date().toISOString(),
        Body: '',
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify conversation and message were created
      const conversation = await testPrisma.conversation.findFirst({
        where: { customerPhone: '+1234567890' },
        include: { messages: true },
      });

      expect(conversation).toBeTruthy();
      expect(conversation?.messages).toHaveLength(1);
      expect(conversation?.messages[0].messageType).toBe('location');
    });

    it('should continue existing conversation', async () => {
      // Create existing conversation
      const existingConversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Existing Customer',
          status: 'active',
        },
      });

      // Add existing message
      await testPrisma.message.create({
        data: {
          conversationId: existingConversation.id,
          role: 'user',
          content: 'First message',
          messageType: 'text',
        },
      });

      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_continue_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'This is a follow-up message',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify message was added to existing conversation
      const updatedConversation = await testPrisma.conversation.findUnique({
        where: { id: existingConversation.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      expect(updatedConversation?.messages).toHaveLength(2);
      expect(updatedConversation?.messages[1].content).toBe('This is a follow-up message');
      expect(updatedConversation?.lastActivityAt.getTime()).toBeGreaterThan(
        existingConversation.lastActivityAt.getTime()
      );
    });

    it('should reject webhook with invalid signature', async () => {
      // Mock webhook signature verification to return false
      (verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_invalid_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'This should be rejected',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid webhook signature');

      // Verify no conversation was created
      const conversation = await testPrisma.conversation.findFirst({
        where: { customerPhone: '+1234567890' },
      });

      expect(conversation).toBeNull();
    });

    it('should handle webhook verification challenge', async () => {
      const challengePayload = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'test-challenge-123',
        'hub.verify_token': 'test-verify-token',
      };

      const response = await request(app)
        .get('/webhooks/whatsapp')
        .query(challengePayload)
        .expect(200);

      expect(response.text).toBe('test-challenge-123');
    });

    it('should reject webhook verification with invalid token', async () => {
      const challengePayload = {
        'hub.mode': 'subscribe',
        'hub.challenge': 'test-challenge-123',
        'hub.verify_token': 'invalid-token',
      };

      const response = await request(app)
        .get('/webhooks/whatsapp')
        .query(challengePayload)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid verify token');
    });

    it('should handle webhook with missing required fields', async () => {
      const incompletePayload = {
        AccountSid: 'test-account-sid',
        // Missing required fields like MessageSid, From, To, etc.
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(incompletePayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle webhook for unknown agent', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_unknown_agent',
        From: '+1234567890',
        To: '+1111111111', // Unknown WhatsApp number
        Body: 'Message to unknown agent',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Agent not found for WhatsApp number');
    });

    it('should update conversation last activity timestamp', async () => {
      // Create existing conversation
      const existingConversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Activity Test Customer',
          status: 'active',
          lastActivityAt: new Date('2024-01-01T10:00:00Z'),
        },
      });

      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_activity_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'New activity message',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      // Verify last activity was updated
      const updatedConversation = await testPrisma.conversation.findUnique({
        where: { id: existingConversation.id },
      });

      expect(updatedConversation?.lastActivityAt.getTime()).toBeGreaterThan(
        existingConversation.lastActivityAt.getTime()
      );
    });

    it('should handle webhook with special characters in message', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_special_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'مرحبا! I need a villa in New Cairo for 3,000,000 EGP 🏠',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');

      // Verify message was stored correctly
      const conversation = await testPrisma.conversation.findFirst({
        where: { customerPhone: '+1234567890' },
        include: { messages: true },
      });

      expect(conversation?.messages[0].content).toBe('مرحبا! I need a villa in New Cairo for 3,000,000 EGP 🏠');
    });

    it('should handle webhook with empty message body', async () => {
      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_empty_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: '',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Webhook Security', () => {
    it('should verify webhook signature correctly', async () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Mock the verification to use actual crypto
      (verifyWebhookSignature as jest.Mock).mockImplementation((p, s, sec) => {
        const expectedSignature = crypto
          .createHmac('sha256', sec)
          .update(p)
          .digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(s),
          Buffer.from(expectedSignature)
        );
      });

      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_secure_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'Secure message',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .set('X-Twilio-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should reject webhook with tampered signature', async () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const tamperedSignature = 'tampered-signature';

      // Mock the verification to use actual crypto
      (verifyWebhookSignature as jest.Mock).mockImplementation((p, s, sec) => {
        const expectedSignature = crypto
          .createHmac('sha256', sec)
          .update(p)
          .digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(s),
          Buffer.from(expectedSignature)
        );
      });

      const webhookPayload = {
        AccountSid: 'test-account-sid',
        MessageSid: 'msg_tampered_123',
        From: '+1234567890',
        To: '+0987654321',
        Body: 'Tampered message',
        MessageType: 'text',
        Timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/webhooks/whatsapp')
        .set('X-Twilio-Signature', tamperedSignature)
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid webhook signature');
    });
  });
});
