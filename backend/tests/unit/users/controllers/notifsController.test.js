// tests/unit/users/controllers/notifsController.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addSubscriber,
  deleteSubscriber,
  createTopic,
  addSubscriberToTopic,
  removeSubscriberFromTopic,
  TriggerContestNotifToTopic,
  updateDeviceID,
  getAllTopics
} from '../../../../users/controllers/notifsController.js';
import User from '../../../../users/models/User.js';
import { AllContest } from '../../../../contest/models/Contest.js';
import fetch from 'node-fetch';

// Mock all dependencies
vvi.mock('@novu/node', () => {
  const mockNovuInstance = {
    subscribers: {
      identify: vi.fn(),
      delete: vi.fn(),
      setCredentials: vi.fn()
    },
    topics: {
      create: vi.fn(),
      get: vi.fn(),
      addSubscribers: vi.fn(),
      removeSubscribers: vi.fn()
    },
    trigger: vi.fn()
  };

  const Novu = vi.fn(() => mockNovuInstance);
  
  // Add buildBackendUrl method if needed
  if (!Novu.buildBackendUrl) {
    Novu.buildBackendUrl = vi.fn(() => 'https://api.novu.co/v1');
  }

  return {
    Novu,
    ChatProviderIdEnum: {
      Discord: 'discord'
    }
  };
});

vi.mock('../../../../users/models/User.js');
vi.mock('../../../../contest/models/Contest.js');
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

describe('notifsController - Unit Tests', () => {
  let req, res, mockNovuInstance;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mocked Novu instance
    const NovuModule = require('@novu/node');
    mockNovuInstance = NovuModule.Novu();
    
    // Setup default mock implementations
    mockNovuInstance.subscribers.identify.mockResolvedValue({});
    mockNovuInstance.subscribers.delete.mockResolvedValue({});
    mockNovuInstance.subscribers.setCredentials.mockResolvedValue({});
    mockNovuInstance.topics.create.mockResolvedValue({});
    mockNovuInstance.topics.get.mockResolvedValue({ data: { key: 'test-topic' } });
    mockNovuInstance.topics.addSubscribers.mockResolvedValue({});
    mockNovuInstance.topics.removeSubscribers.mockResolvedValue({});
    mockNovuInstance.trigger.mockResolvedValue({});
    
    // Mock request object
    req = {
      decodedToken: {
        uid: 'firebase-uid-123',
        name: 'Test User',
        email: 'test@example.com'
      },
      body: {}
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Mock user
    User.findOne.mockResolvedValue({
      uid: 'firebase-uid-123',
      name: 'Test User',
      email: 'test@example.com'
    });
    
    // Set environment variables
    vi.stubEnv('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/test');
    vi.stubEnv('NOVU_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('addSubscriber', () => {
    it('should add subscriber successfully', async () => {
      // Act
      await addSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.identify).toHaveBeenCalledWith(
        'firebase-uid-123',
        {
          email: 'test@example.com',
          firstName: 'Test User'
        }
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added successfully'
      });
    });

    it('should handle Novu API error', async () => {
      // Arrange
      const error = new Error('Novu API error');
      mockNovuInstance.subscribers.identify.mockRejectedValue(error);

      // Act
      await addSubscriber(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Novu API error'
      });
    });

    it('should handle missing DISCORD_WEBHOOK_URL', async () => {
      // Arrange
      vi.stubEnv('DISCORD_WEBHOOK_URL', '');

      // Act
      await addSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalledWith(
        'firebase-uid-123',
        'discord',
        {
          webhookUrl: ''
        }
      );
    });
  });

  describe('deleteSubscriber', () => {
    it('should delete subscriber successfully', async () => {
      // Act
      await deleteSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.delete).toHaveBeenCalledWith(
        'firebase-uid-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber deleted successfully'
      });
    });

    it('should handle Novu deletion error', async () => {
      // Arrange
      const error = new Error('Delete failed');
      mockNovuInstance.subscribers.delete.mockRejectedValue(error);

      // Act
      await deleteSubscriber(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Delete failed'
      });
    });
  });

  describe('createTopic', () => {
    it('should create topic successfully', async () => {
      // Arrange
      req.body = {
        key: 'codeforces-notifs',
        name: 'Codeforces Notifications'
      };

      // Act
      await createTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.create).toHaveBeenCalledWith({
        key: 'codeforces-notifs',
        name: 'Codeforces Notifications'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic created successfully'
      });
    });

    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        key: 'codeforces-notifs'
        // Missing name
      };

      // Act
      await createTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.create).toHaveBeenCalledWith({
        key: 'codeforces-notifs',
        name: undefined
      });
    });

    it('should handle topic creation error', async () => {
      // Arrange
      req.body = { key: 'test', name: 'Test' };
      const error = new Error('Topic creation failed');
      mockNovuInstance.topics.create.mockRejectedValue(error);

      // Act
      await createTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Topic creation failed'
      });
    });
  });

  describe('addSubscriberToTopic', () => {
    it('should add subscriber to topic successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs'
      };

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.topics.addSubscribers).toHaveBeenCalledWith(
        'codeforces-notifs',
        {
          subscribers: ['firebase-uid-123']
        }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added to topic successfully'
      });
    });

    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = { topicKey: 'nonexistent-topic' };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
      expect(mockNovuInstance.topics.addSubscribers).not.toHaveBeenCalled();
    });

    it('should handle missing topicKey', async () => {
      // Arrange
      req.body = {};

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith(undefined);
    });

    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { topicKey: 'test-topic' };
      const error = new Error('API error');
      mockNovuInstance.topics.addSubscribers.mockRejectedValue(error);

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'API error'
      });
    });
  });

  describe('removeSubscriberFromTopic', () => {
    it('should remove subscriber from topic successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs'
      };

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.topics.removeSubscribers).toHaveBeenCalledWith(
        'codeforces-notifs',
        {
          subscribers: ['firebase-uid-123']
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber removed from topic successfully'
      });
    });

    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = { topicKey: 'nonexistent-topic' };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
    });

    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { topicKey: 'test-topic' };
      const error = new Error('Removal failed');
      mockNovuInstance.topics.removeSubscribers.mockRejectedValue(error);

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Removal failed'
      });
    });
  });

  describe('TriggerContestNotifToTopic', () => {
    it('should trigger contest notification successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs',
        contestVanity: 'codeforces-round-100'
      };

      const mockContest = {
        name: 'Codeforces Round 100',
        host: 'codeforces.com',
        vanity: 'codeforces-round-100',
        duration: 120, // 2 hours
        startTimeUnix: 1672531200, // Jan 1, 2023
        url: 'https://codeforces.com/contest/100'
      };

      AllContest.findOne.mockResolvedValue(mockContest);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(AllContest.findOne).toHaveBeenCalledWith({
        vanity: 'codeforces-round-100'
      });
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.trigger).toHaveBeenCalledWith('contest-alert', {
        to: [{ type: 'Topic', topicKey: 'codeforces-notifs' }],
        payload: {
          contest: {
            name: 'Codeforces Round 100',
            host: 'codeforces.com',
            vanity: 'codeforces-round-100',
            time: expect.any(String),
            duration: '2 hours 0 minutes',
            url: 'https://codeforces.com/contest/100'
          }
        }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification triggered successfully'
      });
    });

    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = {
        topicKey: 'nonexistent-topic',
        contestVanity: 'test-contest'
      };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
      expect(mockNovuInstance.trigger).not.toHaveBeenCalled();
    });

    it('should return 404 when contest does not exist', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs',
        contestVanity: 'nonexistent-contest'
      };
      AllContest.findOne.mockResolvedValue(null);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Contest not found'
      });
      expect(mockNovuInstance.trigger).not.toHaveBeenCalled();
    });

    it('should handle different duration formats correctly', async () => {
      // Arrange
      req.body = {
        topicKey: 'test-topic',
        contestVanity: 'test-contest'
      };

      const mockContest = {
        name: 'Test Contest',
        host: 'test.com',
        vanity: 'test-contest',
        duration: 61, // 1 hour 1 minute
        startTimeUnix: 1672531200,
        url: 'https://test.com/contest/1'
      };

      AllContest.findOne.mockResolvedValue(mockContest);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(mockNovuInstance.trigger).toHaveBeenCalledWith(
        'contest-alert',
        expect.objectContaining({
          payload: expect.objectContaining({
            contest: expect.objectContaining({
              duration: '1 hours 1 minutes'
            })
          })
        })
      );
    });

    it('should handle Novu trigger error', async () => {
      // Arrange
      req.body = {
        topicKey: 'test-topic',
        contestVanity: 'test-contest'
      };

      const mockContest = {
        name: 'Test Contest',
        host: 'test.com',
        vanity: 'test-contest',
        duration: 120,
        startTimeUnix: 1672531200,
        url: 'https://test.com/contest/1'
      };

      AllContest.findOne.mockResolvedValue(mockContest);
      const error = new Error('Trigger failed');
      mockNovuInstance.trigger.mockRejectedValue(error);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Trigger failed'
      });
    });
  });

  describe('updateDeviceID', () => {
    it('should update device ID successfully', async () => {
      // Arrange
      req.body = {
        deviceID: 'fcm-device-token-123'
      };

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'firebase-uid-123' });
      expect(mockNovuInstance.subscribers.identify).toHaveBeenCalledWith(
        'firebase-uid-123',
        {
          email: 'test@example.com',
          firstName: 'Test User'
        }
      );
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalledWith(
        'firebase-uid-123',
        'discord',
        {
          webhookUrl: 'https://discord.com/api/webhooks/test'
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(req.body);
    });

    it('should handle user not found', async () => {
      // Arrange
      req.body = { deviceID: 'test-token' };
      User.findOne.mockResolvedValue(null);

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { deviceID: 'test-token' };
      const error = new Error('Novu error');
      mockNovuInstance.subscribers.identify.mockRejectedValue(error);

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Novu error'
      });
    });

    it('should handle missing deviceID', async () => {
      // Arrange
      req.body = {};

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({});
    });
  });

  describe('getAllTopics', () => {
    it('should fetch all topics successfully', async () => {
      // Arrange
      const mockTopics = {
        data: [
          { key: 'codeforces-notifs', name: 'Codeforces Notifications' },
          { key: 'leetcode-notifs', name: 'LeetCode Notifications' }
        ]
      };

      fetch.default.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockTopics)
      });

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(fetch.default).toHaveBeenCalledWith('https://api.novu.co/v1/topics', {
        headers: {
          Authorization: 'ApiKey test-api-key'
        }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTopics);
    });

    it('should handle fetch API error', async () => {
      // Arrange
      const error = new Error('Network error');
      fetch.default.mockRejectedValue(error);

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Network error'
      });
    });

    it('should handle missing API key', async () => {
      // Arrange
      vi.stubEnv('NOVU_API_KEY', '');

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(fetch.default).toHaveBeenCalledWith('https://api.novu.co/v1/topics', {
        headers: {
          Authorization: 'ApiKey '
        }
      });
    });
  });
});