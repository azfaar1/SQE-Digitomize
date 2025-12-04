// tests/integration/userProfile.integration.test.js
import request from 'supertest';
import app from '../../server/app.js'; // Your Express app
import mongoose from 'mongoose';
import { createTestUser, cleanupTestUser } from '../helpers/testDbHelpers.js';

describe('User Profile API - Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_DB_URL);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
  });
  
  describe('GET /api/user/:username', () => {
    let testUser;
    
    beforeEach(async () => {
      testUser = await createTestUser({
        username: 'integration_test_user',
        // ... other fields
      });
    });
    
    afterEach(async () => {
      await cleanupTestUser(testUser._id);
    });
    
    it('should return user profile via actual API call', async () => {
      // Make real HTTP request to your running app
      const response = await request(app)
        .get(`/api/user/integration_test_user`)
        .expect(200);
      
      expect(response.body.personal_data.username).toBe('integration_test_user');
      // ... more assertions
    });
  });
});