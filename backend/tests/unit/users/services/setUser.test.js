// tests/unit/users/services/setUser.minimal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setUser } from '../../../../users/services/setUser.js';

// Create mock functions
const mockFindOne = vi.fn();
const mockSave = vi.fn();
const mockUserConstructor = vi.fn();

// Proper mock setup
vi.mock('../../../../users/models/User.js', () => {
  // Create a mock class
  const MockUser = vi.fn(function(data) {
    mockUserConstructor(data);
    this.save = mockSave;
    return this;
  });
  
  // Add static methods
  MockUser.findOne = mockFindOne;
  
  return { default: MockUser };
});

vi.mock('../../../../services/email/createAccount.js', () => ({
  sendEmail: vi.fn()
}));

vi.mock('../../../../services/discord-webhook/createAccount.js', () => ({
  sendWebhook_createAccount: vi.fn()
}));

describe('setUser - Minimal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    
    // Reset the mock functions
    mockFindOne.mockClear();
    mockSave.mockClear();
    mockUserConstructor.mockClear();
  });

  it('should create user successfully', async () => {
    // Arrange
    const userData = {
      uid: '123',
      email: 'test@example.com',
      email_verified: true
    };

    const mockUser = { ...userData, username: 'test' };
    
    mockFindOne.mockResolvedValue(null);
    mockSave.mockResolvedValue(mockUser);

    // Act
    const result = await setUser(userData);

    // Assert
    expect(mockFindOne).toHaveBeenCalledWith({ username: 'test' });
    expect(mockUserConstructor).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    expect(result).toEqual(mockUser);
  });

  it('should handle duplicate username by using uid', async () => {
    // Arrange
    const userData = {
      uid: 'user-123',
      username: 'existinguser',
      email: 'test@example.com',
      email_verified: true
    };

    mockFindOne.mockResolvedValue({ username: 'existinguser' });
    mockSave.mockResolvedValue({});

    // Act
    await setUser(userData);

    // Assert - Check that User constructor was called with uid as username
    expect(mockUserConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'user-123' // Should use uid because username was duplicate
      })
    );
  });

  it('should throw error for duplicate key', async () => {
    // Arrange
    const userData = {
      uid: '123',
      email: 'test@example.com',
      email_verified: true
    };

    const duplicateError = {
      code: 11000,
      keyValue: { email: 'test@example.com' }
    };

    mockFindOne.mockResolvedValue(null);
    mockSave.mockRejectedValue(duplicateError);

    // Act & Assert
    await expect(setUser(userData)).rejects.toThrow(
      'User with this email already exists'
    );
  });

  it('should send notifications in production only', async () => {
    // Arrange
    process.env.NODE_ENV = 'production';
    
    const { sendEmail } = await import('../../../../services/email/createAccount.js');
    const { sendWebhook_createAccount } = await import('../../../../services/discord-webhook/createAccount.js');
    
    const userData = {
      uid: '123',
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User'
    };

    const savedUser = {
      email: 'test@example.com',
      name: 'Test User',
      username: 'test',
      picture: 'default.jpg',
      uid: '123'
    };

    mockFindOne.mockResolvedValue(null);
    mockSave.mockResolvedValue(savedUser);

    // Act
    await setUser(userData);

    // Assert
    expect(sendEmail).toHaveBeenCalledWith('test@example.com', 'Test User');
    expect(sendWebhook_createAccount).toHaveBeenCalled();
  });
});