// tests/unit/contest/controllers/syncContests.superminimal.test.js
import { describe, it, vi,expect } from 'vitest';

// Minimal mocks
vi.mock('dotenv');
vi.mock('../../../contest/controllers/platforms/codingninjas_studioController.js');
vi.mock('../../../contest/models/Contest.js');

import syncController from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/contest/controllers/DataSyncController.js';

describe('Sync Contests', () => {
  it('exports syncContests function', () => {
    expect(syncController.syncContests).toBeDefined();
  });

  it('can be called without errors', async () => {
    // Just verify we can call it
    await expect(syncController.syncContests()).resolves.not.toThrow();
  });
});