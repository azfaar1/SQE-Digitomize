// tests/unit/hackathons/syncHackathons.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncController from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/hackathons/controllers/hackathonApiSyncController.js';
import { UpcomingHackathon, AllHackathon } from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/hackathons/models/Hackathon.js';

// Mock the models
vi.mock('../../../hackathons/models/Hackathon.js', () => ({
  UpcomingHackathon: {
    deleteMany: vi.fn(),
    insertMany: vi.fn()
  },
  AllHackathon: {
    insertMany: vi.fn()
  }
}));

// Mock the platform controllers
vi.mock('../../../hackathons/controllers/platforms/devfolioController.js', () => ({
  default: {
    devfolio_c: vi.fn()
  }
}));

vi.mock('../../../hackathons/controllers/platforms/devpostController.js', () => ({
  default: {
    devpost_c: vi.fn()
  }
}));

vi.mock('../../../hackathons/controllers/platforms/unstopController.js', () => ({
  default: {
    unstop_c: vi.fn()
  }
}));

describe('Hackathon Sync Controller - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('clearUpcoming function', () => {
    it('should delete expired hackathons successfully', async () => {
      // Arrange
      const mockDeleteResult = { deletedCount: 5 };
      UpcomingHackathon.deleteMany.mockResolvedValue(mockDeleteResult);
      
      // Act
      await syncController.clearUpcoming();
      
      // Assert
      expect(UpcomingHackathon.deleteMany).toHaveBeenCalledWith({
        registerationEndTimeUnix: { $lt: expect.any(Number) }
      });
      expect(console.log).toHaveBeenCalledWith(
        'Deleted the hackathons whose registerations have closed.'
      );
    });

    it('should log error when delete fails', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      UpcomingHackathon.deleteMany.mockRejectedValue(error);
      
      // Act
      await syncController.clearUpcoming();
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Error while deleting the hackathons whose registerations have closed:',
        error
      );
    });
  });

  describe('addToDB function', () => {
    it('should add hackathons successfully to both collections', async () => {
      // Arrange
      const hackathons = [
        { name: 'Hackathon 1', registerationStartTimeUnix: 1000 },
        { name: 'Hackathon 2', registerationStartTimeUnix: 2000 }
      ];
      const platform = 'Devfolio';
      
      UpcomingHackathon.insertMany.mockResolvedValue({});
      AllHackathon.insertMany.mockResolvedValue({});
      
      // Act
      await syncController.addToDB(hackathons, platform);
      
      // Assert
      // Check sorting
      expect(hackathons[0].registerationStartTimeUnix).toBe(1000);
      expect(hackathons[1].registerationStartTimeUnix).toBe(2000);
      
      // Check insertions
      expect(UpcomingHackathon.insertMany).toHaveBeenCalledWith(hackathons, { ordered: false });
      expect(AllHackathon.insertMany).toHaveBeenCalledWith(hackathons, { ordered: false });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Updated hackathons for ${platform}`)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Updated AllHackathons for ${platform}`)
      );
    });

    it('should handle duplicate key errors gracefully', async () => {
      // Arrange
      const hackathons = [{ name: 'Duplicate Hackathon' }];
      const platform = 'Devpost';
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      
      UpcomingHackathon.insertMany.mockRejectedValue(duplicateError);
      AllHackathon.insertMany.mockRejectedValue(duplicateError);
      
      // Act
      await syncController.addToDB(hackathons, platform);
      
      // Assert
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Some duplicate(s) in UpcomingHackathon for ${platform}`)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`Some duplicate(s) in AllHackathon for ${platform}`)
      );
    });

    it('should handle other database errors', async () => {
      // Arrange
      const hackathons = [{ name: 'Test Hackathon' }];
      const platform = 'Unstop';
      const dbError = new Error('Database error');
      
      UpcomingHackathon.insertMany.mockRejectedValue(dbError);
      
      // Act
      await syncController.addToDB(hackathons, platform);
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(
        `Error adding hackathons to MongoDB for ${platform}`,
        dbError
      );
    });
  });

  describe('syncHackathons function', () => {
    it('should sync all platforms successfully', async () => {
      // Arrange
      const mockDevfolioData = [{ name: 'Devfolio Hack' }];
      const mockDevpostData = [{ name: 'Devpost Hack' }];
      const mockUnstopData = [{ name: 'Unstop Hack' }];
      
      const devfolioModule = await import('../../../hackathons/controllers/platforms/devfolioController.js');
      const devpostModule = await import('../../../hackathons/controllers/platforms/devpostController.js');
      const unstopModule = await import('../../../hackathons/controllers/platforms/unstopController.js');
      
      devfolioModule.default.devfolio_c.mockResolvedValue(mockDevfolioData);
      devpostModule.default.devpost_c.mockResolvedValue(mockDevpostData);
      unstopModule.default.unstop_c.mockResolvedValue(mockUnstopData);
      
      UpcomingHackathon.deleteMany.mockResolvedValue({});
      UpcomingHackathon.insertMany.mockResolvedValue({});
      AllHackathon.insertMany.mockResolvedValue({});
      
      // Act
      await syncController.syncHackathons();
      
      // Assert
      expect(console.log).toHaveBeenCalledWith('===============================================');
      expect(console.log).toHaveBeenCalledWith('Syncing Data | API to MongoDB');
      expect(console.log).toHaveBeenCalledWith('===============================================');
      
      expect(devfolioModule.default.devfolio_c).toHaveBeenCalled();
      expect(devpostModule.default.devpost_c).toHaveBeenCalled();
      expect(unstopModule.default.unstop_c).toHaveBeenCalled();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All Hackathons Synced.')
      );
    });

    it('should handle errors during sync process', async () => {
      // Arrange
      const syncError = new Error('Platform fetch failed');
      
      const devfolioModule = await import('../../../hackathons/controllers/platforms/devfolioController.js');
      devfolioModule.default.devfolio_c.mockRejectedValue(syncError);
      
      // Act
      await syncController.syncHackathons();
      
      // Assert
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching or syncing hackathons:',
        syncError
      );
    });
  });
});