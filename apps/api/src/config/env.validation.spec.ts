import { validateEnv } from './env.validation.js';

const DB = 'mysql://app:secret@127.0.0.1:3307/melbourne_sphere_dev';
const REDIS = 'redis://:pw@127.0.0.1:6380/0';
const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
/** Required settings beyond the one under test. */
const KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const BASE = { DATABASE_URL: DB, REDIS_URL: REDIS, APP_SECRET_KEY: SECRET, FIELD_ENCRYPTION_KEY: KEY };
const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3001,
  DATABASE_URL: DB,
  DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: false,
  DATABASE_CONNECTION_LIMIT: 20,
  TRUST_PROXY: 0,
  REDIS_URL: REDIS,
  APP_SECRET_KEY: SECRET,
  TRUSTED_ORIGINS: ['http://127.0.0.1:3002', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://localhost:3000'],
  SESSION_COOKIE_SECURE: true,
  SESSION_IDLE_MINUTES: 30,
  SESSION_ABSOLUTE_HOURS: 12,
  ARGON2_MEMORY_KIB: 19456,
  ARGON2_TIME_COST: 2,
  ARGON2_PARALLELISM: 1,
  PUBLIC_ADMIN_URL: 'http://127.0.0.1:3002/admin',
  PUBLIC_SITE_URL: undefined,
  TURNSTILE_SECRET_KEY: undefined,
  SUBMISSION_TERMS_VERSION: '2026-09-01',
  SITE_ENQUIRY_RECIPIENT: undefined,
  MEDIA_S3_ENDPOINT: undefined,
  MEDIA_S3_REGION: 'us-east-1',
  MEDIA_S3_ACCESS_KEY_ID: undefined,
  MEDIA_S3_SECRET_ACCESS_KEY: undefined,
  MEDIA_QUARANTINE_BUCKET: 'melbourne-sphere-quarantine',
  MEDIA_PUBLIC_BUCKET: 'melbourne-sphere-media',
  MEDIA_PUBLIC_BASE_URL: undefined,
  MAIL_FROM_ADDRESS: undefined,
  MAIL_TRANSPORT: 'none',
  OPENAPI_ENABLED: false,
  FIELD_ENCRYPTION_KEY: KEY,
};

/** Pure-function tests: nothing here touches process.env or any .env file. */
describe('validateEnv', () => {
  it('applies defaults when nothing is set', () => {
    expect(validateEnv({ ...BASE })).toEqual(DEFAULTS);
  });

  it('treats blank values as unset', () => {
    expect(validateEnv({ ...BASE, PORT: '', NODE_ENV: '' })).toEqual(DEFAULTS);
  });

  it('parses a valid PORT string and NODE_ENV', () => {
    expect(
      validateEnv({ ...BASE, NODE_ENV: 'production', PORT: '8080', TRUSTED_ORIGINS: 'https://example.com', PUBLIC_ADMIN_URL: 'https://example.com/admin', PUBLIC_SITE_URL: 'https://example.com', TURNSTILE_SECRET_KEY: 'a'.repeat(20), MAIL_FROM_ADDRESS: 'no-reply@example.com', MEDIA_S3_ACCESS_KEY_ID: 'key', MEDIA_S3_SECRET_ACCESS_KEY: 'secret', MEDIA_PUBLIC_BASE_URL: 'https://cdn.example.com' }),
    ).toEqual({ ...DEFAULTS, NODE_ENV: 'production', PORT: 8080, TRUSTED_ORIGINS: ['https://example.com'], PUBLIC_ADMIN_URL: 'https://example.com/admin', PUBLIC_SITE_URL: 'https://example.com', TURNSTILE_SECRET_KEY: 'a'.repeat(20), MAIL_FROM_ADDRESS: 'no-reply@example.com', MEDIA_S3_ACCESS_KEY_ID: 'key', MEDIA_S3_SECRET_ACCESS_KEY: 'secret', MEDIA_PUBLIC_BASE_URL: 'https://cdn.example.com' });
  });

  it('ignores unrelated variables', () => {
    expect(validateEnv({ ...BASE, PATH: '/usr/bin', SECRET_TOKEN: 'hunter2' })).toEqual(DEFAULTS);
  });

  it.each([
    ['0', 'must not be less than 1'],
    ['65536', 'must not be greater than 65535'],
    ['-1', 'integer'],
    ['3001.5', 'integer'],
    ['abc', 'integer'],
    [' 3001', 'integer'],
  ])('rejects PORT=%s', (port, expected) => {
    expect(() => validateEnv({ ...BASE, PORT: port })).toThrow(/PORT/);
    expect(() => validateEnv({ ...BASE, PORT: port })).toThrow(new RegExp(expected));
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...BASE, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('never echoes values into the error message', () => {
    const secretLike = 'sk_live_ABCDEF';
    let message = '';
    try {
      validateEnv({ ...BASE, NODE_ENV: secretLike, PORT: 'p@ss' });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('NODE_ENV');
    expect(message).toContain('PORT');
    expect(message).not.toContain(secretLike);
    expect(message).not.toContain('p@ss');
  });

  describe('DATABASE_URL', () => {
    it('is required', () => {
      expect(() => validateEnv({ REDIS_URL: REDIS, APP_SECRET_KEY: SECRET, FIELD_ENCRYPTION_KEY: KEY })).toThrow(/DATABASE_URL is required/);
    });

    it.each([
      ['postgresql://a:b@h:5432/db', 'mysql:// scheme'],
      ['mysql://a:b@h', 'database name'],
      ['mysql://a:b@h:0/db', 'port'],
      ['not a url', 'valid URL'],
    ])('rejects %s with a structural message', (url, fragment) => {
      expect(() => validateEnv({ ...BASE, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
      expect(() => validateEnv({ ...BASE, DATABASE_URL: url })).toThrow(new RegExp(fragment));
    });

    it('never echoes the URL, host or password into the error', () => {
      let message = '';
      try {
        validateEnv({ ...BASE, DATABASE_URL: 'mysql://dbuser:TopSecretPw@db.internal.example:3306/prod/extra' });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain('DATABASE_URL');
      expect(message).not.toContain('TopSecretPw');
      expect(message).not.toContain('db.internal.example');
      expect(message).not.toContain('dbuser');
    });
  });

  describe('DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL', () => {
    it.each([['true', true], ['1', true], ['FALSE', false], ['0', false]])('parses %s', (raw, expected) => {
      expect(validateEnv({ ...BASE, DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: raw }).DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL).toBe(expected);
    });

    it('rejects other values', () => {
      expect(() => validateEnv({ ...BASE, DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: 'yes' })).toThrow(
        /DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL must be true or false/,
      );
    });
  });

  describe('TRUST_PROXY', () => {
    it('defaults to 0 and accepts small integers', () => {
      expect(validateEnv({ ...BASE }).TRUST_PROXY).toBe(0);
      expect(validateEnv({ ...BASE, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    });

    it.each(['true', '-1', '11', '1.5'])('rejects %s', (v) => {
      expect(() => validateEnv({ ...BASE, TRUST_PROXY: v })).toThrow(/TRUST_PROXY/);
    });
  });

  describe('Phase 9 settings', () => {
    it('requires REDIS_URL and APP_SECRET_KEY with safe messages', () => {
      expect(() => validateEnv({ DATABASE_URL: DB, APP_SECRET_KEY: SECRET, FIELD_ENCRYPTION_KEY: KEY })).toThrow(/REDIS_URL is required/);
      expect(() => validateEnv({ DATABASE_URL: DB, REDIS_URL: REDIS, FIELD_ENCRYPTION_KEY: KEY })).toThrow(/APP_SECRET_KEY is required/);
      let message = '';
      try {
        validateEnv({ DATABASE_URL: DB, REDIS_URL: 'redis://:LeakedPw@host:1/0', APP_SECRET_KEY: 'short-secret-value', FIELD_ENCRYPTION_KEY: KEY });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/APP_SECRET_KEY must be at least 32/);
      expect(message).not.toContain('short-secret-value');
      expect(message).not.toContain('LeakedPw');
    });

    it('rejects non-redis URLs', () => {
      expect(() => validateEnv({ ...BASE, REDIS_URL: 'http://x' })).toThrow(/REDIS_URL must be a redis/);
    });

    it('parses TRUSTED_ORIGINS and strips trailing slashes', () => {
      expect(validateEnv({ ...BASE, TRUSTED_ORIGINS: ' https://a.example/ , http://b.example:3002 ' }).TRUSTED_ORIGINS).toEqual(['https://a.example', 'http://b.example:3002']);
      expect(() => validateEnv({ ...BASE, TRUSTED_ORIGINS: 'not-an-origin' })).toThrow(/TRUSTED_ORIGINS/);
    });

    it('enforces OWASP minimum Argon2 parameters', () => {
      expect(() => validateEnv({ ...BASE, ARGON2_MEMORY_KIB: '4096' })).toThrow(/ARGON2_MEMORY_KIB/);
      expect(() => validateEnv({ ...BASE, ARGON2_TIME_COST: '1' })).toThrow(/ARGON2_TIME_COST/);
    });

    it('refuses insecure production settings', () => {
      const prod = { ...BASE, NODE_ENV: 'production', TRUSTED_ORIGINS: 'https://example.com', PUBLIC_ADMIN_URL: 'https://example.com/admin' };
      expect(() => validateEnv({ ...prod, SESSION_COOKIE_SECURE: 'false' })).toThrow(/SESSION_COOKIE_SECURE: must be true/);
      expect(() => validateEnv({ ...prod, MAIL_TRANSPORT: 'console' })).toThrow(/MAIL_TRANSPORT: console/);
      expect(() => validateEnv({ ...prod, DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: 'true' })).toThrow(/DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL/);
      expect(() => validateEnv({ ...prod, TRUSTED_ORIGINS: 'http://example.com' })).toThrow(/https origins/);
    });
  });

  describe('FIELD_ENCRYPTION_KEY', () => {
    it('requires base64 of exactly 32 bytes and never echoes the value', () => {
      let message = '';
      try {
        validateEnv({ ...BASE, FIELD_ENCRYPTION_KEY: 'c2hvcnQ=' });
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toMatch(/FIELD_ENCRYPTION_KEY must be base64 of exactly 32 bytes/);
      expect(message).not.toContain('c2hvcnQ=');
      expect(() => validateEnv({ ...BASE, FIELD_ENCRYPTION_KEY: '' })).toThrow(/FIELD_ENCRYPTION_KEY is required/);
    });
  });
});

describe('public submission configuration (SRS SEC 002/003)', () => {
  const PROD = {
    ...BASE,
    NODE_ENV: 'production',
    SESSION_COOKIE_SECURE: 'true',
    TRUSTED_ORIGINS: 'https://admin.example',
    PUBLIC_ADMIN_URL: 'https://admin.example/admin',
  };

  it('requires Turnstile and the public site URL in production', () => {
    expect(() => validateEnv({ ...PROD })).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(() => validateEnv({ ...PROD, TURNSTILE_SECRET_KEY: 'a'.repeat(20) })).toThrow(/PUBLIC_SITE_URL/);
    expect(() => validateEnv({ ...PROD, TURNSTILE_SECRET_KEY: 'a'.repeat(20), PUBLIC_SITE_URL: 'https://melbournesphere.example/' })).toThrow(/MAIL_FROM_ADDRESS/);
    expect(() => validateEnv({ ...PROD, TURNSTILE_SECRET_KEY: 'a'.repeat(20), PUBLIC_SITE_URL: 'https://melbournesphere.example/', MAIL_FROM_ADDRESS: 'no-reply@example.com' })).toThrow(/MEDIA_S3_ACCESS_KEY_ID/);
    expect(validateEnv({ ...PROD, TURNSTILE_SECRET_KEY: 'a'.repeat(20), PUBLIC_SITE_URL: 'https://melbournesphere.example/', MAIL_FROM_ADDRESS: 'no-reply@melbournesphere.example', MEDIA_S3_ACCESS_KEY_ID: 'key', MEDIA_S3_SECRET_ACCESS_KEY: 'secret', MEDIA_PUBLIC_BASE_URL: 'https://cdn.melbournesphere.example' }).PUBLIC_SITE_URL).toBe('https://melbournesphere.example');
  });

  it('accepts a missing Turnstile secret outside production and rejects short ones', () => {
    expect(validateEnv({ ...BASE }).TURNSTILE_SECRET_KEY).toBeUndefined();
    expect(() => validateEnv({ ...BASE, TURNSTILE_SECRET_KEY: 'short' })).toThrow(/TURNSTILE_SECRET_KEY/);
    expect(validateEnv({ ...BASE, SUBMISSION_TERMS_VERSION: '2027-01-01' }).SUBMISSION_TERMS_VERSION).toBe('2027-01-01');
  });
});

describe('DATABASE_CONNECTION_LIMIT (SRS OPS 003 pool budgets)', () => {
  it('parses a numeric value and rejects values outside the allowed range', () => {
    expect(validateEnv({ ...BASE, DATABASE_CONNECTION_LIMIT: '40' }).DATABASE_CONNECTION_LIMIT).toBe(40);
    expect(() => validateEnv({ ...BASE, DATABASE_CONNECTION_LIMIT: '0' })).toThrow(/DATABASE_CONNECTION_LIMIT/);
    expect(() => validateEnv({ ...BASE, DATABASE_CONNECTION_LIMIT: '500' })).toThrow(/DATABASE_CONNECTION_LIMIT/);
    expect(() => validateEnv({ ...BASE, DATABASE_CONNECTION_LIMIT: 'many' })).toThrow(/DATABASE_CONNECTION_LIMIT/);
  });
});
