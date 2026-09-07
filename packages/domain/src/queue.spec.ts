import { MAX_DISPATCH_ATTEMPTS, backoffMs, defaultJobOptions, redisConnectionFromUrl } from './queue.js';

describe('queue policy (SRS EVT 002)', () => {
  it('grows exponentially with jitter and is capped', () => {
    expect(backoffMs(1, () => 0)).toBe(1_000);
    expect(backoffMs(1, () => 1)).toBe(2_000);
    expect(backoffMs(20, () => 1)).toBe(60_000);
    for (let attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt += 1) {
      expect(backoffMs(attempt)).toBeGreaterThanOrEqual(2 ** attempt * 500);
    }
    expect(defaultJobOptions).toMatchObject({ attempts: 5, removeOnFail: false });
  });

  it('parses a Redis URL into BullMQ connection parts', () => {
    expect(redisConnectionFromUrl('redis://:se%40cret@127.0.0.1:6380/1')).toEqual({ host: '127.0.0.1', port: 6380, password: 'se@cret', db: 1, maxRetriesPerRequest: null });
    expect(redisConnectionFromUrl('redis://127.0.0.1:6379/0')).toEqual({ host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null });
  });
});
