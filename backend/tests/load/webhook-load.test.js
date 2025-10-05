/**
 * WhatsApp Webhook Load Test
 * Tests webhook handling performance under high message volume
 */

const http = require('http');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class WebhookLoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = {
      webhooks: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  // Generate webhook signature
  generateWebhookSignature(payload, secret = 'test-secret') {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // Make webhook request
  async makeWebhookRequest(payload) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const payloadString = JSON.stringify(payload);
      const signature = this.generateWebhookSignature(payloadString);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/webhooks/whatsapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Twilio-Signature': signature
        }
      };
      
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
            messageId: payload.MessageSid,
            timestamp: new Date().toISOString()
          };
          
          this.results.webhooks.push(result);
          
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
          messageId: payload.MessageSid,
          timestamp: new Date().toISOString()
        });
        
        reject(error);
      });
      
      req.write(payloadString);
      req.end();
    });
  }

  // Test webhook handling under load
  async testWebhookLoad(messagesPerSecond, durationSeconds) {
    console.log(`Starting webhook load test: ${messagesPerSecond} messages/second for ${durationSeconds} seconds`);
    
    this.results.startTime = performance.now();
    const endTime = this.results.startTime + (durationSeconds * 1000);
    const intervalMs = 1000 / messagesPerSecond; // Time between messages
    
    const messagePromises = [];
    let messageCount = 0;
    
    while (performance.now() < endTime) {
      const messagePromise = this.sendWebhookMessage(messageCount++);
      messagePromises.push(messagePromise);
      
      // Wait for next message
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    // Wait for all messages to complete
    await Promise.allSettled(messagePromises);
    
    this.results.endTime = performance.now();
    this.generateWebhookReport();
  }

  // Send a single webhook message
  async sendWebhookMessage(messageId) {
    const messageTypes = ['text', 'image', 'location'];
    const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    
    const basePayload = {
      AccountSid: 'test-account-sid',
      MessageSid: `msg_load_${messageId}_${Date.now()}`,
      From: `+123456789${messageId % 10}`,
      To: '+0987654321',
      MessageType: messageType,
      Timestamp: new Date().toISOString()
    };
    
    // Add type-specific fields
    switch (messageType) {
      case 'text':
        basePayload.Body = `Load test message ${messageId}: I need help finding a property in Cairo`;
        break;
      case 'image':
        basePayload.MediaUrl0 = 'https://example.com/property-image.jpg';
        basePayload.MediaContentType0 = 'image/jpeg';
        basePayload.Caption = `Property image ${messageId}`;
        basePayload.Body = '';
        break;
      case 'location':
        basePayload.Latitude = '30.0444';
        basePayload.Longitude = '31.2357';
        basePayload.Body = '';
        break;
    }
    
    return this.makeWebhookRequest(basePayload);
  }

  // Test webhook burst handling
  async testWebhookBurst(burstSize, burstCount, intervalSeconds = 5) {
    console.log(`Starting webhook burst test: ${burstSize} messages in ${burstCount} bursts, ${intervalSeconds}s intervals`);
    
    this.results.startTime = performance.now();
    
    for (let burst = 0; burst < burstCount; burst++) {
      console.log(`Sending burst ${burst + 1}/${burstCount}...`);
      
      const burstPromises = [];
      for (let i = 0; i < burstSize; i++) {
        const messageId = burst * burstSize + i;
        const messagePromise = this.sendWebhookMessage(messageId);
        burstPromises.push(messagePromise);
      }
      
      // Wait for burst to complete
      await Promise.allSettled(burstPromises);
      
      // Wait before next burst (except for last burst)
      if (burst < burstCount - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
      }
    }
    
    this.results.endTime = performance.now();
    this.generateWebhookReport();
  }

  // Test webhook with different message types
  async testMessageTypeLoad() {
    console.log('Testing webhook load with different message types...');
    
    const messageTypes = [
      { type: 'text', weight: 70 },
      { type: 'image', weight: 20 },
      { type: 'location', weight: 10 }
    ];
    
    this.results.startTime = performance.now();
    const testDuration = 60; // 1 minute
    const endTime = this.results.startTime + (testDuration * 1000);
    
    const messagePromises = [];
    let messageCount = 0;
    
    while (performance.now() < endTime) {
      // Select message type based on weight
      const random = Math.random() * 100;
      let selectedType = messageTypes[0].type;
      let cumulativeWeight = 0;
      
      for (const msgType of messageTypes) {
        cumulativeWeight += msgType.weight;
        if (random <= cumulativeWeight) {
          selectedType = msgType.type;
          break;
        }
      }
      
      const messagePromise = this.sendTypedWebhookMessage(messageCount++, selectedType);
      messagePromises.push(messagePromise);
      
      // Random delay between messages (0.1-2 seconds)
      const delay = Math.random() * 1900 + 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    await Promise.allSettled(messagePromises);
    
    this.results.endTime = performance.now();
    this.generateWebhookReport();
  }

  // Send typed webhook message
  async sendTypedWebhookMessage(messageId, messageType) {
    const basePayload = {
      AccountSid: 'test-account-sid',
      MessageSid: `msg_${messageType}_${messageId}_${Date.now()}`,
      From: `+123456789${messageId % 10}`,
      To: '+0987654321',
      MessageType: messageType,
      Timestamp: new Date().toISOString()
    };
    
    switch (messageType) {
      case 'text':
        basePayload.Body = `Text message ${messageId}: Looking for a villa in New Cairo`;
        break;
      case 'image':
        basePayload.MediaUrl0 = 'https://example.com/property-image.jpg';
        basePayload.MediaContentType0 = 'image/jpeg';
        basePayload.Caption = `Property image ${messageId}`;
        basePayload.Body = '';
        break;
      case 'location':
        basePayload.Latitude = (30.0444 + Math.random() * 0.1).toFixed(4);
        basePayload.Longitude = (31.2357 + Math.random() * 0.1).toFixed(4);
        basePayload.Body = '';
        break;
    }
    
    return this.makeWebhookRequest(basePayload);
  }

  // Generate webhook-specific report
  generateWebhookReport() {
    const totalDuration = this.results.endTime - this.results.startTime;
    const totalWebhooks = this.results.webhooks.length;
    const totalErrors = this.results.errors.length;
    
    if (totalWebhooks === 0) {
      console.log('No webhooks processed');
      return;
    }
    
    // Calculate metrics
    const durations = this.results.webhooks.map(w => w.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    
    // Calculate webhooks per second
    const wps = (totalWebhooks / totalDuration) * 1000;
    
    // Calculate error rate
    const errorRate = (totalErrors / totalWebhooks) * 100;
    
    console.log('\n=== WEBHOOK LOAD TEST RESULTS ===');
    console.log(`Test Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
    console.log(`Total Webhooks: ${totalWebhooks}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Webhooks per Second: ${wps.toFixed(2)}`);
    console.log('\n=== RESPONSE TIME METRICS ===');
    console.log(`Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`Minimum: ${minDuration.toFixed(2)}ms`);
    console.log(`Maximum: ${maxDuration.toFixed(2)}ms`);
    console.log(`P50: ${p50.toFixed(2)}ms`);
    console.log(`P95: ${p95.toFixed(2)}ms`);
    console.log(`P99: ${p99.toFixed(2)}ms`);
    
    // Message type distribution
    const messageTypes = {};
    this.results.webhooks.forEach(webhook => {
      const messageId = webhook.messageId;
      let type = 'unknown';
      if (messageId.includes('text')) type = 'text';
      else if (messageId.includes('image')) type = 'image';
      else if (messageId.includes('location')) type = 'location';
      
      messageTypes[type] = (messageTypes[type] || 0) + 1;
    });
    
    console.log('\n=== MESSAGE TYPE DISTRIBUTION ===');
    Object.entries(messageTypes).forEach(([type, count]) => {
      console.log(`${type}: ${count} (${((count / totalWebhooks) * 100).toFixed(1)}%)`);
    });
    
    // Performance assessment for webhooks
    console.log('\n=== WEBHOOK PERFORMANCE ASSESSMENT ===');
    if (avgDuration < 500) {
      console.log('✅ Excellent: Webhook processing < 500ms');
    } else if (avgDuration < 1000) {
      console.log('⚠️  Good: Webhook processing < 1s');
    } else if (avgDuration < 2000) {
      console.log('⚠️  Acceptable: Webhook processing < 2s');
    } else {
      console.log('❌ Poor: Webhook processing > 2s');
    }
    
    if (errorRate < 0.1) {
      console.log('✅ Excellent: Webhook error rate < 0.1%');
    } else if (errorRate < 1) {
      console.log('⚠️  Good: Webhook error rate < 1%');
    } else {
      console.log('❌ Poor: Webhook error rate > 1%');
    }
    
    if (wps > 100) {
      console.log('✅ Excellent: Webhook throughput > 100 WPS');
    } else if (wps > 50) {
      console.log('⚠️  Good: Webhook throughput > 50 WPS');
    } else {
      console.log('❌ Poor: Webhook throughput < 50 WPS');
    }
  }
}

// Export for use in other tests
module.exports = WebhookLoadTester;

// Run test if called directly
if (require.main === module) {
  const tester = new WebhookLoadTester();
  
  // Test scenarios
  const scenarios = [
    { rate: 5, duration: 30, name: 'Light Webhook Load' },
    { rate: 10, duration: 60, name: 'Medium Webhook Load' },
    { rate: 20, duration: 120, name: 'Heavy Webhook Load' },
    { rate: 50, duration: 60, name: 'Webhook Stress Test' }
  ];
  
  async function runWebhookTests() {
    for (const scenario of scenarios) {
      console.log(`\n🚀 Running ${scenario.name}: ${scenario.rate} webhooks/second for ${scenario.duration} seconds`);
      await tester.testWebhookLoad(scenario.rate, scenario.duration);
      
      // Reset results for next test
      tester.results = {
        webhooks: [],
        errors: [],
        startTime: null,
        endTime: null
      };
      
      // Wait between tests
      console.log('Waiting 10 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Test burst handling
    console.log('\n🚀 Running Webhook Burst Test');
    await tester.testWebhookBurst(50, 5, 10);
    
    // Reset and test message types
    tester.results = {
      webhooks: [],
      errors: [],
      startTime: null,
      endTime: null
    };
    
    console.log('\n🚀 Running Message Type Load Test');
    await tester.testMessageTypeLoad();
  }
  
  runWebhookTests().catch(console.error);
}
