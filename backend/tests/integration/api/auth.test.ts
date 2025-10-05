import request from 'supertest';
import express from 'express';
import { testPrisma } from '../setup';
import authRoutes from '../../../src/api/routes/auth.routes';
import { errorHandler } from '../../../src/api/middleware/error.middleware';
import { jwtService } from '../../../src/services/auth/jwt.service';
import bcrypt from 'bcrypt';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new agent successfully', async () => {
      const agentData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test Agent',
        phoneNumber: '+1234567890',
        companyName: 'Test Company',
        whatsappNumber: '+0987654321',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(agentData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Agent registered successfully');
      expect(response.body).toHaveProperty('agent');
      expect(response.body.agent.email).toBe(agentData.email);
      expect(response.body.agent.fullName).toBe(agentData.fullName);
      expect(response.body.agent).not.toHaveProperty('password');

      // Verify agent was created in database
      const createdAgent = await testPrisma.agent.findUnique({
        where: { email: agentData.email },
      });
      expect(createdAgent).toBeTruthy();
      expect(createdAgent?.email).toBe(agentData.email);
      expect(createdAgent?.fullName).toBe(agentData.fullName);
    });

    it('should reject registration with invalid email', async () => {
      const agentData = {
        email: 'invalid-email',
        password: 'password123',
        fullName: 'Test Agent',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(agentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const agentData = {
        email: 'test2@example.com',
        password: '123',
        fullName: 'Test Agent',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(agentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first agent
      const agentData = {
        email: 'duplicate@example.com',
        password: 'password123',
        fullName: 'First Agent',
      };

      await request(app)
        .post('/api/auth/register')
        .send(agentData)
        .expect(201);

      // Try to create second agent with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(agentData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testAgent: any;

    beforeEach(async () => {
      // Create test agent
      const hashedPassword = await bcrypt.hash('password123', 10);
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'login@example.com',
          passwordHash: hashedPassword,
          fullName: 'Login Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('agent');
      expect(response.body.agent.email).toBe(loginData.email);
      expect(response.body.agent).not.toHaveProperty('passwordHash');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let testAgent: any;
    let refreshToken: string;

    beforeEach(async () => {
      // Create test agent
      const hashedPassword = await bcrypt.hash('password123', 10);
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'refresh@example.com',
          passwordHash: hashedPassword,
          fullName: 'Refresh Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      // Generate refresh token
      const tokens = await jwtService.generateTokens(
        testAgent.id,
        testAgent.email
      );
      refreshToken = tokens.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.accessToken).not.toBe(refreshToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject refresh with missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testAgent: any;

    beforeEach(async () => {
      // Create test agent
      const hashedPassword = await bcrypt.hash('password123', 10);
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'forgot@example.com',
          passwordHash: hashedPassword,
          fullName: 'Forgot Password Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });
    });

    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should not reveal if email exists or not', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset email sent');
    });

    it('should reject request with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let testAgent: any;
    let resetToken: string;

    beforeEach(async () => {
      // Create test agent
      const hashedPassword = await bcrypt.hash('password123', 10);
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'reset@example.com',
          passwordHash: hashedPassword,
          fullName: 'Reset Password Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      // Generate reset token
      resetToken = await jwtService.generatePasswordResetToken(
        testAgent.id,
        testAgent.email
      );
    });

    it('should reset password successfully with valid token', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Password reset successfully');

      // Verify password was changed
      const updatedAgent = await testPrisma.agent.findUnique({
        where: { id: testAgent.id },
      });
      const isNewPasswordValid = await bcrypt.compare(
        'newpassword123',
        updatedAgent!.passwordHash
      );
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject reset with invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'newpassword123',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid or expired reset token');
    });

    it('should reject reset with weak password', async () => {
      const resetData = {
        token: resetToken,
        newPassword: '123',
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject reset with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
