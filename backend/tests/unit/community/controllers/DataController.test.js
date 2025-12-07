// Minimal essential tests
describe('Community Controller - Essential Tests', () => {
  describe('createCommunity', () => {
    it('should create community for admin user', async () => {
      mockRequest.decodedToken = { uid: 'admin123' };
      mockRequest.body = { name: 'Test' };
      
      User.findOne.mockResolvedValue({ uid: 'admin123', role: ROLE.ADMIN });
      getUser.mockResolvedValue({ uid: 'admin123' });
      Community.prototype.save = vi.fn().mockResolvedValue({ _id: 'new-comm' });
      CommunityMember.prototype.save = vi.fn().mockResolvedValue({});
      User.updateOne.mockResolvedValue({});

      await CommunityController.createCommunity(mockRequest, mockResponse);
      
      expect(success).toHaveBeenCalled();
    });
  });

  describe('updateCommunity', () => {
    it('should update community when valid ID provided', async () => {
      mockRequest.body = { communityId: 'comm123', name: 'New Name' };
      
      Community.findOne.mockResolvedValue({ _id: 'comm123', name: 'Old Name' });
      Community.updateOne.mockResolvedValue({});

      await CommunityController.updateCommunity(mockRequest, mockResponse);
      
      expect(success).toHaveBeenCalled();
    });
  });

  describe('deleteCommunity', () => {
    it('should delete community when valid ID provided', async () => {
      mockRequest.body = { communityId: 'comm123' };
      
      Community.deleteOne.mockResolvedValue({});
      CommunityMember.deleteMany.mockResolvedValue({});

      await CommunityController.deleteCommunity(mockRequest, mockResponse);
      
      expect(success).toHaveBeenCalled();
    });
  });
});