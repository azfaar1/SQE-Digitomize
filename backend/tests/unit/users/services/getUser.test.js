// tests/unit/users/services/getUser.minimal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUser } from '../../../../users/services/getUser.js';

// Mock
vi.mock('../../../../users/models/User.js', () => ({
  default: { findOne: vi.fn() }
}));

import User from '../../../../users/models/User.js';

describe('getUser - Minimal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should find user by username or email', async () => {
    const mockUser = { username: 'testuser', email: 'test@example.com' };
    User.findOne.mockResolvedValue(mockUser);

    const result = await getUser('testuser');

    expect(User.findOne).toHaveBeenCalledWith({
      $or: [
        { username: 'testuser' },
        { email: 'testuser' }
      ]
    });
    expect(result).toEqual(mockUser);
  });

  it('should return null when user not found', async () => {
    User.findOne.mockResolvedValue(null);

    const result = await getUser('nonexistent');

    expect(result).toBeNull();
  });

  it('should throw error on database failure', async () => {
    User.findOne.mockRejectedValue(new Error('DB Error'));

    await expect(getUser('testuser')).rejects.toThrow('User not found');
  });
});