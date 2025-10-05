/**
 * Load Testing Configuration
 * Using Artillery-like configuration for load testing
 */

module.exports = {
  // Test scenarios
  scenarios: {
    // WhatsApp webhook load test
    whatsappWebhookLoad: {
      weight: 40,
      flow: [
        {
          post: {
            url: '/webhooks/whatsapp',
            headers: {
              'Content-Type': 'application/json',
              'X-Twilio-Signature': '{{ $randomString() }}'
            },
            json: {
              AccountSid: 'test-account-sid',
              MessageSid: '{{ $randomString() }}',
              From: '+{{ $randomInt(1000000000, 9999999999) }}',
              To: '+0987654321',
              Body: '{{ $randomString() }} - I need help finding a property',
              MessageType: 'text',
              Timestamp: '{{ $timestamp() }}'
            }
          }
        }
      ]
    },

    // Agent portal API load test
    agentPortalLoad: {
      weight: 30,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: 'load-test@example.com',
              password: 'password123'
            }
          }
        },
        {
          get: {
            url: '/api/properties',
            headers: {
              'Authorization': 'Bearer {{ token }}'
            }
          }
        },
        {
          get: {
            url: '/api/conversations',
            headers: {
              'Authorization': 'Bearer {{ token }}'
            }
          }
        }
      ]
    },

    // Property search load test
    propertySearchLoad: {
      weight: 20,
      flow: [
        {
          get: {
            url: '/api/properties?search={{ $randomString() }}&city=Cairo&propertyType=villa',
            headers: {
              'Authorization': 'Bearer {{ token }}'
            }
          }
        }
      ]
    },

    // Analytics load test
    analyticsLoad: {
      weight: 10,
      flow: [
        {
          get: {
            url: '/api/analytics/overview',
            headers: {
              'Authorization': 'Bearer {{ token }}'
            }
          }
        }
      ]
    }
  },

  // Load phases
  phases: [
    {
      duration: 60,  // 1 minute
      arrivalRate: 1, // 1 user per second
      name: 'Warm up'
    },
    {
      duration: 120, // 2 minutes
      arrivalRate: 5, // 5 users per second
      name: 'Ramp up load'
    },
    {
      duration: 300, // 5 minutes
      arrivalRate: 10, // 10 users per second
      name: 'Sustained load'
    },
    {
      duration: 60,  // 1 minute
      arrivalRate: 20, // 20 users per second
      name: 'Spike test'
    },
    {
      duration: 120, // 2 minutes
      arrivalRate: 1, // 1 user per second
      name: 'Cool down'
    }
  ],

  // Target configuration
  target: 'http://localhost:3000',

  // Metrics and reporting
  metrics: {
    http: {
      latency: ['p50', 'p95', 'p99'],
      statusCodes: true,
      errorRate: true
    }
  }
};
