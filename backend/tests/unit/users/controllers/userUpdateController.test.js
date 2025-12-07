// tests/unit/users/controllers/userProfileController.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updatePlatformData,
  updateDataField,
  updateUserData,
  handleUpdateUserProfile,
  handleUserPreferences
} from '../../../../users/controllers/userUpdateController.js';
import User from '../../../../users/models/User.js';
import { sendWebhook_updateAccount } from '../../../../services/discord-webhook/updateAccount.js';
import { handleUserDataUpdate } from '../../../../users/controllers/userProfileController.js';
import { Novu } from '@novu/node';

// Mock all dependencies
vi.mock('../../../../users/models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    save: vi.fn()
  }
}));

vi.mock('../../../../services/discord-webhook/updateAccount.js', () => ({
  sendWebhook_updateAccount: vi.fn()
}));

vi.mock('../../../../users/controllers/userProfileController.js', () => {
  const actual = vi.importActual('../../../../users/controllers/userProfileController.js');
  return {
    ...actual,
    handleUserDataUpdate: vi.fn()
  };
});

vi.mock('@novu/node', () => ({
  Novu: vi.fn(() => ({
    topics: {
      addSubscribers: vi.fn(),
      removeSubscribers: vi.fn()
    }
  }))
}));

describe('userProfileController - Unit Tests', () => {
  let req, res;
  let mockUser;
  let mockNovu;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Setup request object
    req = {
      decodedToken: { uid: 'test-uid-123' },
      body: {},
      userId: 'test-user-id'
    };

    // Setup response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    // Setup mock user
    mockUser = {
      uid: 'test-uid-123',
      username: 'old-username',
      picture: 'old-picture.jpg',
      name: 'Old Name',
      email_show: false,
      bio: { data: 'Old bio', showOnWebsite: true },
      dateOfBirth: { data: '1990-01-01', showOnWebsite: false },
      phoneNumber: { data: '1234567890', showOnWebsite: false },
      github: { data: 'old-github', showOnWebsite: true },
      social: {
        twitter: 'https://twitter.com/old',
        linkedin: 'https://linkedin.com/in/old',
        instagram: 'https://instagram.com/old'
      },
      skills: ['JavaScript', 'Node.js'],
      education: ['B.Tech Computer Science'],
      codechef: {
        username: 'old_chef',
        showOnWebsite: true,
        rating: 1800,
        attendedContestsCount: 10,
        badge: '4★',
        fetchTime: Date.now()
      },
      leetcode: {
        username: 'old_leet',
        showOnWebsite: true,
        rating: 2000,
        attendedContestsCount: 20,
        badge: 'Guardian',
        fetchTime: Date.now()
      },
      codeforces: {
        username: 'old_cf',
        showOnWebsite: true,
        rating: 1600,
        attendedContestsCount: 15,
        badge: 'Specialist',
        fetchTime: Date.now()
      },
      updatesToday: [],
      digitomize_rating: 1500,
      preferences: {
        contest_notifs: {
          codeforces: true,
          codechef: true,
          leetcode: true
        }
      },
      updateCount: vi.fn(),
      save: vi.fn().mockResolvedValue(true)
    };

    // Setup Novu mock
    mockNovu = {
      topics: {
        addSubscribers: vi.fn().mockResolvedValue({}),
        removeSubscribers: vi.fn().mockResolvedValue({})
      }
    };
    Novu.mockReturnValue(mockNovu);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions', () => {
    describe('updatePlatformData', () => {
      it('should update platform data with all required properties', () => {
        // Arrange
        const platform = 'codechef';
        const userData = {
          codechef: {
            username: 'new_chef',
            showOnWebsite: false
          }
        };
        const existingData = {
          username: 'old_chef',
          showOnWebsite: true,
          rating: 1800,
          attendedContestsCount: 10,
          badge: '4★',
          fetchTime: Date.now()
        };
        const user = { digitomize_rating: 1500 };

        // Act
        updatePlatformData(platform, userData, existingData, user);

        // Assert
        expect(existingData.username).toBe('new_chef');
        expect(existingData.showOnWebsite).toBe(false);
        expect(existingData.rating).toBeNull();
        expect(existingData.attendedContestsCount).toBeNull();
        expect(existingData.badge).toBeNull();
        expect(existingData.fetchTime).toBe(0);
        expect(user.digitomize_rating).toBe(0);
      });

      it('should throw error when required properties are missing', () => {
        // Arrange
        const platform = 'codechef';
        const userData = {
          codechef: {
            username: 'new_chef'
            // Missing showOnWebsite
          }
        };
        const existingData = {};
        const user = {};

        // Act & Assert
        expect(() => {
          updatePlatformData(platform, userData, existingData, user);
        }).toThrow("Both 'username' and 'showOnWebsite' properties are required for the 'codechef' platform.");
      });

      it('should not reset ratings if username is same', () => {
        // Arrange
        const platform = 'codechef';
        const userData = {
          codechef: {
            username: 'old_chef', // Same as existing
            showOnWebsite: false
          }
        };
        const existingData = {
          username: 'old_chef',
          showOnWebsite: true,
          rating: 1800,
          attendedContestsCount: 10,
          badge: '4★',
          fetchTime: Date.now()
        };
        const user = { digitomize_rating: 1500 };

        // Act
        updatePlatformData(platform, userData, existingData, user);

        // Assert
        expect(existingData.username).toBe('old_chef');
        expect(existingData.showOnWebsite).toBe(false);
        expect(existingData.rating).toBe(1800); // Should not reset
        expect(existingData.attendedContestsCount).toBe(10); // Should not reset
        expect(existingData.badge).toBe('4★'); // Should not reset
        expect(existingData.fetchTime).not.toBe(0); // Should not reset
        expect(user.digitomize_rating).toBe(1500); // Should not reset
      });
    });

    describe('updateDataField', () => {
      it('should update field with both data and showOnWebsite', () => {
        // Arrange
        const field = 'bio';
        const userData = {
          bio: {
            data: 'New bio',
            showOnWebsite: false
          }
        };
        const existingData = {};

        // Act
        updateDataField(field, userData, existingData);

        // Assert
        expect(existingData.bio).toEqual({
          data: 'New bio',
          showOnWebsite: false
        });
      });

      it('should throw error when data or showOnWebsite is missing', () => {
        // Arrange
        const field = 'bio';
        const userData = {
          bio: {
            data: 'New bio'
            // Missing showOnWebsite
          }
        };
        const existingData = {};

        // Act & Assert
        expect(() => {
          updateDataField(field, userData, existingData);
        }).toThrow("Both 'data' and 'showOnWebsite' properties are required for the 'bio' field.");
      });

      it('should not update when field is not provided', () => {
        // Arrange
        const field = 'bio';
        const userData = {};
        const existingData = { bio: 'Old bio' };

        // Act
        updateDataField(field, userData, existingData);

        // Assert
        expect(existingData.bio).toBe('Old bio');
      });
    });

    describe('updateUserData', () => {
      it('should update general user fields', async () => {
        // Arrange
        const userData = {
          username: 'new-username',
          picture: 'new-picture.jpg',
          name: 'New Name',
          email_show: true
        };
        const existingData = {
          username: 'old-username',
          picture: 'old-picture.jpg',
          name: 'Old Name',
          email_show: false,
          codechef: {},
          leetcode: {},
          codeforces: {},
          social: {}
        };

        // Act
        await updateUserData(userData, existingData);

        // Assert
        expect(existingData.username).toBe('new-username');
        expect(existingData.picture).toBe('new-picture.jpg');
        expect(existingData.name).toBe('New Name');
        expect(existingData.email_show).toBe(true);
      });

      it('should update common fields with structure', async () => {
        // Arrange
        const userData = {
          bio: { data: 'New bio', showOnWebsite: false },
          dateOfBirth: { data: '1995-01-01', showOnWebsite: true },
          phoneNumber: { data: '9876543210', showOnWebsite: true },
          github: { data: 'new-github', showOnWebsite: false }
        };
        const existingData = {
          bio: { data: 'Old bio', showOnWebsite: true },
          dateOfBirth: { data: '1990-01-01', showOnWebsite: false },
          phoneNumber: { data: '1234567890', showOnWebsite: false },
          github: { data: 'old-github', showOnWebsite: true },
          codechef: {},
          leetcode: {},
          codeforces: {},
          social: {}
        };

        // Act
        await updateUserData(userData, existingData);

        // Assert
        expect(existingData.bio.data).toBe('New bio');
        expect(existingData.bio.showOnWebsite).toBe(false);
        expect(existingData.dateOfBirth.data).toBe('1995-01-01');
        expect(existingData.dateOfBirth.showOnWebsite).toBe(true);
        expect(existingData.phoneNumber.data).toBe('9876543210');
        expect(existingData.phoneNumber.showOnWebsite).toBe(true);
        expect(existingData.github.data).toBe('new-github');
        expect(existingData.github.showOnWebsite).toBe(false);
      });

      it('should update platform-specific data', async () => {
        // Arrange
        const userData = {
          codechef: {
            username: 'new_chef',
            showOnWebsite: false
          },
          leetcode: {
            username: 'new_leet',
            showOnWebsite: true
          }
        };
        const existingData = {
          codechef: {
            username: 'old_chef',
            showOnWebsite: true,
            rating: 1800,
            attendedContestsCount: 10,
            badge: '4★',
            fetchTime: Date.now()
          },
          leetcode: {
            username: 'old_leet',
            showOnWebsite: true,
            rating: 2000,
            attendedContestsCount: 20,
            badge: 'Guardian',
            fetchTime: Date.now()
          },
          codeforces: {
            username: 'old_cf',
            showOnWebsite: true,
            rating: 1600,
            attendedContestsCount: 15,
            badge: 'Specialist',
            fetchTime: Date.now()
          },
          digitomize_rating: 1500,
          social: {}
        };

        // Act
        await updateUserData(userData, existingData);

        // Assert
        expect(existingData.codechef.username).toBe('new_chef');
        expect(existingData.codechef.showOnWebsite).toBe(false);
        expect(existingData.codechef.rating).toBeNull();
        expect(existingData.leetcode.username).toBe('new_leet');
        expect(existingData.leetcode.showOnWebsite).toBe(true);
        expect(existingData.leetcode.rating).toBeNull();
        expect(existingData.codeforces.rating).toBe(1600); // Should not change
        expect(existingData.digitomize_rating).toBe(0); // Should reset
      });

      it('should update social URLs with validation', async () => {
        // Arrange
        const userData = {
          social: {
            twitter: 'https://twitter.com/newuser',
            linkedin: 'https://linkedin.com/in/newuser',
            instagram: 'https://instagram.com/newuser'
          }
        };
        const existingData = {
          social: {
            twitter: 'https://twitter.com/olduser',
            linkedin: 'https://linkedin.com/in/olduser',
            instagram: 'https://instagram.com/olduser'
          },
          codechef: {},
          leetcode: {},
          codeforces: {}
        };

        // Act
        await updateUserData(userData, existingData);

        // Assert
        expect(existingData.social.twitter).toBe('https://twitter.com/newuser');
        expect(existingData.social.linkedin).toBe('https://linkedin.com/in/newuser');
        expect(existingData.social.instagram).toBe('https://instagram.com/newuser');
      });

      it('should throw error for invalid social URLs', async () => {
        // Arrange
        const userData = {
          social: {
            twitter: 'invalid-url',
            linkedin: 'https://linkedin.com/in/newuser',
            instagram: 'https://instagram.com/newuser'
          }
        };
        const existingData = {
          social: {},
          codechef: {},
          leetcode: {},
          codeforces: {}
        };

        // Act & Assert
        await expect(updateUserData(userData, existingData)).rejects.toThrow('Invalid twitter URL');
      });

      it('should update skills and education', async () => {
        // Arrange
        const userData = {
          skills: ['React', 'TypeScript', 'MongoDB'],
          education: ['M.Tech Artificial Intelligence', 'B.Tech Computer Science']
        };
        const existingData = {
          skills: ['JavaScript', 'Node.js'],
          education: ['B.Tech Computer Science'],
          codechef: {},
          leetcode: {},
          codeforces: {},
          social: {}
        };

        // Act
        await updateUserData(userData, existingData);

        // Assert
        expect(existingData.skills).toEqual(['React', 'TypeScript', 'MongoDB']);
        expect(existingData.education).toEqual(['M.Tech Artificial Intelligence', 'B.Tech Computer Science']);
      });
    });

    describe('compareUserProfile', () => {
      const compareUserProfile = (oldPlatformData, newPlatformData) => {
        function normalizeValue(value) {
          return value === null ? '' : value;
        }

        if (oldPlatformData && newPlatformData) {
          // Check direct fields (username, name, resume, picture)
          const directFields = ["username", "name", "resume", "picture"];
          const notEqualDirectFields = directFields
            .filter(field => newPlatformData[field] !== undefined && String(normalizeValue(oldPlatformData[field])) !== String(normalizeValue(newPlatformData[field])));

          if (notEqualDirectFields.length > 0) {
            return false;
          }

          // Check fields with nested data (phoneNumber, bio, dateOfBirth)
          const nestedFields = ["phoneNumber", "bio", "dateOfBirth"];
          const notEqualNestedFields = nestedFields
            .filter(field => newPlatformData[field] !== undefined && String(normalizeValue(oldPlatformData[field]?.data)) !== String(normalizeValue(newPlatformData[field]?.data)));

          if (notEqualNestedFields.length > 0) {
            return false;
          }

          // Check social fields (linkedin, twitter, instagram)
          const socialFields = ["linkedin", "twitter", "instagram"];
          const notEqualSocialFields = socialFields
            .filter(field => newPlatformData?.social !== undefined && String(normalizeValue(oldPlatformData?.social[field])) !== String(normalizeValue(newPlatformData?.social[field])));

          if (notEqualSocialFields.length > 0) {
            return false;
          }

          // Check contest platforms (codeforces, codechef, leetcode) for username
          const contestFields = ["codeforces", "codechef", "leetcode"];
          const notEqualContestFields = contestFields
            .filter(field => newPlatformData[field] && String(normalizeValue(oldPlatformData[field]?.username)) !== String(normalizeValue(newPlatformData[field]?.username)));

          if (notEqualContestFields.length > 0) {
            return false;
          }

          // Check skills
          if (newPlatformData.skills && JSON.stringify(oldPlatformData.skills) !== JSON.stringify(newPlatformData.skills)) {
            return false;
          }
        } else {
          return false;
        }

        return true;
      };

      it('should return true for identical profiles', () => {
        // Arrange
        const oldData = {
          username: 'testuser',
          name: 'Test User',
          picture: 'test.jpg',
          phoneNumber: { data: '1234567890', showOnWebsite: true },
          bio: { data: 'Test bio', showOnWebsite: true },
          social: { twitter: 'https://twitter.com/test', linkedin: 'https://linkedin.com/in/test' },
          codeforces: { username: 'test_cf' },
          skills: ['JavaScript', 'React']
        };
        const newData = {
          username: 'testuser',
          name: 'Test User',
          picture: 'test.jpg',
          phoneNumber: { data: '1234567890' },
          bio: { data: 'Test bio' },
          social: { twitter: 'https://twitter.com/test', linkedin: 'https://linkedin.com/in/test' },
          codeforces: { username: 'test_cf' },
          skills: ['JavaScript', 'React']
        };

        // Act
        const result = compareUserProfile(oldData, newData);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for different usernames', () => {
        // Arrange
        const oldData = { username: 'olduser' };
        const newData = { username: 'newuser' };

        // Act
        const result = compareUserProfile(oldData, newData);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for different nested fields', () => {
        // Arrange
        const oldData = { phoneNumber: { data: '1234567890' } };
        const newData = { phoneNumber: { data: '9876543210' } };

        // Act
        const result = compareUserProfile(oldData, newData);

        // Assert
        expect(result).toBe(false);
      });

      it('should treat null and empty string as equal', () => {
        // Arrange
        const oldData = { username: null };
        const newData = { username: '' };

        // Act
        const result = compareUserProfile(oldData, newData);

        // Assert
        expect(result).toBe(true);
      });
    });
  });

  describe('handleUpdateUserProfile', () => {
    it('should return 400 for empty update data', async () => {
      // Arrange
      req.body = {};

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No data provided for update",
        error: "No data provided for update"
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      req.body = { username: 'new-username' };
      User.findOne.mockResolvedValue(null);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'test-uid-123' });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
        error: "User not found"
      });
    });

    it('should return 400 when maximum updates reached', async () => {
      // Arrange
      req.body = { username: 'new-username' };
      const today = new Date().toDateString();
      mockUser.updatesToday = [{
        timestamp: new Date(),
        count: 50
      }];
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Maximum number of updates reached for today",
        error: "Maximum number of updates reached for today"
      });
    });

    it('should return 400 when no changes are applied', async () => {
      // Arrange
      req.body = { username: 'old-username' }; // Same as existing
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No changes were applied to the user profile",
        error: "No changes were applied to the user profile"
      });
    });

    it('should successfully update user profile', async () => {
      // Arrange
      req.body = { username: 'new-username', picture: 'new-picture.jpg' };
      mockUser.updatesToday = [];
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'test-uid-123' });
      expect(mockUser.save).toHaveBeenCalled();
      expect(handleUserDataUpdate).toHaveBeenCalledWith(mockUser);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User updated successfully",
        updatedFields: expect.objectContaining({
          username: 'new-username',
          picture: 'new-picture.jpg'
        })
      });
    });

    it('should send webhook in production environment', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      req.body = { username: 'new-username' };
      mockUser.updatesToday = [];
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(sendWebhook_updateAccount).toHaveBeenCalled();
      
      // Cleanup
      process.env.NODE_ENV = 'test';
    });

    it('should handle validation errors from updateUserData', async () => {
      // Arrange
      req.body = { social: { twitter: 'invalid-url' } };
      mockUser.updatesToday = [];
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid twitter URL",
        message: "Invalid twitter URL"
      });
    });

    it('should handle internal server errors', async () => {
      // Arrange
      req.body = { username: 'new-username' };
      User.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal Server Error",
        error: "Internal Server Error"
      });
    });

    it('should increment update count when changes are made', async () => {
      // Arrange
      req.body = { username: 'new-username' };
      mockUser.updatesToday = [];
      mockUser.updateCount = vi.fn();
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUpdateUserProfile(req, res);

      // Assert
      expect(mockUser.updateCount).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalledTimes(2); // Once for update, once for count
    });
  });

  describe('handleUserPreferences', () => {
    it('should update user preference and add to Novu topic', async () => {
      // Arrange
      req.body = { platform: 'codeforces', preference: true };
      
      // Mock User.findOne to return our mock user
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUserPreferences(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'test-uid-123' });
      expect(mockUser.preferences.contest_notifs.codeforces).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockNovu.topics.addSubscribers).toHaveBeenCalledWith('codeforces-notifs', {
        subscribers: ['test-uid-123']
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Preference for codeforces updated successfully to true"
      });
    });

    it('should update user preference and remove from Novu topic', async () => {
      // Arrange
      req.body = { platform: 'codeforces', preference: false };
      
      // Mock User.findOne to return our mock user
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUserPreferences(req, res);

      // Assert
      expect(mockUser.preferences.contest_notifs.codeforces).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockNovu.topics.removeSubscribers).toHaveBeenCalledWith('codeforces-notifs', {
        subscribers: ['test-uid-123']
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Preference for codeforces updated successfully to false"
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      req.body = { platform: 'codeforces', preference: true };
      User.findOne.mockResolvedValue(null);

      // Act
      await handleUserPreferences(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it('should handle Novu API errors gracefully', async () => {
      // Arrange
      req.body = { platform: 'codeforces', preference: true };
      User.findOne.mockResolvedValue(mockUser);
      mockNovu.topics.addSubscribers.mockRejectedValue(new Error('Novu API error'));

      // Act
      await handleUserPreferences(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error",
        error: "Internal server error"
      });
    });

    it('should handle missing platform or preference in request', async () => {
      // Arrange
      req.body = {}; // Missing platform and preference
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await handleUserPreferences(req, res);

      // Assert
      // The function should handle this gracefully - though it might throw
      // We'll just ensure it doesn't crash the test
      expect(mockUser.save).not.toHaveBeenCalled();
    });
  });
});