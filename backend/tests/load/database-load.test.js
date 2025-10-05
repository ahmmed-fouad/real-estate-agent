/**
 * Database Load Test
 * Tests database performance under various load conditions
 */

const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const bcrypt = require('bcrypt');

class DatabaseLoadTester {
  constructor() {
    this.prisma = new PrismaClient();
    this.results = {
      operations: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  // Initialize test data
  async initializeTestData() {
    console.log('Initializing test data...');
    
    // Create test agents
    const agents = [];
    for (let i = 0; i < 10; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const agent = await this.prisma.agent.create({
        data: {
          email: `load-test-agent-${i}@example.com`,
          passwordHash: hashedPassword,
          fullName: `Load Test Agent ${i}`,
          phoneNumber: `+123456789${i}`,
          companyName: `Load Test Company ${i}`,
          whatsappNumber: `+098765432${i}`,
        },
      });
      agents.push(agent);
    }
    
    // Create test properties
    const properties = [];
    for (let i = 0; i < 100; i++) {
      const property = await this.prisma.property.create({
        data: {
          agentId: agents[i % 10].id,
          projectName: `Load Test Property ${i}`,
          propertyType: ['villa', 'apartment', 'townhouse'][i % 3],
          city: ['Cairo', 'Alexandria', 'Giza'][i % 3],
          district: `District ${i % 10}`,
          basePrice: 2000000 + (i * 100000),
          pricePerMeter: 15000 + (i * 100),
          area: 100 + (i * 10),
          bedrooms: 2 + (i % 4),
          bathrooms: 1 + (i % 3),
          status: 'available',
          description: `Load test property ${i} description`,
          amenities: ['Swimming Pool', 'Garden', 'Parking'],
        },
      });
      properties.push(property);
    }
    
    console.log(`Created ${agents.length} agents and ${properties.length} properties`);
    return { agents, properties };
  }

  // Clean up test data
  async cleanupTestData() {
    console.log('Cleaning up test data...');
    
    await this.prisma.analyticsEvent.deleteMany({
      where: {
        agent: {
          email: {
            contains: 'load-test-agent'
          }
        }
      }
    });
    
    await this.prisma.scheduledViewing.deleteMany({
      where: {
        agent: {
          email: {
            contains: 'load-test-agent'
          }
        }
      }
    });
    
    await this.prisma.message.deleteMany({
      where: {
        conversation: {
          agent: {
            email: {
              contains: 'load-test-agent'
            }
          }
        }
      }
    });
    
    await this.prisma.conversation.deleteMany({
      where: {
        agent: {
          email: {
            contains: 'load-test-agent'
          }
        }
      }
    });
    
    await this.prisma.property.deleteMany({
      where: {
        agent: {
          email: {
            contains: 'load-test-agent'
          }
        }
      }
    });
    
    await this.prisma.agent.deleteMany({
      where: {
        email: {
          contains: 'load-test-agent'
        }
      }
    });
    
    console.log('Test data cleaned up');
  }

  // Test concurrent database operations
  async testConcurrentOperations(operationCount, concurrency) {
    console.log(`Testing ${operationCount} operations with concurrency ${concurrency}`);
    
    this.results.startTime = performance.now();
    
    const operationPromises = [];
    const operationsPerWorker = Math.ceil(operationCount / concurrency);
    
    for (let worker = 0; worker < concurrency; worker++) {
      const workerPromise = this.runDatabaseWorker(worker, operationsPerWorker);
      operationPromises.push(workerPromise);
    }
    
    await Promise.all(operationPromises);
    
    this.results.endTime = performance.now();
    this.generateDatabaseReport();
  }

  // Run database operations in a worker
  async runDatabaseWorker(workerId, operationCount) {
    const workerResults = {
      workerId,
      operations: 0,
      errors: 0,
      totalDuration: 0
    };
    
    for (let i = 0; i < operationCount; i++) {
      try {
        const operationId = workerId * operationCount + i;
        const operation = this.getRandomDatabaseOperation();
        const result = await this.executeDatabaseOperation(operation, operationId);
        
        workerResults.operations++;
        workerResults.totalDuration += result.duration;
        
        this.results.operations.push(result);
        
      } catch (error) {
        workerResults.errors++;
        this.results.errors.push({
          workerId,
          operationId: workerId * operationCount + i,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return workerResults;
  }

  // Get random database operation
  getRandomDatabaseOperation() {
    const operations = [
      'createConversation',
      'createMessage',
      'queryProperties',
      'queryConversations',
      'updateProperty',
      'searchProperties',
      'createAnalyticsEvent',
      'queryAnalytics'
    ];
    
    return operations[Math.floor(Math.random() * operations.length)];
  }

  // Execute database operation
  async executeDatabaseOperation(operation, operationId) {
    const startTime = performance.now();
    
    try {
      let result;
      
      switch (operation) {
        case 'createConversation':
          result = await this.createTestConversation(operationId);
          break;
        case 'createMessage':
          result = await this.createTestMessage(operationId);
          break;
        case 'queryProperties':
          result = await this.queryProperties(operationId);
          break;
        case 'queryConversations':
          result = await this.queryConversations(operationId);
          break;
        case 'updateProperty':
          result = await this.updateTestProperty(operationId);
          break;
        case 'searchProperties':
          result = await this.searchProperties(operationId);
          break;
        case 'createAnalyticsEvent':
          result = await this.createTestAnalyticsEvent(operationId);
          break;
        case 'queryAnalytics':
          result = await this.queryAnalytics(operationId);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation,
        operationId,
        duration,
        success: true,
        resultCount: Array.isArray(result) ? result.length : 1,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      return {
        operation,
        operationId,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Database operation implementations
  async createTestConversation(operationId) {
    const agents = await this.prisma.agent.findMany({
      where: { email: { contains: 'load-test-agent' } },
      take: 1
    });
    
    if (agents.length === 0) {
      throw new Error('No test agents found');
    }
    
    return this.prisma.conversation.create({
      data: {
        agentId: agents[0].id,
        customerPhone: `+123456789${operationId % 10}`,
        customerName: `Load Test Customer ${operationId}`,
        status: 'active',
        leadScore: Math.floor(Math.random() * 100),
        leadQuality: ['hot', 'warm', 'cold'][Math.floor(Math.random() * 3)],
        metadata: {
          budget: 2000000 + (operationId * 100000),
          location: 'Cairo',
          propertyType: 'villa'
        }
      }
    });
  }

  async createTestMessage(operationId) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 1
    });
    
    if (conversations.length === 0) {
      throw new Error('No test conversations found');
    }
    
    return this.prisma.message.create({
      data: {
        conversationId: conversations[0].id,
        role: 'user',
        content: `Load test message ${operationId}`,
        messageType: 'text',
        whatsappMessageId: `msg_load_${operationId}`,
        intent: 'PROPERTY_INQUIRY',
        entities: {
          propertyType: 'villa',
          location: 'Cairo'
        }
      }
    });
  }

  async queryProperties(operationId) {
    return this.prisma.property.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 10,
      include: {
        agent: true
      }
    });
  }

  async queryConversations(operationId) {
    return this.prisma.conversation.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 10,
      include: {
        agent: true,
        messages: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async updateTestProperty(operationId) {
    const properties = await this.prisma.property.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 1
    });
    
    if (properties.length === 0) {
      throw new Error('No test properties found');
    }
    
    return this.prisma.property.update({
      where: { id: properties[0].id },
      data: {
        basePrice: properties[0].basePrice + 10000,
        updatedAt: new Date()
      }
    });
  }

  async searchProperties(operationId) {
    const searchTerms = ['villa', 'apartment', 'Cairo', 'Alexandria'];
    const searchTerm = searchTerms[operationId % searchTerms.length];
    
    return this.prisma.property.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } },
        OR: [
          { projectName: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { propertyType: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: 20
    });
  }

  async createTestAnalyticsEvent(operationId) {
    const agents = await this.prisma.agent.findMany({
      where: { email: { contains: 'load-test-agent' } },
      take: 1
    });
    
    const conversations = await this.prisma.conversation.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 1
    });
    
    if (agents.length === 0 || conversations.length === 0) {
      throw new Error('No test data found');
    }
    
    return this.prisma.analyticsEvent.create({
      data: {
        agentId: agents[0].id,
        conversationId: conversations[0].id,
        eventType: 'conversation_started',
        eventData: {
          operationId,
          timestamp: new Date().toISOString(),
          testData: true
        }
      }
    });
  }

  async queryAnalytics(operationId) {
    return this.prisma.analyticsEvent.findMany({
      where: {
        agent: { email: { contains: 'load-test-agent' } }
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
        conversation: true
      }
    });
  }

  // Generate database-specific report
  generateDatabaseReport() {
    const totalDuration = this.results.endTime - this.results.startTime;
    const totalOperations = this.results.operations.length;
    const totalErrors = this.results.errors.length;
    
    if (totalOperations === 0) {
      console.log('No database operations completed');
      return;
    }
    
    // Calculate metrics
    const durations = this.results.operations.map(op => op.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    
    // Calculate operations per second
    const ops = (totalOperations / totalDuration) * 1000;
    
    // Calculate error rate
    const errorRate = (totalErrors / totalOperations) * 100;
    
    console.log('\n=== DATABASE LOAD TEST RESULTS ===');
    console.log(`Test Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
    console.log(`Total Operations: ${totalOperations}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Operations per Second: ${ops.toFixed(2)}`);
    console.log('\n=== RESPONSE TIME METRICS ===');
    console.log(`Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`Minimum: ${minDuration.toFixed(2)}ms`);
    console.log(`Maximum: ${maxDuration.toFixed(2)}ms`);
    console.log(`P50: ${p50.toFixed(2)}ms`);
    console.log(`P95: ${p95.toFixed(2)}ms`);
    console.log(`P99: ${p99.toFixed(2)}ms`);
    
    // Operation type distribution
    const operationTypes = {};
    this.results.operations.forEach(op => {
      operationTypes[op.operation] = (operationTypes[op.operation] || 0) + 1;
    });
    
    console.log('\n=== OPERATION TYPE DISTRIBUTION ===');
    Object.entries(operationTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count} (${((count / totalOperations) * 100).toFixed(1)}%)`);
    });
    
    // Performance by operation type
    console.log('\n=== PERFORMANCE BY OPERATION TYPE ===');
    Object.keys(operationTypes).forEach(operationType => {
      const typeOperations = this.results.operations.filter(op => op.operation === operationType);
      const typeDurations = typeOperations.map(op => op.duration);
      const typeAvgDuration = typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length;
      const typeErrors = typeOperations.filter(op => !op.success).length;
      const typeErrorRate = (typeErrors / typeOperations.length) * 100;
      
      console.log(`${operationType}:`);
      console.log(`  Average: ${typeAvgDuration.toFixed(2)}ms`);
      console.log(`  Error Rate: ${typeErrorRate.toFixed(2)}%`);
    });
    
    // Performance assessment for database
    console.log('\n=== DATABASE PERFORMANCE ASSESSMENT ===');
    if (avgDuration < 100) {
      console.log('✅ Excellent: Database operations < 100ms');
    } else if (avgDuration < 500) {
      console.log('⚠️  Good: Database operations < 500ms');
    } else if (avgDuration < 1000) {
      console.log('⚠️  Acceptable: Database operations < 1s');
    } else {
      console.log('❌ Poor: Database operations > 1s');
    }
    
    if (errorRate < 0.1) {
      console.log('✅ Excellent: Database error rate < 0.1%');
    } else if (errorRate < 1) {
      console.log('⚠️  Good: Database error rate < 1%');
    } else {
      console.log('❌ Poor: Database error rate > 1%');
    }
    
    if (ops > 100) {
      console.log('✅ Excellent: Database throughput > 100 OPS');
    } else if (ops > 50) {
      console.log('⚠️  Good: Database throughput > 50 OPS');
    } else {
      console.log('❌ Poor: Database throughput < 50 OPS');
    }
  }

  // Close database connection
  async close() {
    await this.prisma.$disconnect();
  }
}

// Export for use in other tests
module.exports = DatabaseLoadTester;

// Run test if called directly
if (require.main === module) {
  const tester = new DatabaseLoadTester();
  
  async function runDatabaseTests() {
    try {
      // Initialize test data
      await tester.initializeTestData();
      
      // Test scenarios
      const scenarios = [
        { operations: 100, concurrency: 5, name: 'Light Database Load' },
        { operations: 500, concurrency: 10, name: 'Medium Database Load' },
        { operations: 1000, concurrency: 20, name: 'Heavy Database Load' },
        { operations: 2000, concurrency: 50, name: 'Database Stress Test' }
      ];
      
      for (const scenario of scenarios) {
        console.log(`\n🚀 Running ${scenario.name}: ${scenario.operations} operations with ${scenario.concurrency} concurrent workers`);
        await tester.testConcurrentOperations(scenario.operations, scenario.concurrency);
        
        // Reset results for next test
        tester.results = {
          operations: [],
          errors: [],
          startTime: null,
          endTime: null
        };
        
        // Wait between tests
        console.log('Waiting 10 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
    } catch (error) {
      console.error('Database load test error:', error);
    } finally {
      // Clean up test data
      await tester.cleanupTestData();
      await tester.close();
    }
  }
  
  runDatabaseTests().catch(console.error);
}
