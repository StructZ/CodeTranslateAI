import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashCode, saveToCache, getFromCache } from './cache.js';

beforeEach(() => {
  vi.clearAllMocks();

  // A valid, non-expired timestamp for our mocks
  const futureTimestamp = Date.now() + 24 * 60 * 60 * 1000; // 1 day in the future

  global.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve({ [key]: { data: 'cached_value', expiresAt: futureTimestamp } })),
        set: vi.fn(() => Promise.resolve()),
        // Add a mock for 'remove' to test expiration logic
        remove: vi.fn(() => Promise.resolve()),
      },
    },
  };
});

describe('Cache Functions', () => {
  it('should save an item with the correct data structure and expiration', async () => {
    const key = 'testKey';
    const value = 'testValue';
    await saveToCache(key, value, 1); // Pass the daysToExpire argument

    // Check that the saved object has the correct shape
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
      [key]: {
        data: value,
        expiresAt: expect.any(Number), // Check that expiresAt is a number
      },
    });
  });

  it('should retrieve the data property from a valid cache item', async () => {
    const key = 'testKey';
    const value = await getFromCache(key);

    expect(global.chrome.storage.local.get).toHaveBeenCalledWith(key);
    expect(value).toBe('cached_value');
  });

  it('should return null and remove an expired cache item', async () => {
    const key = 'expiredKey';
    const pastTimestamp = Date.now() - 1000; // 1 second in the past

    // Override the mock for this specific test to return an expired item
    global.chrome.storage.local.get.mockResolvedValue({ [key]: { data: 'expired_data', expiresAt: pastTimestamp } });
    
    const value = await getFromCache(key);

    expect(value).toBeNull();
    expect(global.chrome.storage.local.remove).toHaveBeenCalledWith(key);
  });
  
  it('should generate a consistent hash code for a given string', () => {
    const testString = 'hello world';
    const hash1 = hashCode(testString);
    const hash2 = hashCode(testString);

    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('number');
  });
});