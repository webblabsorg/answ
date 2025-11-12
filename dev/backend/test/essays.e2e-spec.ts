import request from 'supertest';

// Basic e2e sanity checks for essays endpoints.
// Note: Requires server running and a valid JWT in ACCESS_TOKEN env to fully pass.

const API = process.env.API_URL || 'http://localhost:4000';
const TOKEN = process.env.ACCESS_TOKEN || '';

describe('Essays e2e (smoke)', () => {
  it('GET /essays/projects should 401 without token', async () => {
    const res = await request(API).get('/essays/projects');
    expect([401, 403]).toContain(res.status);
  });

  it.skip('GET /essays/projects should list when authed (set ACCESS_TOKEN)', async () => {
    if (!TOKEN) return; // skipped if no token
    const res = await request(API).get('/essays/projects').set('Authorization', `Bearer ${TOKEN}`);
    expect([200, 204]).toContain(res.status);
  });
});
