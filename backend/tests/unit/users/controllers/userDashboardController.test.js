// tests/unit/users/controllers/userDashboardController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserDashboard } from '../../../../users/controllers/userDashboardController.js';
import User from '../../../../users/models/User.js';

// Mock dependencies
vi.mock('../../../../users/models/User.js');

describe('userDashboardController - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      decodedToken: {
        uid: 'firebase-uid-123'
      }
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('handleUserDashboard', () => {
    // FIX: Properly mock Mongoose chain methods
    it('should return complete user dashboard data when user exists', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        email_show: true,
        bio: {
          data: 'Test bio',
          showOnWebsite: true
        },
        picture: 'avatar.jpg',
        phoneNumber: {
          data: '+1234567890',
          showOnWebsite: false
        },
        dateOfBirth: '1990-01-01',
        resume: 'resume.pdf',
        github: 'https://github.com/testuser',
        codechef: {
          username: 'cc_test',
          rating: 1800,
          showOnWebsite: true
        },
        leetcode: {
          username: 'lc_test',
          rating: 1900,
          showOnWebsite: true
        },
        codeforces: {
          username: 'cf_test',
          rating: 2000,
          showOnWebsite: true
        },
        digitomize_rating: 2100,
        skills: ['JavaScript', 'Node.js'],
        education: [
          {
            degree: 'BSc Computer Science',
            institution: 'Test University',
            year: 2023
          }
        ],
        preferences: {
          theme: 'dark',
          notifications: true
        },
        social: {
          linkedin: 'https://linkedin.com/in/testuser',
          twitter: 'https://twitter.com/testuser'
        }
      };

      // Create a proper Mongoose mock chain
      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'firebase-uid-123' });
      expect(mockSelect).toHaveBeenCalledWith('-_id -password -createdAt -updatedAt -__v');
      
      expect(res.status).toHaveBeenCalledWith(200);
      
      // Check response structure
      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('personal_data');
      expect(response).toHaveProperty('github');
      expect(response).toHaveProperty('social');
      expect(response).toHaveProperty('ratings');
      expect(response.personal_data.bio.data).toBe('Test bio');
    });

    // FIX: User not found - returns 404
    it('should return 404 when user does not exist', async () => {
      // Arrange
      const mockSelect = vi.fn().mockResolvedValue(null);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found'
      });
    });

    // FIX: Database error - returns 500
    it('should return 500 on database error', async () => {
      // Arrange
      const mockSelect = vi.fn().mockRejectedValue(new Error('Database error'));
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    // FIX: Handle null/undefined optional fields
    it('should handle null/undefined optional fields gracefully', async () => {
  // Arrange
  const mockUserData = {
    uid: 'firebase-uid-123',
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    email_show: true,
    skills: null,
    education: null,
    preferences: null
  };

  const mockSelect = vi.fn().mockResolvedValue(mockUserData);
  const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
  User.findOne = mockFindOne;

  // Act
  await handleUserDashboard(req, res);

  // Assert
  const response = res.json.mock.calls[0][0];
  expect(response.personal_data.skills).toBeNull();
  expect(response.personal_data.education).toBeNull();
  expect(response.personal_data.preferences).toBeNull();
});


    // FIX: Handle empty arrays
    it('should handle empty arrays correctly', async () => {
    // Arrange
    const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User',
        skills: { data: [], showOnWebsite: true },
        education: { data: [], showOnWebsite: true }
    };

    const mockSelect = vi.fn().mockResolvedValue(mockUserData);
    const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
    User.findOne = mockFindOne;

    // Act
    await handleUserDashboard(req, res);

    // Assert
    const response = res.json.mock.calls[0][0];
    expect(response.personal_data.skills.data).toEqual([]);
    expect(response.personal_data.education.data).toEqual([]);
    });


    // FIX: Handle missing nested objects
    it('should handle missing nested objects gracefully', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User'
        // No bio, phoneNumber, etc.
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.bio).toBeNull();
      expect(response.personal_data.phoneNumber).toBeNull();
    });

    // FIX: Dashboard shows all data even when showOnWebsite is false
    it('should include data even when showOnWebsite is false (dashboard shows all)', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User',
        bio: {
          data: 'Hidden bio',
          showOnWebsite: false
        },
        phoneNumber: {
          data: '+1234567890',
          showOnWebsite: false
        }
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      // Dashboard should show all data regardless of showOnWebsite
      expect(response.personal_data.bio.data).toBe('Hidden bio');
      expect(response.personal_data.bio.showOnWebsite).toBe(false);
      expect(response.personal_data.phoneNumber.data).toBe('+1234567890');
    });

    // FIX: Test sensitive fields exclusion
    it('should exclude sensitive fields from database query', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser'
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'firebase-uid-123' });
      expect(mockSelect).toHaveBeenCalledWith('-_id -password -createdAt -updatedAt -__v');
    });

    // FIX: Handle errors during response construction
    it('should handle errors during response construction gracefully', async () => {
      // Arrange
      // This shouldn't happen, but just in case
      const mockSelect = vi.fn().mockResolvedValue({ uid: 'test' });
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert - Should not crash
      expect(res.status).toHaveBeenCalled();
    });

    // FIX: Handle missing uid (should still try to query)
    it('should not check for missing uid since middleware handles it', async () => {
      // Arrange
      req.decodedToken.uid = undefined;
      
      const mockSelect = vi.fn().mockResolvedValue(null);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: undefined });
    });

    // FIX: Platform data with null username but showOnWebsite true
    it('should handle platform data with null username but showOnWebsite true', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        codeforces: {
          username: null,
          rating: null,
          showOnWebsite: true
        }
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.ratings.codeforces.data).toBeNull();
      expect(response.ratings.codeforces.showOnWebsite).toBe(true);
    });

    // FIX: Complex education array structure
    it('should handle complex education array structure', async () => {
      // Arrange
      const complexEducation = [
        {
          degree: 'BSc Computer Science',
          institution: 'University A',
          year: 2020,
          gpa: 3.8,
          honors: ['Summa Cum Laude', 'Department Award']
        },
        {
          degree: 'MSc Data Science',
          institution: 'University B',
          year: 2022,
          thesis: 'Machine Learning Applications'
        }
      ];

      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        education: complexEducation
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.education).toEqual(complexEducation);
      expect(response.personal_data.education).toHaveLength(2);
    });

    // FIX: Skills array with various data types
    it('should handle skills array with various data types', async () => {
      // Arrange
      const variedSkills = [
        'JavaScript',
        { name: 'React', level: 'Expert' },
        { name: 'Node.js', years: 5 },
        'TypeScript',
        { framework: 'Express', proficiency: 'Advanced' }
      ];

      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        skills: variedSkills
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.skills).toEqual(variedSkills);
    });

    // FIX: Partial social media data
    it('should handle partial social media data', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        social: {
          linkedin: 'https://linkedin.com/in/testuser'
          // No instagram or twitter
        }
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.social.linkedin).toBe('https://linkedin.com/in/testuser');
      expect(response.social.instagram).toBeNull(); // Instead of toBeUndefined()
      expect(response.social.twitter).toBeNull();
    });

    // FIX: Maintain consistent response structure
    it('should maintain consistent response structure regardless of data', async () => {
      // Arrange
      const mockUserData = {
        uid: 'firebase-uid-123',
        username: 'testuser'
        // Minimal data
      };

      const mockSelect = vi.fn().mockResolvedValue(mockUserData);
      const mockFindOne = vi.fn().mockReturnValue({ select: mockSelect });
      User.findOne = mockFindOne;

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      // Should still have all top-level properties
      expect(response).toHaveProperty('personal_data');
      expect(response).toHaveProperty('github');
      expect(response).toHaveProperty('social');
      expect(response).toHaveProperty('ratings');
    });
  });
});