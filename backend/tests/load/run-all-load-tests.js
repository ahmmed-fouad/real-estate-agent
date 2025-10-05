/**
 * Comprehensive Load Test Runner
 * Runs all load tests and generates comprehensive performance report
 */

const LoadTester = require('./concurrent-users.test');
const WebhookLoadTester = require('./webhook-load.test');
const DatabaseLoadTester = require('./database-load.test');
const { performance } = require('perf_hooks');

class ComprehensiveLoadTester {
  constructor() {
    this.results = {
      concurrentUsers: null,
      webhookLoad: null,
      databaseLoad: null,
      overallStartTime: null,
      overallEndTime: null
    };
  }

  // Run all load tests
  async runAllLoadTests() {
    console.log('🚀 Starting Comprehensive Load Testing Suite');
    console.log('==========================================');
    
    this.results.overallStartTime = performance.now();
    
    try {
      // Test 1: Concurrent Users
      console.log('\n📊 Test 1: Concurrent Users Load Test');
      console.log('=====================================');
      const userTester = new LoadTester();
      await userTester.testConcurrentUsers(10, 60); // 10 users for 1 minute
      this.results.concurrentUsers = userTester.results;
      
      // Wait between tests
      console.log('\n⏳ Waiting 30 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Test 2: Webhook Load
      console.log('\n📊 Test 2: Webhook Load Test');
      console.log('============================');
      const webhookTester = new WebhookLoadTester();
      await webhookTester.testWebhookLoad(20, 60); // 20 webhooks/second for 1 minute
      this.results.webhookLoad = webhookTester.results;
      
      // Wait between tests
      console.log('\n⏳ Waiting 30 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Test 3: Database Load
      console.log('\n📊 Test 3: Database Load Test');
      console.log('=============================');
      const dbTester = new DatabaseLoadTester();
      await dbTester.initializeTestData();
      await dbTester.testConcurrentOperations(500, 20); // 500 operations with 20 concurrent workers
      this.results.databaseLoad = dbTester.results;
      await dbTester.cleanupTestData();
      await dbTester.close();
      
      this.results.overallEndTime = performance.now();
      
      // Generate comprehensive report
      this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Load testing failed:', error);
      throw error;
    }
  }

  // Generate comprehensive performance report
  generateComprehensiveReport() {
    const totalDuration = this.results.overallEndTime - this.results.overallStartTime;
    
    console.log('\n🎯 COMPREHENSIVE LOAD TEST REPORT');
    console.log('=================================');
    console.log(`Total Test Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`);
    
    // Concurrent Users Results
    if (this.results.concurrentUsers) {
      const userResults = this.results.concurrentUsers;
      const userRequests = userResults.requests.length;
      const userErrors = userResults.errors.length;
      const userAvgDuration = userRequests > 0 ? 
        userResults.requests.reduce((sum, req) => sum + req.duration, 0) / userRequests : 0;
      
      console.log('\n📊 CONCURRENT USERS TEST RESULTS');
      console.log(`Total Requests: ${userRequests}`);
      console.log(`Total Errors: ${userErrors}`);
      console.log(`Error Rate: ${userRequests > 0 ? ((userErrors / userRequests) * 100).toFixed(2) : 0}%`);
      console.log(`Average Response Time: ${userAvgDuration.toFixed(2)}ms`);
    }
    
    // Webhook Load Results
    if (this.results.webhookLoad) {
      const webhookResults = this.results.webhookLoad;
      const webhookCount = webhookResults.webhooks.length;
      const webhookErrors = webhookResults.errors.length;
      const webhookAvgDuration = webhookCount > 0 ? 
        webhookResults.webhooks.reduce((sum, webhook) => sum + webhook.duration, 0) / webhookCount : 0;
      
      console.log('\n📊 WEBHOOK LOAD TEST RESULTS');
      console.log(`Total Webhooks: ${webhookCount}`);
      console.log(`Total Errors: ${webhookErrors}`);
      console.log(`Error Rate: ${webhookCount > 0 ? ((webhookErrors / webhookCount) * 100).toFixed(2) : 0}%`);
      console.log(`Average Processing Time: ${webhookAvgDuration.toFixed(2)}ms`);
    }
    
    // Database Load Results
    if (this.results.databaseLoad) {
      const dbResults = this.results.databaseLoad;
      const dbOperations = dbResults.operations.length;
      const dbErrors = dbResults.errors.length;
      const dbAvgDuration = dbOperations > 0 ? 
        dbResults.operations.reduce((sum, op) => sum + op.duration, 0) / dbOperations : 0;
      
      console.log('\n📊 DATABASE LOAD TEST RESULTS');
      console.log(`Total Operations: ${dbOperations}`);
      console.log(`Total Errors: ${dbErrors}`);
      console.log(`Error Rate: ${dbOperations > 0 ? ((dbErrors / dbOperations) * 100).toFixed(2) : 0}%`);
      console.log(`Average Operation Time: ${dbAvgDuration.toFixed(2)}ms`);
    }
    
    // Overall Performance Assessment
    console.log('\n🎯 OVERALL PERFORMANCE ASSESSMENT');
    console.log('==================================');
    
    const assessments = [];
    
    // Assess concurrent users performance
    if (this.results.concurrentUsers) {
      const userResults = this.results.concurrentUsers;
      const userRequests = userResults.requests.length;
      const userErrors = userResults.errors.length;
      const userErrorRate = userRequests > 0 ? (userErrors / userRequests) * 100 : 0;
      const userAvgDuration = userRequests > 0 ? 
        userResults.requests.reduce((sum, req) => sum + req.duration, 0) / userRequests : 0;
      
      if (userErrorRate < 1 && userAvgDuration < 2000) {
        assessments.push('✅ Concurrent Users: EXCELLENT');
      } else if (userErrorRate < 5 && userAvgDuration < 5000) {
        assessments.push('⚠️  Concurrent Users: GOOD');
      } else {
        assessments.push('❌ Concurrent Users: NEEDS IMPROVEMENT');
      }
    }
    
    // Assess webhook performance
    if (this.results.webhookLoad) {
      const webhookResults = this.results.webhookLoad;
      const webhookCount = webhookResults.webhooks.length;
      const webhookErrors = webhookResults.errors.length;
      const webhookErrorRate = webhookCount > 0 ? (webhookErrors / webhookCount) * 100 : 0;
      const webhookAvgDuration = webhookCount > 0 ? 
        webhookResults.webhooks.reduce((sum, webhook) => sum + webhook.duration, 0) / webhookCount : 0;
      
      if (webhookErrorRate < 0.1 && webhookAvgDuration < 1000) {
        assessments.push('✅ Webhook Processing: EXCELLENT');
      } else if (webhookErrorRate < 1 && webhookAvgDuration < 2000) {
        assessments.push('⚠️  Webhook Processing: GOOD');
      } else {
        assessments.push('❌ Webhook Processing: NEEDS IMPROVEMENT');
      }
    }
    
    // Assess database performance
    if (this.results.databaseLoad) {
      const dbResults = this.results.databaseLoad;
      const dbOperations = dbResults.operations.length;
      const dbErrors = dbResults.errors.length;
      const dbErrorRate = dbOperations > 0 ? (dbErrors / dbOperations) * 100 : 0;
      const dbAvgDuration = dbOperations > 0 ? 
        dbResults.operations.reduce((sum, op) => sum + op.duration, 0) / dbOperations : 0;
      
      if (dbErrorRate < 0.1 && dbAvgDuration < 200) {
        assessments.push('✅ Database Performance: EXCELLENT');
      } else if (dbErrorRate < 1 && dbAvgDuration < 500) {
        assessments.push('⚠️  Database Performance: GOOD');
      } else {
        assessments.push('❌ Database Performance: NEEDS IMPROVEMENT');
      }
    }
    
    assessments.forEach(assessment => console.log(assessment));
    
    // Recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS');
    console.log('==============================');
    
    if (this.results.concurrentUsers) {
      const userResults = this.results.concurrentUsers;
      const userAvgDuration = userResults.requests.length > 0 ? 
        userResults.requests.reduce((sum, req) => sum + req.duration, 0) / userResults.requests.length : 0;
      
      if (userAvgDuration > 3000) {
        console.log('• Consider implementing response caching for API endpoints');
        console.log('• Optimize database queries and add proper indexing');
        console.log('• Consider using a CDN for static assets');
      }
    }
    
    if (this.results.webhookLoad) {
      const webhookResults = this.results.webhookLoad;
      const webhookAvgDuration = webhookResults.webhooks.length > 0 ? 
        webhookResults.webhooks.reduce((sum, webhook) => sum + webhook.duration, 0) / webhookResults.webhooks.length : 0;
      
      if (webhookAvgDuration > 1000) {
        console.log('• Implement webhook message queuing for better throughput');
        console.log('• Consider async processing for AI responses');
        console.log('• Optimize session management and Redis operations');
      }
    }
    
    if (this.results.databaseLoad) {
      const dbResults = this.results.databaseLoad;
      const dbAvgDuration = dbResults.operations.length > 0 ? 
        dbResults.operations.reduce((sum, op) => sum + op.duration, 0) / dbResults.operations.length : 0;
      
      if (dbAvgDuration > 500) {
        console.log('• Add database indexes for frequently queried fields');
        console.log('• Implement connection pooling optimization');
        console.log('• Consider read replicas for heavy read operations');
        console.log('• Optimize complex queries and reduce N+1 problems');
      }
    }
    
    console.log('\n🎉 Load testing completed successfully!');
  }
}

// Export for use in other tests
module.exports = ComprehensiveLoadTester;

// Run comprehensive test if called directly
if (require.main === module) {
  const tester = new ComprehensiveLoadTester();
  tester.runAllLoadTests().catch(console.error);
}
