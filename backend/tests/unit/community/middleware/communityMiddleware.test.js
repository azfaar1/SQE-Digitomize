// tests/unit/community/middleware/communityMiddleware.minimal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock
vi.mock('../../../../core/api/response.api.js', () => ({ error: vi.fn() }));
vi.mock('../../../../core/const.js', () => ({ 
  ROLE: { COMMUNITY_ADMIN: 2, COMMUNITY_MEMBER: 1 } 
}));
vi.mock('../../../../users/models/User.js', () => ({ 
  default: { findOne: vi.fn() } 
}));
vi.mock('../../../../community/models/CommunityMember.js', () => ({ 
  default: { findOne: vi.fn() } 
}));

import { communityAdminCheck, communityMemberCheck } from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/community/middlewares/communityMiddleware.js';
import User from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/users/models/User.js';
import CommunityMember from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/community/models/CommunityMember.js';

describe('Community Middleware - Minimal', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, decodedToken: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
  });

  describe('communityAdminCheck', () => {
    it('allows admin access', async () => {
      req.decodedToken.uid = 'user1';
      req.body.communityId = 'comm1';
      
      User.findOne.mockResolvedValue({ uid: 'user1' });
      CommunityMember.findOne.mockResolvedValue({ 
        uid: 'user1', 
        communityId: 'comm1', 
        role: 2 // ADMIN
      });

      await communityAdminCheck(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks non-admin', async () => {
      req.decodedToken.uid = 'user1';
      req.body.communityId = 'comm1';
      
      User.findOne.mockResolvedValue({ uid: 'user1' });
      CommunityMember.findOne.mockResolvedValue({ 
        uid: 'user1', 
        communityId: 'comm1', 
        role: 1 // MEMBER, not admin
      });

      await communityAdminCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('communityMemberCheck', () => {
    it('allows member access', async () => {
      req.decodedToken.uid = 'user1';
      req.body.communityId = 'comm1';
      
      User.findOne.mockResolvedValue({ uid: 'user1' });
      CommunityMember.findOne.mockResolvedValue({ 
        uid: 'user1', 
        communityId: 'comm1', 
        role: 1 // MEMBER
      });

      await communityMemberCheck(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('blocks non-member', async () => {
      req.decodedToken.uid = 'user1';
      req.body.communityId = 'comm1';
      
      User.findOne.mockResolvedValue({ uid: 'user1' });
      CommunityMember.findOne.mockResolvedValue(null); // Not in community

      await communityMemberCheck(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});