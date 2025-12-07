// tests/unit/users/controllers/cloudinaryUploadController.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSignature } from '../../../../users/controllers/cloudinaryUploadController.js';
import { v2 as cloudinary } from 'cloudinary';

// Mock cloudinary
vi.mock('cloudinary', () => ({
  v2: {
    utils: {
      api_sign_request: vi.fn()
    }
  }
}));

describe('cloudinaryUploadController - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Setup request object
    req = {
      decodedToken: { uid: 'test-uid-123' }
    };

    // Setup response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    // Mock environment variable
    process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore Date if it was mocked
    if (global.Date._isMockFunction) {
      vi.unmock('global.Date');
    }
  });

  describe('generateSignature', () => {
    describe('Success Cases', () => {
      it('should generate signature successfully with correct parameters', async () => {
        // Arrange
        const mockTimestamp = 1704067200; // Fixed timestamp for testing
        const mockSignature = 'generated-signature-123';
        
        // Mock Date constructor
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000 // Convert to milliseconds
        }));
        
        // Mock cloudinary api_sign_request
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          {
            folder: "users",
            timestamp: mockTimestamp,
            public_id: 'test-uid-123'
          },
          'test-cloudinary-secret'
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          message: "Signature generated successfully",
          signature: mockSignature,
          timestamp: mockTimestamp,
          public_id: 'test-uid-123'
        });
      });

      it('should use uid from decodedToken as public_id', async () => {
        // Arrange
        req.decodedToken.uid = 'unique-user-id-456';
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            public_id: 'unique-user-id-456'
          }),
          expect.any(String)
        );
      });

      it('should calculate timestamp correctly from current time', async () => {
        // Arrange
        const currentTime = Date.now();
        const expectedTimestamp = Math.round(currentTime / 1000);
        const mockSignature = 'test-signature';
        
        // Use the real Date for this test
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            folder: "users",
            public_id: 'test-uid-123'
          }),
          expect.any(String)
        );
        
        // Get the actual timestamp that was passed
        const actualCall = cloudinary.utils.api_sign_request.mock.calls[0][0];
        expect(actualCall.timestamp).toBeGreaterThan(0);
        expect(actualCall.timestamp).toBeLessThanOrEqual(Math.round(Date.now() / 1000));
      });
    });

    describe('Error Cases', () => {
      it('should handle cloudinary API errors gracefully', async () => {
        // Arrange
        const mockError = new Error('Cloudinary API error');
        cloudinary.utils.api_sign_request.mockImplementation(() => {
          throw mockError;
        });

        // Mock console.log to verify error logging (your code uses console.log twice)
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Act
        await generateSignature(req, res);

        // Assert
        // Should log error message first
        expect(consoleLogSpy).toHaveBeenCalledWith("Failed to generate signature");
        // Should log the actual error second
        expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Internal Server Error",
          error: mockError
        });

        // Cleanup
        consoleLogSpy.mockRestore();
      });

      it('should handle missing decodedToken gracefully', async () => {
        // Arrange
        req.decodedToken = undefined;
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Act
        await generateSignature(req, res);

        // Assert
        expect(consoleLogSpy).toHaveBeenCalledWith("Failed to generate signature");
        expect(res.status).toHaveBeenCalledWith(500);

        // Cleanup
        consoleLogSpy.mockRestore();
      });

      it('should handle missing CLOUDINARY_API_SECRET environment variable', async () => {
        // Arrange
        delete process.env.CLOUDINARY_API_SECRET;
        const mockError = new Error('Missing Cloudinary API secret');
        cloudinary.utils.api_sign_request.mockImplementation(() => {
          throw mockError;
        });

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Act
        await generateSignature(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Internal Server Error",
          error: mockError
        });

        // Cleanup
        consoleLogSpy.mockRestore();
        
        // Restore environment variable
        process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-secret';
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in uid', async () => {
        // Arrange
        req.decodedToken.uid = 'user-id-with-special_chars@123';
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            public_id: 'user-id-with-special_chars@123'
          }),
          expect.any(String)
        );
      });

      it('should handle empty uid string', async () => {
        // Arrange
        req.decodedToken.uid = '';
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            public_id: ''
          }),
          expect.any(String)
        );
      });

      it('should always use "users" folder for all signatures', async () => {
        // Arrange
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            folder: 'users'
          }),
          expect.any(String)
        );
      });

      it('should convert timestamp from milliseconds to seconds correctly', async () => {
        // Arrange
        const mockTimeMs = 1704067200123; // Milliseconds with fractional part
        const expectedTimestamp = 1704067200; // Seconds (truncated)
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimeMs
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expectedTimestamp
          }),
          expect.any(String)
        );
      });
    });

    describe('Response Format', () => {
      it('should return response in correct JSON format', async () => {
        // Arrange
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        const mockPublicId = 'test-uid-123';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        const response = res.json.mock.calls[0][0];
        expect(response).toEqual({
          message: "Signature generated successfully",
          signature: mockSignature,
          timestamp: mockTimestamp,
          public_id: mockPublicId
        });
      });

      it('should not expose sensitive information in response', async () => {
        // Arrange
        const mockTimestamp = 1704067200;
        const mockSignature = 'test-signature';
        
        vi.spyOn(global, 'Date').mockImplementation(() => ({
          getTime: () => mockTimestamp * 1000
        }));
        
        cloudinary.utils.api_sign_request.mockReturnValue(mockSignature);

        // Act
        await generateSignature(req, res);

        // Assert
        const response = res.json.mock.calls[0][0];
        // Should not contain API secret
        expect(JSON.stringify(response)).not.toContain('test-cloudinary-secret');
        // Should not contain CLOUDINARY_API_SECRET
        expect(response).not.toHaveProperty('CLOUDINARY_API_SECRET');
        expect(response).not.toHaveProperty('api_secret');
      });
    });
  });
});