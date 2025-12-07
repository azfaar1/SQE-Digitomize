// tests/unit/contest/controllers/platforms/codechefController.absolute.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('CodeChef Controller - File Check', () => {
  it('should find the file', () => {
    // Absolute path to your project
    const basePath = 'C:/Users/HP/Desktop/SQE-Project-Digitmoize/backend';
    
    // Paths to check
    const possiblePaths = [
      join(basePath, 'contest/controllers/platforms/codechefController.js'),
      join(basePath, 'contest/controllers/platform/codechefController.js'),
      join(basePath, 'controllers/platforms/codechefController.js'),
    ];
    
    let foundPath = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        foundPath = path;
        console.log(`✓ File found at: ${path}`);
        break;
      }
    }
    
    expect(foundPath).not.toBeNull();
    
    if (foundPath) {
      // Try to read the file to check imports
      const content = readFileSync(foundPath, 'utf8');
      expect(content).toContain('import https');
      expect(content).toContain('codechef_c');
    }
  });
});