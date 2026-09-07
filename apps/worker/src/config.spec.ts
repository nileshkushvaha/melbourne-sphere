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

  it('refuses to run in production without the smtp transport and a sender', () => {
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/console transport cannot be used in production/);
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'none' } as NodeJS.ProcessEnv)).toThrow(/MAIL_FROM_ADDRESS/);
    expect(() => loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'none', MAIL_FROM_ADDRESS: 'no-reply@example.com' } as NodeJS.ProcessEnv)).toThrow(/MAIL_TRANSPORT: must be smtp in production/);
  });

  it('validates the smtp relay and never echoes its credentials (SRS ENQ 005, SEC 004)', () => {
    const local = loadWorkerConfig({ ...BASE, MAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', MAIL_FROM_ADDRESS: 'no-reply@example.com' } as NodeJS.ProcessEnv);
    expect(local.smtp).toEqual({ host: '127.0.0.1', port: 1025, secure: false, requireTls: false, auth: null });
    expect(() => loadWorkerConfig({ ...BASE, MAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1' } as NodeJS.ProcessEnv)).toThrow(/MAIL_FROM_ADDRESS: required when MAIL_TRANSPORT=smtp/);

    let message = '';
    try {
      loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PASSWORD: 'leaky-secret', MAIL_FROM_ADDRESS: 'no-reply@example.com', WEB_REVALIDATE_URL: 'https://web.example/api/revalidate', WEB_REVALIDATE_TOKEN: 't' } as NodeJS.ProcessEnv);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/SMTP_USER \/ SMTP_PASSWORD/);
    expect(message).toMatch(/loopback host/);
    expect(message).not.toContain('leaky-secret');

    const production = loadWorkerConfig({ ...BASE, NODE_ENV: 'production', MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.relay.example', SMTP_PORT: '587', SMTP_USER: 'relay-user', SMTP_PASSWORD: 'placeholder', MAIL_FROM_ADDRESS: 'no-reply@example.com', WEB_REVALIDATE_URL: 'https://web.example/api/revalidate', WEB_REVALIDATE_TOKEN: 't' } as NodeJS.ProcessEnv);
    expect(production.smtp).toMatchObject({ host: 'smtp.relay.example', port: 587, requireTls: true, auth: { user: 'relay-user' } });
  });
});
