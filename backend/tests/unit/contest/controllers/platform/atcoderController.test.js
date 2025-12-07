// tests/unit/contest/controllers/platforms/atcoderController.simple.test.js
import { describe, it, expect, vi } from 'vitest';

// Mock cheerio properly
vi.mock('cheerio', () => ({
  default: {
    load: vi.fn()
  }
}));

// Mock https
vi.mock('https', () => ({
  default: {
    get: vi.fn()
  }
}));

// Import after mocking
import https from 'https';
import cheerio from 'cheerio';
import atcoderController from 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend/contest/controllers/platforms/atcoderController.js';

describe('AtCoder Controller - Simple', () => {
  it('returns empty array on network error', async () => {
    // Setup error
    https.get.mockImplementation(() => {
      throw new Error('Network error');
    });
    
    // Mock console.error to prevent test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Execute
    const result = await atcoderController.atcoder_c();
    
    // Verify
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('can be called and returns promise', () => {
    // Just verify the function exists and returns a promise
    const result = atcoderController.atcoder_c();
    expect(result).toBeInstanceOf(Promise);
  });
});