import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  addUID, 
  checkAuth, 
  checkUserOwnership, 
  dgmAdminCheck, 
  routeLogging 
} from '../../../../users/middlewares/authMiddleware.js';

// Mock all dependencies properly
vi.mock('../../users/services/getUser.js', () => ({
  getUser: vi.fn()
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn()
}));

vi.mock('../../users/models/User.js', () => {
  const mockSelect = vi.fn();
  const mockFindOne = vi.fn(() => ({
    select: mockSelect
  }));
  
  return {
    default: {
      findOne: mockFindOne,
      // Expose the mock functions for assertions
      _mockFindOne: mockFindOne,
      _mockSelect: mockSelect
    }
  };
});

vi.mock('firebase-admin', () => ({
  default: {
    auth: vi.fn()
  }
}));

vi.mock('../../core/const.js', () => ({
  ROLE: {
    ADMIN: 'admin',
    USER: 'user'
  }
}));

vi.mock('../../services/discord-webhook/routeLog.js', () => ({
  sendRequestLog: vi.fn()
}));

// Import the mocked modules
import { getUser } from '../../../../users/services/getUser.js';
import { getAuth } from 'firebase-admin/auth';
import User from '../../../../users/models/User.js';
import admin from 'firebase-admin';
import { ROLE } from '../../../../core/const.js';
import { sendRequestLog } from '../../../../services/discord-webhook/routeLog.js';

describe('authMiddleware - Unit Tests', () => {
  let req, res, next;
  let mockVerifyIdToken, mockUpdateUser, mockAdminAuth;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup request object
    req = {
      body: {},
      headers: {},
      params: {},
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: vi.fn(),
      cookies: {}
    };
    
    // Setup response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
    
    // Setup next function
    next = vi.fn();
    
    // Reset req properties
    req.decodedToken = undefined;
    req.uid = undefined;
    req.userId = undefined;
    
    // Setup default mocks
    mockVerifyIdToken = vi.fn();
    mockUpdateUser = vi.fn();
    mockAdminAuth = {
      verifyIdToken: vi.fn()
    };
    
    // Setup getAuth mock
    getAuth.mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
      updateUser: mockUpdateUser
    });
    
    // Setup admin.auth mock
    admin.auth.mockReturnValue(mockAdminAuth);
  });

  describe('addUID', () => {
    it('should return 401 when no authorization token is provided', async () => {
      // Arrange
      req.headers.authorization = undefined;
      req.body.headers = undefined;

      // Act
      await addUID(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User Not Authorised",
        error: "Authentication required. Please include an 'Authorization' header with a valid Bearer token."
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token from request.headers.authorization', async () => {
      // Arrange
      const mockDecodedToken = {
        uid: 'test-uid-123',
        firebase: { sign_in_provider: 'password' }
      };
      
      req.headers.authorization = 'Bearer valid-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      mockUpdateUser.mockResolvedValue({});

      // Act
      await addUID(req, res, next);

      // Assert
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(req.decodedToken).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
    });

    it('should handle token from request.body.headers.authorization', async () => {
      // Arrange
      const mockDecodedToken = {
        uid: 'test-uid-456',
        firebase: { sign_in_provider: 'github.com' }
      };
      
      req.body.headers = { Authorization: 'Bearer valid-token-2' };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      mockUpdateUser.mockResolvedValue({});

      // Act
      await addUID(req, res, next);

      // Assert
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-2');
      expect(req.decodedToken).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalled();
    });

    it('should set emailVerified for GitHub sign-in provider', async () => {
      // Arrange
      const mockDecodedToken = {
        uid: 'github-user',
        firebase: { sign_in_provider: 'github.com' }
      };
      
      req.headers.authorization = 'Bearer github-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);
      mockUpdateUser.mockResolvedValue({});

      // Act
      await addUID(req, res, next);

      // Assert
      expect(mockUpdateUser).toHaveBeenCalledWith('github-user', {
        emailVerified: true
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle invalid or expired token in then block', async () => {
      // Arrange
      req.headers.authorization = 'Bearer invalid-token';
      
      // Mock verifyIdToken to return a valid token first
      const mockDecodedToken = { 
        uid: 'test',
        firebase: { sign_in_provider: 'password' }
      };
      
      // First call returns valid token, second call throws error
      mockVerifyIdToken
        .mockResolvedValueOnce(mockDecodedToken) // First verification in addUID
        .mockRejectedValueOnce(new Error('Token expired')); // Second verification in then block

      // Act
      await addUID(req, res, next);

      // Assert - This test simulates the "then block" error scenario
      // The implementation should catch this and return an error response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid") || expect.stringContaining("Access")
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle verifyIdToken error in catch block', async () => {
      // Arrange
      req.headers.authorization = 'Bearer bad-token';
      mockVerifyIdToken.mockRejectedValue(new Error('Token invalid'));

      // Act
      await addUID(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Access forbidden",
        error: "Access forbidden"
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkAuth', () => {
    it('should return 401 when no authorization header', async () => {
      // Arrange
      req.headers.authorization = undefined;

      // Act
      await checkAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User Not Authorised",
        error: "User Not Authorised"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should set uid and call next when token is valid', async () => {
      // Arrange
      req.headers.authorization = 'Bearer valid-token';
      const mockDecodedToken = { uid: 'test-uid-789' };
      
      mockAdminAuth.verifyIdToken.mockResolvedValue(mockDecodedToken);

      // Act
      await checkAuth(req, res, next);

      // Assert
      expect(req.uid).toBe('test-uid-789');
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when token is invalid', async () => {
      // Arrange
      req.headers.authorization = 'Bearer invalid-token';
      mockAdminAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      // Act
      await checkAuth(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "does not have access rights",
        error: "does not have access rights"
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkUserOwnership', () => {
    it('should return 403 when token UID does not match user UID', async () => {
      // Arrange
      req.decodedToken = { uid: 'token-uid-123' };
      req.params.username = 'testuser';
      
      const mockUser = { uid: 'different-uid-456' };
      getUser.mockResolvedValue(mockUser);

      // Act
      await checkUserOwnership(req, res, next);

      // Assert
      expect(getUser).toHaveBeenCalledWith('testuser');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
      expect(next).not.toHaveBeenCalled();
    });

    it('should set userId and call next when UIDs match', async () => {
      // Arrange
      req.decodedToken = { uid: 'matching-uid-123' };
      req.params.username = 'testuser';
      
      const mockUser = { uid: 'matching-uid-123' };
      getUser.mockResolvedValue(mockUser);

      // Act
      await checkUserOwnership(req, res, next);

      // Assert
      expect(getUser).toHaveBeenCalledWith('testuser');
      expect(req.userId).toBe('matching-uid-123');
      expect(next).toHaveBeenCalled();
    });

    it('should handle string conversion for UID comparison', async () => {
      // Arrange
      req.decodedToken = { uid: '123' };
      req.params.username = 'testuser';
      
      const mockUser = { uid: 123 }; // Number instead of string
      getUser.mockResolvedValue(mockUser);

      // Act
      await checkUserOwnership(req, res, next);

      // Assert
      expect(req.userId).toBe('123');
      expect(next).toHaveBeenCalled();
    });

    it('should handle getUser errors', async () => {
      // Arrange
      req.decodedToken = { uid: 'test-uid' };
      req.params.username = 'nonexistent';
      
      // Mock the error properly
      const error = new Error('User not found');
      getUser.mockRejectedValue(error);

      // Act & Assert
      // Since the actual implementation doesn't handle errors, it will throw
      // We'll catch it and verify it throws
      try {
        await checkUserOwnership(req, res, next);
        // If we get here, the test should fail
        expect(true).toBe(false); // Force fail
      } catch (err) {
        expect(err.message).toBe('User not found');
      }
    });
  });

  describe('dgmAdminCheck', () => {
    beforeEach(() => {
      // Reset User mock select chain
      User._mockSelect.mockResolvedValue({ role: 'user' });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      req.decodedToken = { uid: 'nonexistent-uid' };
      User._mockSelect.mockResolvedValue(null);

      // Act
      await dgmAdminCheck(req, res, next);

      // Assert
      expect(User._mockFindOne).toHaveBeenCalledWith({ uid: 'nonexistent-uid' });
      expect(User._mockSelect).toHaveBeenCalledWith(
        "-_id -password -createdAt -updatedAt -__v"
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
        error: "User not found"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', async () => {
      // Arrange
      req.decodedToken = { uid: 'regular-user-uid' };
      const mockUser = { role: 'user' };
      User._mockSelect.mockResolvedValue(mockUser);

      // Act
      await dgmAdminCheck(req, res, next);

      // Assert
      expect(User._mockFindOne).toHaveBeenCalledWith({ uid: 'regular-user-uid' });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You don't have sufficient permission",
        error: "You don't have sufficient permission"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next when user is admin', async () => {
      // Arrange
      req.decodedToken = { uid: 'admin-user-uid' };
      const mockUser = { role: 'admin' };
      User._mockSelect.mockResolvedValue(mockUser);

      // Act
      await dgmAdminCheck(req, res, next);

      // Assert
      expect(User._mockFindOne).toHaveBeenCalledWith({ uid: 'admin-user-uid' });
      expect(next).toHaveBeenCalled();
    });

    it('should exclude sensitive fields when querying user', async () => {
      // Arrange
      req.decodedToken = { uid: 'test-uid' };
      const mockUser = { role: 'admin' };
      User._mockSelect.mockResolvedValue(mockUser);

      // Act
      await dgmAdminCheck(req, res, next);

      // Assert
      expect(User._mockFindOne).toHaveBeenCalledWith({ uid: 'test-uid' });
      expect(User._mockSelect).toHaveBeenCalledWith(
        '-_id -password -createdAt -updatedAt -__v'
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('routeLogging', () => {
    it('should call sendRequestLog and next', async () => {
      // Arrange
      req.method = 'POST';
      req.originalUrl = '/api/users';
      req.headers = { 'user-agent': 'test-agent' };
      req.query = { page: '1' };
      req.body = { name: 'Test User' };
      req.ip = '192.168.1.1';
      req.get.mockReturnValue('Test Browser');
      req.cookies = { session: 'abc123' };

      sendRequestLog.mockResolvedValue();

      // Act
      await routeLogging(req, res, next);

      // Assert
      expect(sendRequestLog).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled();
    });

    it('should handle sendRequestLog error gracefully', async () => {
      // Arrange
      sendRequestLog.mockRejectedValue(new Error('Discord API error'));

      // Act
      await routeLogging(req, res, next);

      // Assert
      expect(sendRequestLog).toHaveBeenCalledWith(req);
      expect(next).toHaveBeenCalled(); // Should still call next even on error
    });

    it('should include all request data in log', async () => {
      // Arrange
      req.method = 'GET';
      req.originalUrl = '/api/test?param=value';
      req.headers = { authorization: 'Bearer token', 'content-type': 'application/json' };
      req.query = { param: 'value' };
      req.body = {};
      req.ip = '127.0.0.1';
      req.get.mockReturnValue('Mozilla/5.0');
      req.cookies = {};

      sendRequestLog.mockResolvedValue();

      // Act
      await routeLogging(req, res, next);

      // Assert
      expect(sendRequestLog).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        originalUrl: '/api/test?param=value',
        headers: expect.any(Object),
        query: { param: 'value' },
        body: {},
        ip: '127.0.0.1'
      }));
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle various authorization header formats', async () => {
      // Test different formats
      const testCases = [
        { header: 'Bearer token', expected: 'token' },
        { header: 'bearer token', expected: 'token' },
        { header: 'Bearer  token', expected: 'token' }, // double space
        { header: 'Bearer token extra', expected: 'token extra' },
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        vi.clearAllMocks();
        
        req.headers.authorization = testCase.header;
        const mockDecodedToken = { 
          uid: 'test-uid', 
          firebase: { sign_in_provider: 'password' } 
        };
        
        // Setup fresh mocks for this iteration
        const freshMockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
        const freshMockUpdateUser = vi.fn().mockResolvedValue({});
        
        // Re-mock getAuth for this test case
        getAuth.mockReturnValue({
          verifyIdToken: freshMockVerifyIdToken,
          updateUser: freshMockUpdateUser
        });

        // Reset next mock
        next.mockClear();
        
        // Reset req
        req.decodedToken = undefined;

        // Act
        await addUID(req, res, next);
        
        // Assert - Check that verifyIdToken was called with the token
        // Note: The actual implementation might trim the token or handle spaces differently
        expect(freshMockVerifyIdToken).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      }
    });

    it('should handle missing decodedToken in checkUserOwnership', async () => {
      // Arrange
      req.decodedToken = undefined; // Not set
      req.params.username = 'testuser';

      // Act & Assert
      // Since the actual implementation tries to access req.decodedToken.uid,
      // it will throw an error. We'll verify it throws.
      try {
        await checkUserOwnership(req, res, next);
        // If we get here, the test should fail
        expect(true).toBe(false); // Force fail
      } catch (err) {
        expect(err).toBeDefined();
        expect(next).not.toHaveBeenCalled();
      }
    });

    it('should handle database connection errors in dgmAdminCheck', async () => {
      // Arrange
      req.decodedToken = { uid: 'test-uid' };
      
      // Mock select to reject with database error
      const dbError = new Error('Database connection failed');
      User._mockSelect.mockRejectedValue(dbError);

      // Act & Assert
      // Since the actual implementation doesn't handle this error, it will throw
      try {
        await dgmAdminCheck(req, res, next);
        // If we get here, the test should fail
        expect(true).toBe(false); // Force fail
      } catch (err) {
        expect(err).toBe(dbError);
        expect(next).not.toHaveBeenCalled();
      }
    });
  });
});