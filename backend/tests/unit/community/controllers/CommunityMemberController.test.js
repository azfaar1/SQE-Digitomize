// tests/unit/community/controllers/CommunityMemberController.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// IMPORTANT: Mock ALL dependencies BEFORE importing the controller
// Create mock functions that will be used in the mocks
const mockError = vi.fn();
const mockSuccess = vi.fn();
const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockUpdateOne = vi.fn();
const mockDeleteOne = vi.fn();
const mockSave = vi.fn();
const mockUserAddCommunity = vi.fn();
const mockUserRemoveCommunity = vi.fn();

// Mock the response.api.js module
vi.mock('../../../core/api/response.api.js', () => {
  return {
    error: mockError,
    success: mockSuccess
  };
});

// Mock the const.js module
vi.mock('../../../core/const.js', () => {
  return {
    ROLE: {
      COMMUNITY_MEMBER: 1,
      COMMUNITY_ADMIN: 2,
      COMMUNITY_SUPER_ADMIN: 3
    }
  };
});

// Mock the CommunityMember model - THIS IS CRITICAL
vi.mock('../../../community/models/CommunityMember.js', () => {
  // Create a mock class constructor
  const MockCommunityMemberClass = vi.fn(function(data) {
    if (data) {
      this.communityId = data.communityId;
      this.uid = data.uid;
      this.role = data.role;
      this._doc = { ...data };
    }
    this.save = mockSave;
  });

  // Add static methods to the class
  MockCommunityMemberClass.find = mockFind;
  MockCommunityMemberClass.findOne = mockFindOne;
  MockCommunityMemberClass.updateOne = mockUpdateOne;
  MockCommunityMemberClass.deleteOne = mockDeleteOne;

  // Return the mock class as default export
  return {
    default: MockCommunityMemberClass
  };
});

// Mock the user services
vi.mock('../../../community/services/user.js', () => {
  return {
    userAddCommunity: mockUserAddCommunity,
    userRemoveCommunity: mockUserRemoveCommunity
  };
});

// NOW import the controller - this is important!
import * as CommunityMemberController from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/community/controllers/CommunityMemberController.js';

describe('Community Member Controller', () => {
  let mockRequest, mockResponse;
  let mockCommunityMember;

  beforeEach(() => {
    // Clear ALL mocks
    vi.clearAllMocks();
    
    // Reset the mock implementations
    mockError.mockClear();
    mockSuccess.mockClear();
    mockFind.mockClear();
    mockFindOne.mockClear();
    mockUpdateOne.mockClear();
    mockDeleteOne.mockClear();
    mockSave.mockClear();
    mockUserAddCommunity.mockClear();
    mockUserRemoveCommunity.mockClear();
    
    // Setup mock request
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    // Setup mock response
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    // Setup mock community member
    mockCommunityMember = {
      _id: 'member-123',
      communityId: 'community-123',
      uid: 'user-123',
      role: 1,
      _doc: {
        _id: 'member-123',
        communityId: 'community-123',
        uid: 'user-123',
        role: 1
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommunityMemberList', () => {
    it('should return community member list successfully', async () => {
      // Arrange
      mockRequest.body = { communityId: 'community-123' };
      
      const mockMembers = [
        { ...mockCommunityMember },
        { ...mockCommunityMember, uid: 'user-456', _id: 'member-456' }
      ];
      
      // Mock the find method to return the members
      mockFind.mockResolvedValue(mockMembers);

      // Act
      await CommunityMemberController.getCommunityMemberList(mockRequest, mockResponse);

      // Assert
      expect(mockFind).toHaveBeenCalledWith({
        communityId: 'community-123'
      });
      expect(mockSuccess).toHaveBeenCalledWith(
        mockMembers,
        mockResponse,
        200,
        'Community Member List'
      );
    });

    it('should return error when communityId is null', async () => {
      // Arrange
      mockRequest.body = { communityId: null };

      // Act
      await CommunityMemberController.getCommunityMemberList(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        400,
        'Community ID cannot be null'
      );
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockRequest.body = { communityId: 'community-123' };
      
      // Mock database error
      mockFind.mockRejectedValue(new Error('Database error'));

      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      const result = await CommunityMemberController.getCommunityMemberList(mockRequest, mockResponse);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching Community Member List',
        expect.any(Error)
      );
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateCommunityMember', () => {
    it('should update community member role successfully', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 2
      };

      mockFindOne.mockResolvedValue(mockCommunityMember);
      mockUpdateOne.mockResolvedValue({});

      // Act
      await CommunityMemberController.updateCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({
        communityId: 'community-123',
        uid: 'user-123'
      });
      
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { communityId: 'community-123', uid: 'user-123' },
        {
          $set: {
            ...mockCommunityMember,
            role: 2
          },
          $currentDate: { lastUpdated: true }
        }
      );
      
      expect(mockSuccess).toHaveBeenCalledWith(
        { ...mockCommunityMember._doc, role: 2 },
        mockResponse,
        200,
        'Community Member Updated!!'
      );
    });

    it('should return error when communityId is null', async () => {
      // Arrange
      mockRequest.body = {
        communityId: null,
        uid: 'user-123',
        role: 2
      };

      // Act
      await CommunityMemberController.updateCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        400,
        'Community ID cannot be null'
      );
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should return error when member not found', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 2
      };

      mockFindOne.mockResolvedValue(null);

      // Act
      await CommunityMemberController.updateCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        400,
        'No Community Member Found!!'
      );
      expect(mockUpdateOne).not.toHaveBeenCalled();
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 2
      };

      mockFindOne.mockRejectedValue(new Error('Database error'));

      // Act
      await CommunityMemberController.updateCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Something went wrong!!'
      });
    });
  });

  describe('addCommunityMember', () => {
    it('should add new community member successfully', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 1
      };

      mockFindOne.mockResolvedValue(null); // No existing member
      mockSave.mockResolvedValue({
        communityId: 'community-123',
        uid: 'user-123',
        role: 1,
        _doc: {
          communityId: 'community-123',
          uid: 'user-123',
          role: 1
        }
      });
      mockUserAddCommunity.mockResolvedValue(true);

      // Act
      await CommunityMemberController.addCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({
        communityId: 'community-123',
        uid: 'user-123'
      });
      
      // Check that save was called
      expect(mockSave).toHaveBeenCalled();
      
      expect(mockUserAddCommunity).toHaveBeenCalledWith('community-123', 'user-123');
      
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'community-123',
          uid: 'user-123',
          role: 1
        }),
        mockResponse,
        200,
        'Community Member Added!!'
      );
    });

    it('should use default role when role is not provided', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123'
        // role not provided
      };

      mockFindOne.mockResolvedValue(null);
      mockSave.mockResolvedValue({
        communityId: 'community-123',
        uid: 'user-123',
        role: 1, // Default role
        _doc: {
          communityId: 'community-123',
          uid: 'user-123',
          role: 1
        }
      });
      mockUserAddCommunity.mockResolvedValue(true);

      // Act
      await CommunityMemberController.addCommunityMember(mockRequest, mockResponse);

      // Assert
      // The controller should use ROLE.COMMUNITY_MEMBER (which is 1) as default
      expect(mockSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 1
        }),
        mockResponse,
        200,
        'Community Member Added!!'
      );
    });

    it('should return error when communityId is null', async () => {
      // Arrange
      mockRequest.body = {
        communityId: null,
        uid: 'user-123',
        role: 1
      };

      // Act
      await CommunityMemberController.addCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        400,
        'Community ID cannot be null'
      );
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should return error when member already exists', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 1
      };

      mockFindOne.mockResolvedValue(mockCommunityMember);

      // Act
      await CommunityMemberController.addCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        403,
        'Member Already Exist!!'
      );
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockUserAddCommunity).not.toHaveBeenCalled();
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123',
        role: 1
      };

      mockFindOne.mockRejectedValue(new Error('Database error'));

      // Act
      await CommunityMemberController.addCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Something went wrong!!'
      });
    });
  });

  describe('deleteCommunityMember', () => {
    it('should delete community member successfully', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123'
      };

      mockFindOne.mockResolvedValue(mockCommunityMember);
      mockDeleteOne.mockResolvedValue({});
      mockUserRemoveCommunity.mockResolvedValue(true);

      // Act
      await CommunityMemberController.deleteCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockFindOne).toHaveBeenCalledWith({
        communityId: 'community-123',
        uid: 'user-123'
      });
      
      expect(mockDeleteOne).toHaveBeenCalledWith({
        communityId: 'community-123',
        uid: 'user-123'
      });
      
      expect(mockUserRemoveCommunity).toHaveBeenCalledWith('community-123', 'user-123');
      
      expect(mockSuccess).toHaveBeenCalledWith(
        {},
        mockResponse,
        200,
        'Community Member Removed!!'
      );
    });

    it('should return error when communityId is null', async () => {
      // Arrange
      mockRequest.body = {
        communityId: null,
        uid: 'user-123'
      };

      // Act
      await CommunityMemberController.deleteCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        400,
        'Community ID cannot be null'
      );
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it('should return error when member does not exist', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123'
      };

      mockFindOne.mockResolvedValue(null);

      // Act
      await CommunityMemberController.deleteCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockError).toHaveBeenCalledWith(
        mockResponse,
        403,
        "Member Doesn't Exist!!"
      );
      expect(mockDeleteOne).not.toHaveBeenCalled();
      expect(mockUserRemoveCommunity).not.toHaveBeenCalled();
    });

    it('should handle errors and return 500 status', async () => {
      // Arrange
      mockRequest.body = {
        communityId: 'community-123',
        uid: 'user-123'
      };

      mockFindOne.mockRejectedValue(new Error('Database error'));

      // Act
      await CommunityMemberController.deleteCommunityMember(mockRequest, mockResponse);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Something went wrong!!'
      });
    });
  });
});