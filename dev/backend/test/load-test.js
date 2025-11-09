/**
 * Load Testing Script for Answly API
 * 
 * Requirements:
 * npm install -g artillery
 * 
 * Usage:
 * artillery run test/load-test.js
 * 
 * This script tests the API with 1000 concurrent users over 5 minutes
 */

module.exports = {
  config: {
    target: 'http://localhost:4000',
    phases: [
      // Warm-up phase
      {
        duration: 60,
        arrivalRate: 10,
        name: 'Warm-up',
      },
      // Ramp-up phase
      {
        duration: 120,
        arrivalRate: 50,
        rampTo: 200,
        name: 'Ramp-up',
      },
      // Sustained load
      {
        duration: 180,
        arrivalRate: 200,
        name: 'Sustained load',
      },
      // Peak load
      {
        duration: 60,
        arrivalRate: 500,
        name: 'Peak load',
      },
    ],
    payload: {
      path: './test-users.csv',
      fields: ['email', 'password'],
      skipHeader: true,
    },
  },
  scenarios: [
    {
      name: 'Browse exams and take test',
      weight: 70,
      flow: [
        {
          get: {
            url: '/exams',
            capture: [
              {
                json: '$[0].id',
                as: 'examId',
              },
            ],
          },
        },
        {
          get: {
            url: '/exams/{{ examId }}',
          },
        },
        {
          think: 2,
        },
        {
          get: {
            url: '/questions?exam_id={{ examId }}&limit=10',
          },
        },
      ],
    },
    {
      name: 'User authentication flow',
      weight: 20,
      flow: [
        {
          post: {
            url: '/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}',
            },
            capture: [
              {
                json: '$.access_token',
                as: 'token',
              },
            ],
          },
        },
        {
          get: {
            url: '/auth/me',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
      ],
    },
    {
      name: 'Admin operations',
      weight: 10,
      flow: [
        {
          post: {
            url: '/auth/login',
            json: {
              email: 'admin@answly.com',
              password: 'admin123',
            },
            capture: [
              {
                json: '$.access_token',
                as: 'adminToken',
              },
            ],
          },
        },
        {
          get: {
            url: '/admin/stats',
            headers: {
              Authorization: 'Bearer {{ adminToken }}',
            },
          },
        },
        {
          get: {
            url: '/audit-logs?take=20',
            headers: {
              Authorization: 'Bearer {{ adminToken }}',
            },
          },
        },
      ],
    },
  ],
};
