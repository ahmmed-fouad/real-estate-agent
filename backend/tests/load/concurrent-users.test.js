/**
 * Concurrent Users Load Test
 * Tests system performance with multiple concurrent users
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      requests: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  // Make HTTP request
  async makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          const result = {
            statusCode: res.statusCode,
            duration,
            responseSize: responseData.length,
            timestamp: new Date().toISOString()
          };
          
          this.results.requests.push(result);
          
          if (res.statusCode >= 400) {
            this.results.errors.push({
              ...result,
              error: `HTTP ${res.statusCode}`,
              response: responseData
            });
          }
          
          resolve(result);
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.results.errors.push({
          statusCode: 0,
          duration,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // Test concurrent users
  async testConcurrentUsers(userCount, durationSeconds) {
    console.log(`Starting concurrent users test: ${userCount} users for ${durationSeconds} seconds`);
    
    this.results.startTime = performance.now();
    const endTime = this.results.startTime + (durationSeconds * 1000);
    
    const userPromises = [];
    
    for (let i = 0; i < userCount; i++) {
      const userPromise = this.simulateUser(i, endTime);
      userPromises.push(userPromise);
    }
    
    await Promise.all(userPromises);
    
    this.results.endTime = performance.now();
    this.generateReport();
  }

  // Simulate a single user
  async simulateUser(userId, endTime) {
    const userResults = {
      userId,
      requests: 0,
      errors: 0,
      totalDuration: 0
    };
    
    while (performance.now() < endTime) {
      try {
        // Simulate user actions
        const actions = [
          this.simulateWebhookMessage(userId),
          this.simulatePropertySearch(userId),
          this.simulateConversationAccess(userId)
        ];
        
        // Randomly select an action
        const action = actions[Math.floor(Math.random() * actions.length)];
        const result = await action;
        
        userResults.requests++;
        userResults.totalDuration += result.duration;
        
        if (result.statusCode >= 400) {
          userResults.errors++;
        }
        
        // Random delay between requests (1-5 seconds)
        const delay = Math.random() * 4000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        userResults.errors++;
        console.error(`User ${userId} error:`, error.message);
      }
    }
    
    return userResults;
  }

  // Simulate WhatsApp webhook message
  async simulateWebhookMessage(userId) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/webhooks/whatsapp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Twilio-Signature': `test-signature-${userId}-${Date.now()}`
      }
    };
    
    const data = {
      AccountSid: 'test-account-sid',
      MessageSid: `msg_${userId}_${Date.now()}`,
      From: `+123456789${userId}`,
      To: '+0987654321',
      Body: `Load test message from user ${userId}: I need help finding a property`,
      MessageType: 'text',
      Timestamp: new Date().toISOString()
    };
    
    return this.makeRequest(options, data);
  }

  // Simulate property search
  async simulatePropertySearch(userId) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/properties?search=villa&city=Cairo&propertyType=villa',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    };
    
    return this.makeRequest(options);
  }

  // Simulate conversation access
  async simulateConversationAccess(userId) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/conversations',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    };
    
    return this.makeRequest(options);
  }

  // Generate test report
  generateReport() {
    const totalDuration = this.results.endTime - this.results.startTime;
    const totalRequests = this.results.requests.length;
    const totalErrors = this.results.errors.length;
    
    if (totalRequests === 0) {
      console.log('No requests completed');
      return;
    }
    
    // Calculate metrics
    const durations = this.results.requests.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    
    // Calculate requests per second
    const rps = (totalRequests / totalDuration) * 1000;
    
    // Calculate error rate
    const errorRate = (totalErrors / totalRequests) * 100;
    
    console.log('\n=== LOAD TEST RESULTS ===');
    console.log(`Test Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Requests per Second: ${rps.toFixed(2)}`);
    console.log('\n=== RESPONSE TIME METRICS ===');
    console.log(`Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`Minimum: ${minDuration.toFixed(2)}ms`);
    console.log(`Maximum: ${maxDuration.toFixed(2)}ms`);
    console.log(`P50: ${p50.toFixed(2)}ms`);
    console.log(`P95: ${p95.toFixed(2)}ms`);
    console.log(`P99: ${p99.toFixed(2)}ms`);
    
    // Status code distribution
    const statusCodes = {};
    this.results.requests.forEach(req => {
      statusCodes[req.statusCode] = (statusCodes[req.statusCode] || 0) + 1;
    });
    
    console.log('\n=== STATUS CODE DISTRIBUTION ===');
    Object.entries(statusCodes).forEach(([code, count]) => {
      console.log(`${code}: ${count} (${((count / totalRequests) * 100).toFixed(1)}%)`);
    });
    
    // Error details
    if (totalErrors > 0) {
      console.log('\n=== ERROR DETAILS ===');
      this.results.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error.error} - ${error.duration.toFixed(2)}ms`);
      });
    }
    
    // Performance assessment
    console.log('\n=== PERFORMANCE ASSESSMENT ===');
    if (avgDuration < 1000) {
      console.log('✅ Excellent: Average response time < 1s');
    } else if (avgDuration < 3000) {
      console.log('⚠️  Good: Average response time < 3s');
    } else if (avgDuration < 5000) {
      console.log('⚠️  Acceptable: Average response time < 5s');
    } else {
      console.log('❌ Poor: Average response time > 5s');
    }
    
    if (errorRate < 1) {
      console.log('✅ Excellent: Error rate < 1%');
    } else if (errorRate < 5) {
      console.log('⚠️  Good: Error rate < 5%');
    } else {
      console.log('❌ Poor: Error rate > 5%');
    }
    
    if (rps > 50) {
      console.log('✅ Excellent: Throughput > 50 RPS');
    } else if (rps > 20) {
      console.log('⚠️  Good: Throughput > 20 RPS');
    } else {
      console.log('❌ Poor: Throughput < 20 RPS');
    }
  }
}

// Export for use in other tests
module.exports = LoadTester;

// Run test if called directly
if (require.main === module) {
  const tester = new LoadTester();
  
  // Test scenarios
  const scenarios = [
    { users: 5, duration: 30, name: 'Light Load' },
    { users: 10, duration: 60, name: 'Medium Load' },
    { users: 20, duration: 120, name: 'Heavy Load' },
    { users: 50, duration: 60, name: 'Stress Test' }
  ];
  
  async function runAllTests() {
    for (const scenario of scenarios) {
      console.log(`\n🚀 Running ${scenario.name}: ${scenario.users} users for ${scenario.duration} seconds`);
      await tester.testConcurrentUsers(scenario.users, scenario.duration);
      
      // Reset results for next test
      tester.results = {
        requests: [],
        errors: [],
        startTime: null,
        endTime: null
      };
      
      // Wait between tests
      console.log('Waiting 10 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  runAllTests().catch(console.error);
}
