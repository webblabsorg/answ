# Answly Testing Guide

## E2E Tests

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e-spec.ts

# Run with coverage
npm run test:e2e -- --coverage
```

### Test Structure

- `auth.e2e-spec.ts` - Authentication flow tests
- `exams.e2e-spec.ts` - Exam catalog tests
- More tests can be added for test-sessions, admin, etc.

## Load Testing

### Prerequisites

Install Artillery globally:
```bash
npm install -g artillery
```

### Running Load Tests

```bash
# Run load test
artillery run test/load-test.js

# Run with custom duration
artillery run --config test/custom-config.yml test/load-test.js

# Generate HTML report
artillery run --output report.json test/load-test.js
artillery report report.json
```

### Load Test Configuration

The load test simulates:
- **Warm-up:** 10 requests/sec for 1 minute
- **Ramp-up:** 50-200 requests/sec for 2 minutes
- **Sustained:** 200 requests/sec for 3 minutes
- **Peak:** 500 requests/sec for 1 minute

Total duration: 7 minutes
Peak concurrent users: ~1000

### Test Scenarios

1. **Browse Exams (70% of traffic)**
   - GET /exams
   - GET /exams/:id
   - GET /questions?exam_id=X

2. **Authentication (20% of traffic)**
   - POST /auth/login
   - GET /auth/me

3. **Admin Operations (10% of traffic)**
   - POST /auth/login (admin)
   - GET /admin/stats
   - GET /audit-logs

## Performance Benchmarks

### Target Metrics

- **API Response Time:** <200ms (p95)
- **Page Load Time:** <3s
- **Concurrent Users:** 1000+
- **Error Rate:** <1%

### Monitoring

Monitor the following during load tests:
- CPU usage
- Memory usage
- Database connections
- API response times
- Error rates

## Unit Tests

### Running Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Database

E2E tests use the same database as development. Consider:
- Creating a separate test database
- Using transactions that rollback after each test
- Mocking external services

## CI/CD Integration

Add to your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: npm run test:e2e

- name: Run Load Tests
  run: artillery run test/load-test.js --quiet
```

## Best Practices

1. **Test Isolation:** Each test should be independent
2. **Data Cleanup:** Clean up test data after tests
3. **Realistic Data:** Use realistic test data volumes
4. **Error Scenarios:** Test error paths and edge cases
5. **Performance:** Monitor test execution time
