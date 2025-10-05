/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation for Agent Portal Backend APIs
 * As per plan Task 3.1, Deliverable line 749: "API documentation (Swagger/OpenAPI)"
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WhatsApp AI Sales Agent - Agent Portal API',
      version: '1.0.0',
      description: `
        REST API for Real Estate WhatsApp AI Sales Agent Portal
        
        ## Features
        - JWT-based authentication
        - Agent management
        - Property management with RAG/Vector DB integration
        - Conversation management with AI takeover
        - Comprehensive analytics
        
        ## Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`\`\`
        Authorization: Bearer YOUR_JWT_TOKEN
        \`\`\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.APP_BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            message: {
              type: 'string',
              example: 'Detailed error description',
            },
          },
        },
        Agent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            phoneNumber: { type: 'string' },
            companyName: { type: 'string' },
            whatsappNumber: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' },
          },
        },
        Property: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            projectName: { type: 'string' },
            propertyType: { type: 'string' },
            city: { type: 'string' },
            district: { type: 'string' },
            area: { type: 'number' },
            bedrooms: { type: 'number' },
            bathrooms: { type: 'number' },
            basePrice: { type: 'number' },
            pricePerMeter: { type: 'number' },
            status: { type: 'string' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            status: { type: 'string' },
            leadQuality: { type: 'string' },
            leadScore: { type: 'number' },
            lastActivityAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Agent authentication endpoints (JWT-based)',
      },
      {
        name: 'Agent Management',
        description: 'Agent profile and settings management',
      },
      {
        name: 'Property Management',
        description: 'Property CRUD operations with RAG integration',
      },
      {
        name: 'Conversation Management',
        description: 'Conversation handling and agent takeover',
      },
      {
        name: 'Analytics',
        description: 'Dashboard statistics and reporting',
      },
      {
        name: 'Schedule',
        description: 'Viewing scheduling and calendar integration (Task 4.3)',
      },
    ],
  },
  // Path to API route files with JSDoc comments
  apis: [
    './src/api/routes/*.ts',
    './src/api/controllers/*.ts',
  ],
};

/**
 * Generate Swagger specification
 */
export const swaggerSpec = swaggerJsdoc(options);


