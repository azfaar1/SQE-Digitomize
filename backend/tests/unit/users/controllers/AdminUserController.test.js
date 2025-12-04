// tests/unit/users/controllers/AdminUserController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
// CORRECTED IMPORTS - going UP 2 levels from tests/unit/users/controllers/
import {
  getUserList,
  updateUser,
  createUserFirebase,
  createUserDB,
  deleteUserFirebase,
  deleteUserDB
} from '../../../../users/controllers/AdminUserController.js'; // Changed to ../../../../
import User from '../../../../users/models/User.js'; // Changed
import admin from 'firebase-admin';
import { setUser } from '../../../../users/services/setUser.js'; // Changed

// Mock all dependencies with CORRECT paths
vi.mock('../../../../users/models/User.js'); // Changed
vi.mock('firebase-admin');
vi.mock('../../../../users/services/setUser.js'); // Changed

describe('AdminUserController - Unit Tests', () => {
  let req, res, mockAuth;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      body: {},
      user: null
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Mock Firebase admin auth
    mockAuth = {
      createUser: vi.fn(),
      deleteUser: vi.fn()
    };
    
    // Mock the entire admin module properly
    admin.auth = vi.fn(() => mockAuth);
  });

  // Test for getUserList
  describe('getUserList', () => {
    it('should return list of users without sensitive data', async () => {
      const mockUsers = [
        { name: 'User1', email: 'user1@test.com', uid: 'uid1', createdAt: new Date() },
        { name: 'User2', email: 'user2@test.com', uid: 'uid2', createdAt: new Date() }
      ];
      
      // Mock the chain: User.find().select()
      User.find = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers)
      });

      await getUserList(req, res);

      expect(User.find).toHaveBeenCalled();
      expect(User.find().select).toHaveBeenCalledWith('-_id -password -updatedAt -__v');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle database errors', async () => {
      User.find = vi.fn().mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      await getUserList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // Test for updateUser
  describe('updateUser', () => {
    it('should update user role successfully', async () => {
      const mockUpdateResult = { modifiedCount: 1, acknowledged: true };
      User.updateOne = vi.fn().mockResolvedValue(mockUpdateResult);

      req.body = {
        uid: 'user123',
        role: 'admin'
      };

      await updateUser(req, res);

      expect(User.updateOne).toHaveBeenCalledWith(
        { uid: 'user123' },
        {
          $set: { role: 'admin' },
          $currentDate: { lastUpdated: true }
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User Updated Successfully',
        user: mockUpdateResult
      });
    });

    it('should handle update errors', async () => {
      User.updateOne = vi.fn().mockRejectedValue(new Error('Update failed'));

      req.body = {
        uid: 'user123',
        role: 'admin'
      };

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // Test for createUserFirebase
  describe('createUserFirebase', () => {
    const mockNext = vi.fn();

    beforeEach(() => {
      mockNext.mockClear();
    });

    // Test the validation logic correctly
    it('should return 400 when body is null', async () => {
      req.body = null;
      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when email is missing', async () => {
    // Arrange
    req.body = {
        email: '', // Empty string, not undefined
        name: 'Test User',
        password: 'password123'
    };

    const mockNext = vi.fn();

    // Act
    await createUserFirebase(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
    });
    });

it('should return 400 when email already exists in Firebase', async () => {
  // Arrange
  req.body = {
    email: 'existing@example.com',
    name: 'Test User',
    password: 'password123'
  };

  const firebaseError = {
    errorInfo: {
      code: 'auth/email-already-exists',
      message: 'The email address is already in use by another account.'
    }
  };

  mockAuth.createUser.mockRejectedValue(firebaseError);

  // Act
  await createUserFirebase(req, res, mockNext);

  // Assert - Update to match actual response
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    error: "Email already exists",
    message: expect.any(String)
  });
  expect(mockNext).not.toHaveBeenCalled();
});

    it('should proceed to next middleware on successful Firebase creation', async () => {
      req.body = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123'
      };

      const mockUserRecord = {
        uid: 'firebase-uid-123',
        email: 'newuser@example.com',
        displayName: 'New User'
      };

      mockAuth.createUser.mockResolvedValue(mockUserRecord);

      await createUserFirebase(req, res, mockNext);

      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'password123'
      });
      expect(req.user).toEqual(mockUserRecord);
      expect(mockNext).toHaveBeenCalled();
    });

   it('should handle other Firebase errors with 500', async () => {
  // Arrange
  req.body = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123'
  };

  const firebaseError = {
    errorInfo: {
      code: 'auth/invalid-email',
      message: 'The email address is badly formatted.'
    }
  };

  mockAuth.createUser.mockRejectedValue(firebaseError);

  // Act
  await createUserFirebase(req, res, mockNext);

  // Assert
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    error: "Internal server error",
    message: expect.stringContaining('auth/invalid-email')
  });
  expect(mockNext).not.toHaveBeenCalled();
});});
  // Test for createUserDB
  describe('createUserDB', () => {
    // Mock the response helpers
    const mockError = vi.fn();
    const mockSuccess = vi.fn();
    
    // You need to mock the response.api.js module
    vi.mock('../../../../core/api/response.api.js', () => ({
      error: mockError,
      success: mockSuccess
    }));

    it('should create user with data from req.user and req.body', async () => {
      req.user = {
        uid: 'firebase-uid-123',
        displayName: 'Firebase Name',
        email: 'firebase@example.com',
        email_verified: false
      };

      req.body = {
        username: 'customusername',
        name: 'Custom Name' // This should override displayName
      };

      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      await createUserDB(req, res);

      // Check that setUser was called with combined data
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'firebase-uid-123',
          username: 'customusername',
          name: 'Custom Name', // From body, overrides displayName
          email: 'firebase@example.com',
          email_verified: false
        })
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully'
      });
    });

    it('should return 400 when uid is missing', async () => {
      req.user = {}; // No uid
      req.body = {};

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
      expect(setUser).not.toHaveBeenCalled();
    });

    it('should handle when user already exists (status 200)', async () => {
      req.user = {
        uid: 'existing-uid',
        email: 'existing@example.com'
      };

      const existingUserError = {
        status: 200,
        message: 'User already exists in database'
      };

      setUser.mockRejectedValue(existingUserError);

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists.'
      });
    });

    it('should handle validation errors (status 400)', async () => {
      req.user = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      const validationError = {
        status: 400,
        message: 'Invalid username format'
      };

      setUser.mockRejectedValue(validationError);

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid username format'
      });
    });

    it('should handle unexpected errors', async () => {
      req.user = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      setUser.mockRejectedValue(new Error('Unexpected database error'));

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error creating user'
      });
    });
  });

  // Test for deleteUserFirebase
  describe('deleteUserFirebase', () => {
    const mockNext = vi.fn();

    beforeEach(() => {
      mockNext.mockClear();
    });

    it('should delete user from Firebase and call next', async () => {
      req.body = { uid: 'user-to-delete' };

      mockAuth.deleteUser.mockResolvedValue({});

      await deleteUserFirebase(req, res, mockNext);

      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-to-delete');
      expect(mockNext).toHaveBeenCalled();
    });

   it('should handle Firebase errors', async () => {
  // Arrange
  req.body = { uid: 'nonexistent-user' };

  const firebaseError = {
    errorInfo: {
      code: 'auth/user-not-found',
      message: 'No user record found for the given uid.'
    }
  };

  mockAuth.deleteUser.mockRejectedValue(firebaseError);

  // Act
  await deleteUserFirebase(req, res, mockNext);

  // Assert
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({
    error: "User not found",
    message: expect.any(String)
  });
  expect(mockNext).not.toHaveBeenCalled();
});});

  // Test for deleteUserDB
  describe('deleteUserDB', () => {
    // You need to re-import and mock the response helpers here
    // Or better, create a separate test setup
    
    it('should delete user from database', async () => {
      req.body = { uid: 'user-to-delete' };
      
      // Create a fresh response mock for this test
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      User.deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });

      // Since deleteUserDB uses error() and success() functions,
      // you need to mock them properly
      vi.mock('../../../../core/api/response.api.js', () => ({
        error: vi.fn(),
        success: vi.fn().mockImplementation((data, res, status, message) => {
          res.status(status).json({ message });
        })
      }));

      await deleteUserDB(req, mockRes);

      expect(User.deleteOne).toHaveBeenCalledWith({ uid: 'user-to-delete' });
    });

    it('should handle missing uid', async () => {
      req.body = {};
      
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };

      await deleteUserDB(req, mockRes);

      expect(User.deleteOne).not.toHaveBeenCalled();
    });
  });
});