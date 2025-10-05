import request from 'supertest';
import express from 'express';
import { testPrisma } from '../setup';
import propertyRoutes from '../../../src/api/routes/property.routes';
import { authenticate } from '../../../src/api/middleware/auth.middleware';
import { errorHandler } from '../../../src/api/middleware/error.middleware';
import { jwtService } from '../../../src/services/auth/jwt.service';
import bcrypt from 'bcrypt';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/properties', authenticate, propertyRoutes);
app.use(errorHandler);

describe('Properties API Integration Tests', () => {
  let testAgent: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test agent
    const hashedPassword = await bcrypt.hash('password123', 10);
    testAgent = await testPrisma.agent.create({
      data: {
        email: 'properties@example.com',
        passwordHash: hashedPassword,
        fullName: 'Properties Test Agent',
        phoneNumber: '+1234567890',
        companyName: 'Test Company',
        whatsappNumber: '+0987654321',
      },
    });

    // Generate auth token
    const tokens = await jwtService.generateTokens(
      testAgent.id,
      testAgent.email
    );
    authToken = tokens.accessToken;
  });

  describe('POST /api/properties', () => {
    it('should create a new property successfully', async () => {
      const propertyData = {
        projectName: 'Test Villa Project',
        developerName: 'Test Developer',
        propertyType: 'villa',
        city: 'Cairo',
        district: 'New Cairo',
        address: '123 Test Street',
        latitude: 30.0444,
        longitude: 31.2357,
        area: 200.5,
        bedrooms: 4,
        bathrooms: 3,
        floors: 2,
        basePrice: 5000000,
        pricePerMeter: 25000,
        currency: 'EGP',
        amenities: ['Swimming Pool', 'Garden', 'Parking'],
        description: 'Beautiful villa in New Cairo',
        deliveryDate: '2024-12-31',
        status: 'available',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Property created successfully');
      expect(response.body).toHaveProperty('property');
      expect(response.body.property.projectName).toBe(propertyData.projectName);
      expect(response.body.property.agentId).toBe(testAgent.id);
      expect(response.body.property.basePrice).toBe(propertyData.basePrice);

      // Verify property was created in database
      const createdProperty = await testPrisma.property.findFirst({
        where: { projectName: propertyData.projectName },
      });
      expect(createdProperty).toBeTruthy();
      expect(createdProperty?.agentId).toBe(testAgent.id);
      expect(createdProperty?.basePrice).toBe(propertyData.basePrice);
    });

    it('should reject property creation with missing required fields', async () => {
      const propertyData = {
        projectName: 'Incomplete Property',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject property creation without authentication', async () => {
      const propertyData = {
        projectName: 'Unauthorized Property',
        propertyType: 'apartment',
        basePrice: 2000000,
      };

      const response = await request(app)
        .post('/api/properties')
        .send(propertyData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject property creation with invalid property type', async () => {
      const propertyData = {
        projectName: 'Invalid Type Property',
        propertyType: 'invalid-type',
        basePrice: 2000000,
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/properties', () => {
    beforeEach(async () => {
      // Create test properties
      await testPrisma.property.createMany({
        data: [
          {
            agentId: testAgent.id,
            projectName: 'Villa Project 1',
            propertyType: 'villa',
            city: 'Cairo',
            district: 'New Cairo',
            basePrice: 5000000,
            pricePerMeter: 25000,
            area: 200,
            bedrooms: 4,
            bathrooms: 3,
            status: 'available',
          },
          {
            agentId: testAgent.id,
            projectName: 'Apartment Project 1',
            propertyType: 'apartment',
            city: 'Cairo',
            district: 'Maadi',
            basePrice: 2000000,
            pricePerMeter: 16667,
            area: 120,
            bedrooms: 3,
            bathrooms: 2,
            status: 'available',
          },
          {
            agentId: testAgent.id,
            projectName: 'Villa Project 2',
            propertyType: 'villa',
            city: 'Alexandria',
            district: 'North Coast',
            basePrice: 8000000,
            pricePerMeter: 26667,
            area: 300,
            bedrooms: 5,
            bathrooms: 4,
            status: 'sold',
          },
        ],
      });
    });

    it('should list all properties for authenticated agent', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('properties');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.properties).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
    });

    it('should filter properties by type', async () => {
      const response = await request(app)
        .get('/api/properties?propertyType=villa')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.properties).toHaveLength(2);
      response.body.properties.forEach((property: any) => {
        expect(property.propertyType).toBe('villa');
      });
    });

    it('should filter properties by city', async () => {
      const response = await request(app)
        .get('/api/properties?city=Cairo')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.properties).toHaveLength(2);
      response.body.properties.forEach((property: any) => {
        expect(property.city).toBe('Cairo');
      });
    });

    it('should filter properties by status', async () => {
      const response = await request(app)
        .get('/api/properties?status=available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.properties).toHaveLength(2);
      response.body.properties.forEach((property: any) => {
        expect(property.status).toBe('available');
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/properties?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.properties).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });

    it('should search properties by project name', async () => {
      const response = await request(app)
        .get('/api/properties?search=Villa')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.properties).toHaveLength(2);
      response.body.properties.forEach((property: any) => {
        expect(property.projectName).toContain('Villa');
      });
    });
  });

  describe('GET /api/properties/:id', () => {
    let testProperty: any;

    beforeEach(async () => {
      testProperty = await testPrisma.property.create({
        data: {
          agentId: testAgent.id,
          projectName: 'Test Property Details',
          propertyType: 'villa',
          city: 'Cairo',
          district: 'New Cairo',
          basePrice: 5000000,
          pricePerMeter: 25000,
          area: 200,
          bedrooms: 4,
          bathrooms: 3,
          status: 'available',
        },
      });
    });

    it('should get property details successfully', async () => {
      const response = await request(app)
        .get(`/api/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('property');
      expect(response.body.property.id).toBe(testProperty.id);
      expect(response.body.property.projectName).toBe('Test Property Details');
      expect(response.body.property.agentId).toBe(testAgent.id);
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .get('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Property not found');
    });

    it('should return 403 for property owned by different agent', async () => {
      // Create another agent
      const otherAgent = await testPrisma.agent.create({
        data: {
          email: 'other@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Other Agent',
          phoneNumber: '+1234567890',
          companyName: 'Other Company',
          whatsappNumber: '+0987654321',
        },
      });

      // Create property for other agent
      const otherProperty = await testPrisma.property.create({
        data: {
          agentId: otherAgent.id,
          projectName: 'Other Agent Property',
          propertyType: 'apartment',
          city: 'Cairo',
          district: 'Maadi',
          basePrice: 2000000,
          pricePerMeter: 20000,
          area: 100,
          bedrooms: 2,
          bathrooms: 1,
          status: 'available',
        },
      });

      const response = await request(app)
        .get(`/api/properties/${otherProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });

  describe('PUT /api/properties/:id', () => {
    let testProperty: any;

    beforeEach(async () => {
      testProperty = await testPrisma.property.create({
        data: {
          agentId: testAgent.id,
          projectName: 'Property to Update',
          propertyType: 'villa',
          city: 'Cairo',
          district: 'New Cairo',
          basePrice: 5000000,
          pricePerMeter: 25000,
          area: 200,
          bedrooms: 4,
          bathrooms: 3,
          status: 'available',
        },
      });
    });

    it('should update property successfully', async () => {
      const updateData = {
        projectName: 'Updated Property Name',
        basePrice: 6000000,
        area: 250,
        bedrooms: 5,
      };

      const response = await request(app)
        .put(`/api/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Property updated successfully');
      expect(response.body).toHaveProperty('property');
      expect(response.body.property.projectName).toBe(updateData.projectName);
      expect(response.body.property.basePrice).toBe(updateData.basePrice);

      // Verify property was updated in database
      const updatedProperty = await testPrisma.property.findUnique({
        where: { id: testProperty.id },
      });
      expect(updatedProperty?.projectName).toBe(updateData.projectName);
      expect(updatedProperty?.basePrice).toBe(updateData.basePrice);
    });

    it('should return 404 for non-existent property', async () => {
      const updateData = {
        projectName: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Property not found');
    });

    it('should return 403 for property owned by different agent', async () => {
      // Create another agent and property
      const otherAgent = await testPrisma.agent.create({
        data: {
          email: 'other2@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Other Agent 2',
          phoneNumber: '+1234567890',
          companyName: 'Other Company',
          whatsappNumber: '+0987654321',
        },
      });

      const otherProperty = await testPrisma.property.create({
        data: {
          agentId: otherAgent.id,
          projectName: 'Other Property',
          propertyType: 'apartment',
          city: 'Cairo',
          district: 'Maadi',
          basePrice: 2000000,
          pricePerMeter: 20000,
          area: 100,
          bedrooms: 2,
          bathrooms: 1,
          status: 'available',
        },
      });

      const updateData = {
        projectName: 'Hacked Name',
      };

      const response = await request(app)
        .put(`/api/properties/${otherProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    let testProperty: any;

    beforeEach(async () => {
      testProperty = await testPrisma.property.create({
        data: {
          agentId: testAgent.id,
          projectName: 'Property to Delete',
          propertyType: 'villa',
          city: 'Cairo',
          district: 'New Cairo',
          basePrice: 5000000,
          pricePerMeter: 25000,
          area: 200,
          bedrooms: 4,
          bathrooms: 3,
          status: 'available',
        },
      });
    });

    it('should delete property successfully', async () => {
      const response = await request(app)
        .delete(`/api/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Property deleted successfully');

      // Verify property was deleted from database
      const deletedProperty = await testPrisma.property.findUnique({
        where: { id: testProperty.id },
      });
      expect(deletedProperty).toBeNull();
    });

    it('should return 404 for non-existent property', async () => {
      const response = await request(app)
        .delete('/api/properties/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Property not found');
    });

    it('should return 403 for property owned by different agent', async () => {
      // Create another agent and property
      const otherAgent = await testPrisma.agent.create({
        data: {
          email: 'other3@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Other Agent 3',
          phoneNumber: '+1234567890',
          companyName: 'Other Company',
          whatsappNumber: '+0987654321',
        },
      });

      const otherProperty = await testPrisma.property.create({
        data: {
          agentId: otherAgent.id,
          projectName: 'Other Property to Delete',
          propertyType: 'apartment',
          city: 'Cairo',
          district: 'Maadi',
          basePrice: 2000000,
          pricePerMeter: 20000,
          area: 100,
          bedrooms: 2,
          bathrooms: 1,
          status: 'available',
        },
      });

      const response = await request(app)
        .delete(`/api/properties/${otherProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });
});
