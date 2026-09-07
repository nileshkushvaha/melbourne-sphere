import { loadWorkerConfig } from './config.js';

const BASE = {
  DATABASE_URL: 'mysql://app:secret@127.0.0.1:3307/melbourne_sphere_dev',
  REDIS_URL: 'redis://:pw@127.0.0.1:6380/0',
  FIELD_ENCRYPTION_KEY: 'a'.repeat(44),
  MAIL_TRANSPORT: 'console',
  MEDIA_S3_ACCESS_KEY_ID: 'key',
  MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
};

describe('worker configuration', () => {
  it('accepts a development configuration and applies defaults', () => {
    const config = loadWorkerConfig({ ...BASE } as NodeJS.ProcessEnv);
    expect(config).toMatchObject({ nodeEnv: 'development', mailTransport: 'console', concurrency: 2 });
  });

  it('requires media credentials because the worker publishes variants', () => {
    expect(() => loadWorkerConfig({ ...BASE, MEDIA_S3_ACCESS_KEY_ID: '' } as NodeJS.ProcessEnv)).toThrow(/MEDIA_S3_ACCESS_KEY_ID/);
    expect(loadWorkerConfig({ ...BASE, MEDIA_S3_ENDPOINT: 'http://127.0.0.1:9000' } as NodeJS.ProcessEnv).media).toMatchObject({ endpoint: 'http://127.0.0.1:9000', quarantineBucket: 'melbourne-sphere-quarantine' });
  });

  it('lists every missing requirement at once', () => {
    expect(() => loadWorkerConfig({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL[\s\S]*REDIS_URL[\s\S]*FIELD_ENCRYPTION_KEY/);
    expect(() => loadWorkerConfig({ ...BASE, WORKER_CONCURRENCY: '0' } as NodeJS.ProcessEnv)).toThrow(/WORKER_CONCURRENCY/);
  });

  it('refuses to run in production without a real provider and sender', () => {
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/console transport cannot be used in production/);
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'none' } as NodeJS.ProcessEnv)).toThrow(/MAIL_FROM_ADDRESS/);
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'none', MAIL_FROM_ADDRESS: 'no-reply@example.com' } as NodeJS.ProcessEnv)).toThrow(/No email provider adapter/);
  });
});
