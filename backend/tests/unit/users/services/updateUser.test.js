// tests/unit/users/services/updateUser.absolute-minimal.test.js
import { describe, it, expect, vi } from 'vitest';
import { updateUser } from '../../../../users/services/updateUser.js';

vi.mock('../../../../users/models/User.js', () => ({
  default: { findByIdAndUpdate: vi.fn() }
}));

import User from '../../../../users/models/User.js';

describe('updateUser', () => {
  it('updates user with valid data', async () => {
    const user = { _id: '123', name: 'New Name' };
    User.findByIdAndUpdate.mockResolvedValue(user);

    const result = await updateUser(user);

    expect(result).toEqual(user);
  });

  it('handles errors silently', async () => {
    User.findByIdAndUpdate.mockRejectedValue(new Error());

    const result = await updateUser({ _id: '123' });

    expect(result).toBeUndefined();
  });
});