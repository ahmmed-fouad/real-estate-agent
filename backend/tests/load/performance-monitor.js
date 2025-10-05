/**
 * Performance Monitor
 * Monitors system performance during load tests and identifies bottlenecks
 */

const os = require('os');
const { performance } = require('perf_hooks');
const http = require('http');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        network: []
      },
      application: {
        responseTimes: [],
        errorRates: [],
        throughput: []
      },
      database: {
        connectionPool: [],
        queryTimes: [],
        transactionCount: []
      }
    };
    this.monitoring = false;
    this.monitorInterval = null;
  }

  // Start performance monitoring
  startMonitoring(intervalMs = 1000) {
    if (this.monitoring) {
      console.log('Performance monitoring already running');
      return;
    }

    console.log('🔍 Starting performance monitoring...');
    this.monitoring = true;
    
    this.monitorInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectApplicationMetrics();
      this.collectDatabaseMetrics();
    }, intervalMs);
  }

  // Stop performance monitoring
  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    console.log('🔍 Stopping performance monitoring...');
    this.monitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  // Collect system metrics
  collectSystemMetrics() {
    const timestamp = Date.now();
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    this.metrics.system.cpu.push({
      timestamp,
      usage: cpuPercent,
      loadAverage: os.loadavg()
    });
    
    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    this.metrics.system.memory.push({
      timestamp,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      totalMemory: totalMem,
      freeMemory: freeMem,
      memoryUsagePercent: ((totalMem - freeMem) / totalMem) * 100
    });
    
    // Network interfaces
    const networkInterfaces = os.networkInterfaces();
    this.metrics.system.network.push({
      timestamp,
      interfaces: networkInterfaces
    });
  }

  // Collect application metrics
  async collectApplicationMetrics() {
    const timestamp = Date.now();
    
    try {
      // Test application health endpoint
      const healthCheck = await this.makeHealthCheck();
      
      this.metrics.application.responseTimes.push({
        timestamp,
        responseTime: healthCheck.duration,
        statusCode: healthCheck.statusCode
      });
      
      // Calculate error rate
      const recentRequests = this.metrics.application.responseTimes.slice(-100);
      const errorCount = recentRequests.filter(req => req.statusCode >= 400).length;
      const errorRate = (errorCount / recentRequests.length) * 100;
      
      this.metrics.application.errorRates.push({
        timestamp,
        errorRate
      });
      
      // Calculate throughput (requests per second)
      const throughput = this.calculateThroughput();
      this.metrics.application.throughput.push({
        timestamp,
        throughput
      });
      
    } catch (error) {
      console.warn('Failed to collect application metrics:', error.message);
    }
  }

  // Collect database metrics
  collectDatabaseMetrics() {
    const timestamp = Date.now();
    
    // This would typically connect to your database monitoring system
    // For now, we'll simulate database metrics
    this.metrics.database.connectionPool.push({
      timestamp,
      activeConnections: Math.floor(Math.random() * 10) + 1,
      idleConnections: Math.floor(Math.random() * 5),
      totalConnections: Math.floor(Math.random() * 15) + 5
    });
    
    this.metrics.database.queryTimes.push({
      timestamp,
      avgQueryTime: Math.random() * 100 + 10, // 10-110ms
      slowQueries: Math.floor(Math.random() * 3)
    });
  }

  // Make health check request
  async makeHealthCheck() {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        const endTime = performance.now();
        resolve({
          statusCode: res.statusCode,
          duration: endTime - startTime
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        resolve({
          statusCode: 0,
          duration: endTime - startTime,
          error: error.message
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        resolve({
          statusCode: 0,
          duration: endTime - startTime,
          error: 'Timeout'
        });
      });
      
      req.end();
    });
  }

  // Calculate throughput
  calculateThroughput() {
    const recentRequests = this.metrics.application.responseTimes.slice(-60); // Last 60 seconds
    if (recentRequests.length < 2) return 0;
    
    const timeSpan = recentRequests[recentRequests.length - 1].timestamp - recentRequests[0].timestamp;
    return (recentRequests.length / timeSpan) * 1000; // Requests per second
  }

  // Generate performance report
  generatePerformanceReport() {
    console.log('\n📊 PERFORMANCE MONITORING REPORT');
    console.log('================================');
    
    // System metrics
    if (this.metrics.system.cpu.length > 0) {
      const cpuMetrics = this.metrics.system.cpu;
      const avgCpuUsage = cpuMetrics.reduce((sum, metric) => sum + metric.usage, 0) / cpuMetrics.length;
      const maxCpuUsage = Math.max(...cpuMetrics.map(metric => metric.usage));
      
      console.log('\n🖥️  SYSTEM METRICS');
      console.log(`Average CPU Usage: ${avgCpuUsage.toFixed(2)}%`);
      console.log(`Peak CPU Usage: ${maxCpuUsage.toFixed(2)}%`);
      
      const memMetrics = this.metrics.system.memory;
      const avgMemUsage = memMetrics.reduce((sum, metric) => sum + metric.memoryUsagePercent, 0) / memMetrics.length;
      const maxMemUsage = Math.max(...memMetrics.map(metric => metric.memoryUsagePercent));
      
      console.log(`Average Memory Usage: ${avgMemUsage.toFixed(2)}%`);
      console.log(`Peak Memory Usage: ${maxMemUsage.toFixed(2)}%`);
    }
    
    // Application metrics
    if (this.metrics.application.responseTimes.length > 0) {
      const responseTimes = this.metrics.application.responseTimes.map(rt => rt.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log('\n🚀 APPLICATION METRICS');
      console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Peak Response Time: ${maxResponseTime.toFixed(2)}ms`);
      
      const errorRates = this.metrics.application.errorRates;
      if (errorRates.length > 0) {
        const avgErrorRate = errorRates.reduce((sum, er) => sum + er.errorRate, 0) / errorRates.length;
        const maxErrorRate = Math.max(...errorRates.map(er => er.errorRate));
        
        console.log(`Average Error Rate: ${avgErrorRate.toFixed(2)}%`);
        console.log(`Peak Error Rate: ${maxErrorRate.toFixed(2)}%`);
      }
      
      const throughput = this.metrics.application.throughput;
      if (throughput.length > 0) {
        const avgThroughput = throughput.reduce((sum, t) => sum + t.throughput, 0) / throughput.length;
        const maxThroughput = Math.max(...throughput.map(t => t.throughput));
        
        console.log(`Average Throughput: ${avgThroughput.toFixed(2)} RPS`);
        console.log(`Peak Throughput: ${maxThroughput.toFixed(2)} RPS`);
      }
    }
    
    // Database metrics
    if (this.metrics.database.connectionPool.length > 0) {
      const connectionMetrics = this.metrics.database.connectionPool;
      const avgConnections = connectionMetrics.reduce((sum, cm) => sum + cm.activeConnections, 0) / connectionMetrics.length;
      const maxConnections = Math.max(...connectionMetrics.map(cm => cm.activeConnections));
      
      console.log('\n🗄️  DATABASE METRICS');
      console.log(`Average Active Connections: ${avgConnections.toFixed(1)}`);
      console.log(`Peak Active Connections: ${maxConnections}`);
      
      const queryMetrics = this.metrics.database.queryTimes;
      if (queryMetrics.length > 0) {
        const avgQueryTime = queryMetrics.reduce((sum, qm) => sum + qm.avgQueryTime, 0) / queryMetrics.length;
        const maxQueryTime = Math.max(...queryMetrics.map(qm => qm.avgQueryTime));
        
        console.log(`Average Query Time: ${avgQueryTime.toFixed(2)}ms`);
        console.log(`Peak Query Time: ${maxQueryTime.toFixed(2)}ms`);
      }
    }
    
    // Identify bottlenecks
    this.identifyBottlenecks();
  }

  // Identify performance bottlenecks
  identifyBottlenecks() {
    console.log('\n🔍 BOTTLENECK ANALYSIS');
    console.log('======================');
    
    const bottlenecks = [];
    
    // Check CPU usage
    if (this.metrics.system.cpu.length > 0) {
      const avgCpuUsage = this.metrics.system.cpu.reduce((sum, metric) => sum + metric.usage, 0) / this.metrics.system.cpu.length;
      if (avgCpuUsage > 80) {
        bottlenecks.push('High CPU usage detected - consider optimizing algorithms or scaling horizontally');
      }
    }
    
    // Check memory usage
    if (this.metrics.system.memory.length > 0) {
      const avgMemUsage = this.metrics.system.memory.reduce((sum, metric) => sum + metric.memoryUsagePercent, 0) / this.metrics.system.memory.length;
      if (avgMemUsage > 85) {
        bottlenecks.push('High memory usage detected - check for memory leaks or increase available memory');
      }
    }
    
    // Check response times
    if (this.metrics.application.responseTimes.length > 0) {
      const responseTimes = this.metrics.application.responseTimes.map(rt => rt.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      if (avgResponseTime > 2000) {
        bottlenecks.push('Slow response times detected - optimize database queries and add caching');
      }
    }
    
    // Check error rates
    if (this.metrics.application.errorRates.length > 0) {
      const avgErrorRate = this.metrics.application.errorRates.reduce((sum, er) => sum + er.errorRate, 0) / this.metrics.application.errorRates.length;
      if (avgErrorRate > 5) {
        bottlenecks.push('High error rate detected - check application logs and error handling');
      }
    }
    
    // Check database connections
    if (this.metrics.database.connectionPool.length > 0) {
      const avgConnections = this.metrics.database.connectionPool.reduce((sum, cm) => sum + cm.activeConnections, 0) / this.metrics.database.connectionPool.length;
      if (avgConnections > 80) {
        bottlenecks.push('High database connection usage - consider connection pooling optimization');
      }
    }
    
    if (bottlenecks.length === 0) {
      console.log('✅ No significant bottlenecks detected');
    } else {
      bottlenecks.forEach((bottleneck, index) => {
        console.log(`${index + 1}. ${bottleneck}`);
      });
    }
  }

  // Export metrics to file
  exportMetrics(filename = 'performance-metrics.json') {
    const fs = require('fs');
    const metricsData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    };
    
    fs.writeFileSync(filename, JSON.stringify(metricsData, null, 2));
    console.log(`📁 Metrics exported to ${filename}`);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        network: []
      },
      application: {
        responseTimes: [],
        errorRates: [],
        throughput: []
      },
      database: {
        connectionPool: [],
        queryTimes: [],
        transactionCount: []
      }
    };
    console.log('🧹 Metrics cleared');
  }
}

// Export for use in other tests
module.exports = PerformanceMonitor;

// Run monitoring if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  
  // Start monitoring
  monitor.startMonitoring(2000); // Every 2 seconds
  
  // Stop monitoring after 5 minutes
  setTimeout(() => {
    monitor.stopMonitoring();
    monitor.generatePerformanceReport();
    monitor.exportMetrics();
  }, 5 * 60 * 1000);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping performance monitoring...');
    monitor.stopMonitoring();
    monitor.generatePerformanceReport();
    monitor.exportMetrics();
    process.exit(0);
  });
}
