// tests/unit/DSA_sheets/controllers/questionController.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Create mock functions for static methods
const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndDelete = vi.fn();
const mockInsertMany = vi.fn();

// Create a mock constructor that returns the input data
const QuestionModelMock = vi.fn((data) => data);

// Add static methods to the constructor
QuestionModelMock.find = mockFind;
QuestionModelMock.findOne = mockFindOne;
QuestionModelMock.findOneAndDelete = mockFindOneAndDelete;
QuestionModelMock.insertMany = mockInsertMany;

// Mock the QuestionModel module
vi.mock('../../../questions/models/questionModel.js', () => ({
  default: QuestionModelMock
}));

// Import after mocking
import * as questionController from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/DSA_sheets/controllers/questionController.js';

describe('Question Controller', () => {
  let mockRequest, mockResponse;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createQuestions', () => {
    it('should create multiple questions successfully', async () => {
      // Arrange
      const questionsData = [
        { q_id: 'Q1', title: 'Question 1', difficulty: 'easy' },
        { q_id: 'Q2', title: 'Question 2', difficulty: 'medium' }
      ];
      
      mockRequest.body = questionsData;
      
      const savedQuestions = [
        { _id: 'id1', q_id: 'Q1', title: 'Question 1', difficulty: 'easy' },
        { _id: 'id2', q_id: 'Q2', title: 'Question 2', difficulty: 'medium' }
      ];
      
      // Mock database operations
      mockFind.mockResolvedValue([]); // No existing questions
      mockInsertMany.mockResolvedValue(savedQuestions);

      // Act
      await questionController.createQuestions(mockRequest, mockResponse);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        q_id: { $in: ['Q1', 'Q2'] }
      });
      expect(QuestionModelMock).toHaveBeenCalledTimes(2); // Constructor called twice
      expect(mockInsertMany).toHaveBeenCalledWith([
        questionsData[0],
        questionsData[1]
      ]);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(savedQuestions);
    });

    it('should return 400 for empty array', async () => {
      // Arrange
      mockRequest.body = [];

      // Act
      await questionController.createQuestions(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid or empty array of questions provided.'
      });
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return 400 for non-array input', async () => {
      // Arrange
      mockRequest.body = { q_id: 'Q1' };

      // Act
      await questionController.createQuestions(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid or empty array of questions provided.'
      });
    });

    it('should return 409 for duplicate q_ids', async () => {
      // Arrange
      const questionsData = [
        { q_id: 'Q1', title: 'Question 1' },
        { q_id: 'Q2', title: 'Question 2' }
      ];
      
      mockRequest.body = questionsData;
      
      const existingQuestions = [
        { q_id: 'Q1', title: 'Existing Question' }
      ];
      
      mockFind.mockResolvedValue(existingQuestions);

      // Act
      await questionController.createQuestions(mockRequest, mockResponse);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        q_id: { $in: ['Q1', 'Q2'] }
      });
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Conflict',
        message: 'Questions with the following q_ids already exist: Q1.'
      });
      expect(mockInsertMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      const questionsData = [{ q_id: 'Q1', title: 'Question 1' }];
      mockRequest.body = questionsData;
      
      mockFind.mockRejectedValue(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await questionController.createQuestions(mockRequest, mockResponse);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating questions:',
        expect.any(Error)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.'
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('getQuestionByQId', () => {
    it('should get question by q_id successfully', async () => {
      // Arrange
      const q_id = 'Q123';
      mockRequest.body = { q_id };
      
      const mockQuestion = {
        _id: 'id123',
        q_id: 'Q123',
        title: 'Test Question',
        difficulty: 'medium'
      };
      
      mockFindOne.mockResolvedValue(mockQuestion);

      // Act
      await questionController.getQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({ q_id: 'Q123' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockQuestion);
    });

    it('should return 400 when q_id is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await questionController.getQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'q_id is required to get a question.'
      });
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should return 404 when question not found', async () => {
      // Arrange
      const q_id = 'NON_EXISTENT';
      mockRequest.body = { q_id };
      
      mockFindOne.mockResolvedValue(null);

      // Act
      await questionController.getQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({ q_id: 'NON_EXISTENT' });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Question not found.'
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const q_id = 'Q123';
      mockRequest.body = { q_id };
      
      mockFindOne.mockRejectedValue(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await questionController.getQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting question:',
        expect.any(Error)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.'
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('deleteQuestionByQId', () => {
    it('should delete question by q_id successfully', async () => {
      // Arrange
      const q_id = 'Q123';
      mockRequest.body = { q_id };
      
      const deletedQuestion = {
        _id: 'id123',
        q_id: 'Q123',
        title: 'Deleted Question'
      };
      
      mockFindOneAndDelete.mockResolvedValue(deletedQuestion);

      // Act
      await questionController.deleteQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockFindOneAndDelete).toHaveBeenCalledWith({ q_id: 'Q123' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Question deleted successfully.',
        deletedQuestion
      });
    });

    it('should return 400 when q_id is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await questionController.deleteQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'q_id is required for deletion.'
      });
      expect(mockFindOneAndDelete).not.toHaveBeenCalled();
    });

    it('should return 404 when question not found for deletion', async () => {
      // Arrange
      const q_id = 'NON_EXISTENT';
      mockRequest.body = { q_id };
      
      mockFindOneAndDelete.mockResolvedValue(null);

      // Act
      await questionController.deleteQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(mockFindOneAndDelete).toHaveBeenCalledWith({ q_id: 'NON_EXISTENT' });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Question not found for deletion.'
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const q_id = 'Q123';
      mockRequest.body = { q_id };
      
      mockFindOneAndDelete.mockRejectedValue(new Error('Database error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await questionController.deleteQuestionByQId(mockRequest, mockResponse);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleting question:',
        expect.any(Error)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.'
      });
      
      consoleSpy.mockRestore();
    });
  });
});