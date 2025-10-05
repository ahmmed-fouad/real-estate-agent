import { testPrisma } from '../setup';
import bcrypt from 'bcrypt';

describe('Database Models Integration Tests', () => {
  describe('Agent Model', () => {
    it('should create and retrieve agent successfully', async () => {
      const agentData = {
        email: 'db-test@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        fullName: 'Database Test Agent',
        phoneNumber: '+1234567890',
        companyName: 'Test Company',
        whatsappNumber: '+0987654321',
        status: 'active',
      };

      // Create agent
      const createdAgent = await testPrisma.agent.create({
        data: agentData,
      });

      expect(createdAgent).toBeTruthy();
      expect(createdAgent.email).toBe(agentData.email);
      expect(createdAgent.fullName).toBe(agentData.fullName);
      expect(createdAgent.status).toBe('active');
      expect(createdAgent.createdAt).toBeInstanceOf(Date);
      expect(createdAgent.updatedAt).toBeInstanceOf(Date);

      // Retrieve agent
      const retrievedAgent = await testPrisma.agent.findUnique({
        where: { id: createdAgent.id },
      });

      expect(retrievedAgent).toBeTruthy();
      expect(retrievedAgent?.email).toBe(agentData.email);
      expect(retrievedAgent?.fullName).toBe(agentData.fullName);
    });

    it('should enforce unique email constraint', async () => {
      const agentData = {
        email: 'unique@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        fullName: 'Unique Agent',
        phoneNumber: '+1234567890',
        companyName: 'Test Company',
        whatsappNumber: '+0987654321',
      };

      // Create first agent
      await testPrisma.agent.create({
        data: agentData,
      });

      // Try to create second agent with same email
      await expect(
        testPrisma.agent.create({
          data: agentData,
        })
      ).rejects.toThrow();
    });

    it('should update agent successfully', async () => {
      const agent = await testPrisma.agent.create({
        data: {
          email: 'update-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Update Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      const updateData = {
        fullName: 'Updated Agent Name',
        phoneNumber: '+0987654321',
        companyName: 'Updated Company',
      };

      const updatedAgent = await testPrisma.agent.update({
        where: { id: agent.id },
        data: updateData,
      });

      expect(updatedAgent.fullName).toBe(updateData.fullName);
      expect(updatedAgent.phoneNumber).toBe(updateData.phoneNumber);
      expect(updatedAgent.companyName).toBe(updateData.companyName);
      expect(updatedAgent.updatedAt.getTime()).toBeGreaterThan(agent.updatedAt.getTime());
    });

    it('should delete agent successfully', async () => {
      const agent = await testPrisma.agent.create({
        data: {
          email: 'delete-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Delete Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      await testPrisma.agent.delete({
        where: { id: agent.id },
      });

      const deletedAgent = await testPrisma.agent.findUnique({
        where: { id: agent.id },
      });

      expect(deletedAgent).toBeNull();
    });
  });

  describe('Property Model', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'property-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Property Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });
    });

    it('should create and retrieve property successfully', async () => {
      const propertyData = {
        agentId: testAgent.id,
        projectName: 'Test Property Project',
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
        deliveryDate: new Date('2024-12-31'),
        status: 'available',
      };

      // Create property
      const createdProperty = await testPrisma.property.create({
        data: propertyData,
      });

      expect(createdProperty).toBeTruthy();
      expect(createdProperty.projectName).toBe(propertyData.projectName);
      expect(createdProperty.agentId).toBe(testAgent.id);
      expect(createdProperty.basePrice).toBe(propertyData.basePrice);
      expect(createdProperty.amenities).toEqual(propertyData.amenities);
      expect(createdProperty.createdAt).toBeInstanceOf(Date);
      expect(createdProperty.updatedAt).toBeInstanceOf(Date);

      // Retrieve property with agent
      const retrievedProperty = await testPrisma.property.findUnique({
        where: { id: createdProperty.id },
        include: { agent: true },
      });

      expect(retrievedProperty).toBeTruthy();
      expect(retrievedProperty?.agent.email).toBe(testAgent.email);
      expect(retrievedProperty?.projectName).toBe(propertyData.projectName);
    });

    it('should cascade delete properties when agent is deleted', async () => {
      // Create property
      const property = await testPrisma.property.create({
        data: {
          agentId: testAgent.id,
          projectName: 'Cascade Test Property',
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

      // Delete agent
      await testPrisma.agent.delete({
        where: { id: testAgent.id },
      });

      // Property should be deleted due to cascade
      const deletedProperty = await testPrisma.property.findUnique({
        where: { id: property.id },
      });

      expect(deletedProperty).toBeNull();
    });

    it('should support property search with full-text search', async () => {
      // Create properties with different names
      await testPrisma.property.createMany({
        data: [
          {
            agentId: testAgent.id,
            projectName: 'Luxury Villa in New Cairo',
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
            projectName: 'Modern Apartment in Maadi',
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
            projectName: 'Beach Villa in North Coast',
            propertyType: 'villa',
            city: 'Alexandria',
            district: 'North Coast',
            basePrice: 8000000,
            pricePerMeter: 26667,
            area: 300,
            bedrooms: 5,
            bathrooms: 4,
            status: 'available',
          },
        ],
      });

      // Search for properties containing "Villa"
      const villaProperties = await testPrisma.property.findMany({
        where: {
          agentId: testAgent.id,
          OR: [
            { projectName: { contains: 'Villa', mode: 'insensitive' } },
            { description: { contains: 'Villa', mode: 'insensitive' } },
          ],
        },
      });

      expect(villaProperties).toHaveLength(2);
      villaProperties.forEach(property => {
        expect(property.projectName).toContain('Villa');
      });

      // Search for properties in Cairo
      const cairoProperties = await testPrisma.property.findMany({
        where: {
          agentId: testAgent.id,
          city: 'Cairo',
        },
      });

      expect(cairoProperties).toHaveLength(2);
      cairoProperties.forEach(property => {
        expect(property.city).toBe('Cairo');
      });
    });
  });

  describe('Conversation Model', () => {
    let testAgent: any;

    beforeEach(async () => {
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'conversation-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Conversation Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });
    });

    it('should create and retrieve conversation successfully', async () => {
      const conversationData = {
        agentId: testAgent.id,
        customerPhone: '+1234567890',
        customerName: 'Test Customer',
        status: 'active',
        leadScore: 75,
        leadQuality: 'hot',
        metadata: {
          budget: 3000000,
          location: 'New Cairo',
          propertyType: 'villa',
        },
      };

      // Create conversation
      const createdConversation = await testPrisma.conversation.create({
        data: conversationData,
      });

      expect(createdConversation).toBeTruthy();
      expect(createdConversation.customerPhone).toBe(conversationData.customerPhone);
      expect(createdConversation.agentId).toBe(testAgent.id);
      expect(createdConversation.leadScore).toBe(75);
      expect(createdConversation.leadQuality).toBe('hot');
      expect(createdConversation.metadata).toEqual(conversationData.metadata);
      expect(createdConversation.startedAt).toBeInstanceOf(Date);
      expect(createdConversation.lastActivityAt).toBeInstanceOf(Date);

      // Retrieve conversation with agent
      const retrievedConversation = await testPrisma.conversation.findUnique({
        where: { id: createdConversation.id },
        include: { agent: true },
      });

      expect(retrievedConversation).toBeTruthy();
      expect(retrievedConversation?.agent.email).toBe(testAgent.email);
      expect(retrievedConversation?.customerPhone).toBe(conversationData.customerPhone);
    });

    it('should create and retrieve messages successfully', async () => {
      // Create conversation
      const conversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Test Customer',
          status: 'active',
        },
      });

      // Create messages
      const messages = [
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'Hello, I need help finding a property',
          messageType: 'text',
          whatsappMessageId: 'msg_001',
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Hello! I would be happy to help you find the perfect property. What type of property are you looking for?',
          messageType: 'text',
          whatsappMessageId: 'msg_002',
        },
        {
          conversationId: conversation.id,
          role: 'user',
          content: 'I am looking for a villa in New Cairo with 4 bedrooms',
          messageType: 'text',
          whatsappMessageId: 'msg_003',
          intent: 'PROPERTY_INQUIRY',
          entities: {
            propertyType: 'villa',
            location: 'New Cairo',
            bedrooms: 4,
          },
        },
      ];

      const createdMessages = await testPrisma.message.createMany({
        data: messages,
      });

      expect(createdMessages.count).toBe(3);

      // Retrieve messages with conversation
      const retrievedMessages = await testPrisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        include: { conversation: true },
      });

      expect(retrievedMessages).toHaveLength(3);
      expect(retrievedMessages[0].role).toBe('user');
      expect(retrievedMessages[1].role).toBe('assistant');
      expect(retrievedMessages[2].role).toBe('user');
      expect(retrievedMessages[2].intent).toBe('PROPERTY_INQUIRY');
      expect(retrievedMessages[2].entities).toEqual({
        propertyType: 'villa',
        location: 'New Cairo',
        bedrooms: 4,
      });

      // Verify conversation relationship
      retrievedMessages.forEach(message => {
        expect(message.conversation.id).toBe(conversation.id);
        expect(message.conversation.agentId).toBe(testAgent.id);
      });
    });

    it('should cascade delete messages when conversation is deleted', async () => {
      // Create conversation
      const conversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Test Customer',
          status: 'active',
        },
      });

      // Create messages
      await testPrisma.message.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: 'Test message 1',
            messageType: 'text',
          },
          {
            conversationId: conversation.id,
            role: 'assistant',
            content: 'Test response 1',
            messageType: 'text',
          },
        ],
      });

      // Delete conversation
      await testPrisma.conversation.delete({
        where: { id: conversation.id },
      });

      // Messages should be deleted due to cascade
      const deletedMessages = await testPrisma.message.findMany({
        where: { conversationId: conversation.id },
      });

      expect(deletedMessages).toHaveLength(0);
    });
  });

  describe('ScheduledViewing Model', () => {
    let testAgent: any;
    let testProperty: any;
    let testConversation: any;

    beforeEach(async () => {
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'viewing-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Viewing Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      testProperty = await testPrisma.property.create({
        data: {
          agentId: testAgent.id,
          projectName: 'Viewing Test Property',
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

      testConversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Viewing Test Customer',
          status: 'active',
        },
      });
    });

    it('should create and retrieve scheduled viewing successfully', async () => {
      const viewingData = {
        conversationId: testConversation.id,
        propertyId: testProperty.id,
        agentId: testAgent.id,
        customerPhone: '+1234567890',
        customerName: 'Viewing Test Customer',
        scheduledTime: new Date('2024-12-25T10:00:00Z'),
        status: 'scheduled',
        notes: 'Customer is very interested in this property',
      };

      // Create scheduled viewing
      const createdViewing = await testPrisma.scheduledViewing.create({
        data: viewingData,
      });

      expect(createdViewing).toBeTruthy();
      expect(createdViewing.customerPhone).toBe(viewingData.customerPhone);
      expect(createdViewing.scheduledTime).toEqual(viewingData.scheduledTime);
      expect(createdViewing.status).toBe('scheduled');
      expect(createdViewing.notes).toBe(viewingData.notes);
      expect(createdViewing.reminderSent).toBe(false);

      // Retrieve viewing with relations
      const retrievedViewing = await testPrisma.scheduledViewing.findUnique({
        where: { id: createdViewing.id },
        include: {
          conversation: true,
          property: true,
          agent: true,
        },
      });

      expect(retrievedViewing).toBeTruthy();
      expect(retrievedViewing?.conversation.id).toBe(testConversation.id);
      expect(retrievedViewing?.property.id).toBe(testProperty.id);
      expect(retrievedViewing?.agent.id).toBe(testAgent.id);
    });

    it('should update viewing status successfully', async () => {
      const viewing = await testPrisma.scheduledViewing.create({
        data: {
          conversationId: testConversation.id,
          propertyId: testProperty.id,
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Viewing Test Customer',
          scheduledTime: new Date('2024-12-25T10:00:00Z'),
          status: 'scheduled',
        },
      });

      // Update status to confirmed
      const updatedViewing = await testPrisma.scheduledViewing.update({
        where: { id: viewing.id },
        data: { status: 'confirmed' },
      });

      expect(updatedViewing.status).toBe('confirmed');
      expect(updatedViewing.updatedAt.getTime()).toBeGreaterThan(viewing.updatedAt.getTime());
    });
  });

  describe('AnalyticsEvent Model', () => {
    let testAgent: any;
    let testConversation: any;

    beforeEach(async () => {
      testAgent = await testPrisma.agent.create({
        data: {
          email: 'analytics-test@example.com',
          passwordHash: await bcrypt.hash('password123', 10),
          fullName: 'Analytics Test Agent',
          phoneNumber: '+1234567890',
          companyName: 'Test Company',
          whatsappNumber: '+0987654321',
        },
      });

      testConversation = await testPrisma.conversation.create({
        data: {
          agentId: testAgent.id,
          customerPhone: '+1234567890',
          customerName: 'Analytics Test Customer',
          status: 'active',
        },
      });
    });

    it('should create and retrieve analytics events successfully', async () => {
      const eventData = {
        agentId: testAgent.id,
        conversationId: testConversation.id,
        eventType: 'conversation_started',
        eventData: {
          customerPhone: '+1234567890',
          initialMessage: 'Hello, I need help',
          timestamp: new Date().toISOString(),
        },
      };

      // Create analytics event
      const createdEvent = await testPrisma.analyticsEvent.create({
        data: eventData,
      });

      expect(createdEvent).toBeTruthy();
      expect(createdEvent.eventType).toBe('conversation_started');
      expect(createdEvent.eventData).toEqual(eventData.eventData);
      expect(createdEvent.createdAt).toBeInstanceOf(Date);

      // Retrieve event with relations
      const retrievedEvent = await testPrisma.analyticsEvent.findUnique({
        where: { id: createdEvent.id },
        include: {
          agent: true,
          conversation: true,
        },
      });

      expect(retrievedEvent).toBeTruthy();
      expect(retrievedEvent?.agent?.id).toBe(testAgent.id);
      expect(retrievedEvent?.conversation?.id).toBe(testConversation.id);
    });

    it('should query analytics events by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create events with different timestamps
      await testPrisma.analyticsEvent.createMany({
        data: [
          {
            agentId: testAgent.id,
            conversationId: testConversation.id,
            eventType: 'conversation_started',
            eventData: { timestamp: yesterday.toISOString() },
            createdAt: yesterday,
          },
          {
            agentId: testAgent.id,
            conversationId: testConversation.id,
            eventType: 'lead_qualified',
            eventData: { timestamp: now.toISOString() },
            createdAt: now,
          },
          {
            agentId: testAgent.id,
            conversationId: testConversation.id,
            eventType: 'viewing_scheduled',
            eventData: { timestamp: tomorrow.toISOString() },
            createdAt: tomorrow,
          },
        ],
      });

      // Query events from today onwards
      const todayEvents = await testPrisma.analyticsEvent.findMany({
        where: {
          agentId: testAgent.id,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(todayEvents).toHaveLength(2);
      expect(todayEvents[0].eventType).toBe('lead_qualified');
      expect(todayEvents[1].eventType).toBe('viewing_scheduled');
    });
  });
});
