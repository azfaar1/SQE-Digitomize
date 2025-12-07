import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addSubscriber,
  deleteSubscriber,
  createTopic,
  addSubscriberToTopic,
  removeSubscriberFromTopic,
  TriggerContestNotifToTopic,
  updateDeviceID,
  getAllTopics,
} from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/users/controllers/notifsController.js';
import { Novu, ChatProviderIdEnum } from '@novu/node';
import User from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/users/models/User.js';
import { AllContest } from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/contest/models';

// Mock dependencies
vi.mock('@novu/node');
vi.mock('../models/User.js');
vi.mock('../../contest/models/Contest.js');

describe('Novu Controller Tests', () => {
  let req, res, novuMock;

  beforeEach(() => {
    // Setup request and response mocks
    req = {
      decodedToken: {
        name: 'John Doe',
        email: 'john@example.com',
        uid: 'user123',
      },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Setup Novu mock
    novuMock = {
      subscribers: {
        identify: vi.fn().mockResolvedValue({}),
        setCredentials: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
      topics: {
        create: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ key: 'topic1' }),
        addSubscribers: vi.fn().mockResolvedValue({}),
        removeSubscribers: vi.fn().mockResolvedValue({}),
      },
      trigger: vi.fn().mockResolvedValue({}),
    };

    Novu.mockImplementation(() => novuMock);

    // Clear environment variables
    process.env.NOVU_API_KEY = 'test-api-key';
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.webhook.url';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addSubscriber', () => {
    it('should add a subscriber successfully', async () => {
      await addSubscriber(req, res);

      expect(novuMock.subscribers.identify).toHaveBeenCalledWith('user123', {
        email: 'john@example.com',
        firstName: 'John Doe',
      });
      expect(novuMock.subscribers.setCredentials).toHaveBeenCalledWith(
        'user123',
        ChatProviderIdEnum.Discord,
        { webhookUrl: 'https://discord.webhook.url' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added successfully',
      });
    });

    it('should handle errors when adding subscriber fails', async () => {
      const error = new Error('Novu API error');
      novuMock.subscribers.identify.mockRejectedValue(error);

      await addSubscriber(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Novu API error',
      });
    });
  });

  describe('deleteSubscriber', () => {
    it('should delete a subscriber successfully', async () => {
      await deleteSubscriber(req, res);

      expect(novuMock.subscribers.delete).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber deleted successfully',
      });
    });

    it('should handle errors when deleting subscriber fails', async () => {
      const error = new Error('Delete failed');
      novuMock.subscribers.delete.mockRejectedValue(error);

      await deleteSubscriber(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Delete failed',
      });
    });
  });

  describe('createTopic', () => {
    it('should create a topic successfully', async () => {
      req.body = { key: 'topic1', name: 'Topic 1' };

      await createTopic(req, res);

      expect(novuMock.topics.create).toHaveBeenCalledWith({
        key: 'topic1',
        name: 'Topic 1',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic created successfully',
      });
    });

    it('should handle errors when creating topic fails', async () => {
      req.body = { key: 'topic1', name: 'Topic 1' };
      const error = new Error('Create topic failed');
      novuMock.topics.create.mockRejectedValue(error);

      await createTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Create topic failed',
      });
    });
  });

  describe('addSubscriberToTopic', () => {
    it('should add subscriber to topic successfully', async () => {
      req.body = { topicKey: 'topic1' };

      await addSubscriberToTopic(req, res);

      expect(novuMock.topics.get).toHaveBeenCalledWith('topic1');
      expect(novuMock.topics.addSubscribers).toHaveBeenCalledWith('topic1', {
        subscribers: ['user123'],
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added to topic successfully',
      });
    });

    it('should return 404 if topic not found', async () => {
      req.body = { topicKey: 'topic1' };
      novuMock.topics.get.mockResolvedValue(null);

      await addSubscriberToTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Topic not found' });
    });

    it('should handle errors when adding subscriber to topic fails', async () => {
      req.body = { topicKey: 'topic1' };
      const error = new Error('Add subscriber failed');
      novuMock.topics.addSubscribers.mockRejectedValue(error);

      await addSubscriberToTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Add subscriber failed',
      });
    });
  });

  describe('removeSubscriberFromTopic', () => {
    it('should remove subscriber from topic successfully', async () => {
      req.body = { topicKey: 'topic1' };

      await removeSubscriberFromTopic(req, res);

      expect(novuMock.topics.get).toHaveBeenCalledWith('topic1');
      expect(novuMock.topics.removeSubscribers).toHaveBeenCalledWith('topic1', {
        subscribers: ['user123'],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber removed from topic successfully',
      });
    });

    it('should return 404 if topic not found', async () => {
      req.body = { topicKey: 'topic1' };
      novuMock.topics.get.mockResolvedValue(null);

      await removeSubscriberFromTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Topic not found' });
    });

    it('should handle errors when removing subscriber from topic fails', async () => {
      req.body = { topicKey: 'topic1' };
      const error = new Error('Remove subscriber failed');
      novuMock.topics.removeSubscribers.mockRejectedValue(error);

      await removeSubscriberFromTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Remove subscriber failed',
      });
    });
  });

  describe('TriggerContestNotifToTopic', () => {
    it('should trigger contest notification successfully', async () => {
      req.body = { topicKey: 'topic1', contestVanity: 'contest123' };

      const mockContest = {
        name: 'Test Contest',
        host: 'Test Host',
        vanity: 'contest123',
        startTimeUnix: 1609459200, // Jan 1, 2021
        duration: 150,
        url: 'https://contest.url',
      };

      AllContest.findOne = vi.fn().mockResolvedValue(mockContest);

      await TriggerContestNotifToTopic(req, res);

      expect(AllContest.findOne).toHaveBeenCalledWith({ vanity: 'contest123' });
      expect(novuMock.topics.get).toHaveBeenCalledWith('topic1');
      expect(novuMock.trigger).toHaveBeenCalledWith('contest-alert', {
        to: [{ type: 'Topic', topicKey: 'topic1' }],
        payload: {
          contest: {
            name: 'Test Contest',
            host: 'Test Host',
            vanity: 'contest123',
            time: expect.any(String),
            duration: '2 hours 30 minutes',
            url: 'https://contest.url',
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification triggered successfully',
      });
    });

    it('should return 404 if topic not found', async () => {
      req.body = { topicKey: 'topic1', contestVanity: 'contest123' };
      novuMock.topics.get.mockResolvedValue(null);

      await TriggerContestNotifToTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Topic not found' });
    });

    it('should return 404 if contest not found', async () => {
      req.body = { topicKey: 'topic1', contestVanity: 'contest123' };
      AllContest.findOne = vi.fn().mockResolvedValue(null);

      await TriggerContestNotifToTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contest not found' });
    });

    it('should handle errors when triggering notification fails', async () => {
      req.body = { topicKey: 'topic1', contestVanity: 'contest123' };
      const error = new Error('Trigger failed');
      AllContest.findOne = vi.fn().mockRejectedValue(error);

      await TriggerContestNotifToTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Trigger failed',
      });
    });
  });

  describe('updateDeviceID', () => {
    it('should update device ID successfully', async () => {
      req.body = { deviceID: 'device123' };

      const mockUser = {
        uid: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      User.findOne = vi.fn().mockResolvedValue(mockUser);

      await updateDeviceID(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ uid: 'user123' });
      expect(novuMock.subscribers.identify).toHaveBeenCalledWith('user123', {
        email: 'john@example.com',
        firstName: 'John Doe',
      });
      expect(novuMock.subscribers.setCredentials).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ deviceID: 'device123' });
    });

    it('should handle errors when updating device ID fails', async () => {
      req.body = { deviceID: 'device123' };
      const error = new Error('User not found');
      User.findOne = vi.fn().mockRejectedValue(error);

      await updateDeviceID(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'User not found',
      });
    });
  });

  describe('getAllTopics', () => {
    it('should get all topics successfully', async () => {
      const mockTopics = { data: [{ key: 'topic1', name: 'Topic 1' }] };

      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockTopics),
      });

      await getAllTopics(req, res);

      expect(global.fetch).toHaveBeenCalledWith('https://api.novu.co/v1/topics', {
        headers: {
          Authorization: 'ApiKey test-api-key',
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTopics);
    });

    it('should handle errors when getting topics fails', async () => {
      const error = new Error('Fetch failed');
      global.fetch = vi.fn().mockRejectedValue(error);

      await getAllTopics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Fetch failed',
      });
    });
  });
});