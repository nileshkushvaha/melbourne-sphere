import { plainToInstance } from 'class-transformer';
import { ArrayNotEmpty, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, Validate, validateSync } from 'class-validator';
import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';
import { parseMysqlUrl } from '@melbourne-sphere/database';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

/**
 * Checks DATABASE_URL structurally (scheme, host, single database name, port)
 * using the database package's parser. The message never contains the value.
 */
@ValidatorConstraint({ name: 'encryptionKey' })
class EncryptionKeyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(value)) return false;
    try {
      return Buffer.from(value, 'base64').length === 32;
    } catch {
      return false;
    }
  }
  defaultMessage(): string {
    return 'FIELD_ENCRYPTION_KEY must be base64 of exactly 32 bytes (openssl rand -base64 32)';
  }
}

@ValidatorConstraint({ name: 'redisUrl' })
class RedisUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return (url.protocol === 'redis:' || url.protocol === 'rediss:') && url.hostname.length > 0;
    } catch {
      return false;
    }
  }
  defaultMessage(): string {
    return 'REDIS_URL must be a redis:// or rediss:// URL';
  }
}

@ValidatorConstraint({ name: 'mysqlUrl' })
class MysqlUrlConstraint implements ValidatorConstraintInterface {
  private reason = 'DATABASE_URL is invalid';
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
      parseMysqlUrl(value);
      return true;
    } catch (e) {
      this.reason = e instanceof Error ? e.message : 'DATABASE_URL is invalid';
      return false;
    }
  }
  defaultMessage(_args: ValidationArguments): string {
    return this.reason;
  }
}

export class EnvironmentVariables {
  @IsIn(NODE_ENVS)
  NODE_ENV: NodeEnv = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  /** mysql://user:password@host:port/database — required; no default. */
  @IsString({ message: 'DATABASE_URL is required' })
  @Validate(MysqlUrlConstraint)
  DATABASE_URL!: string;

  /**
   * Allow the MySQL driver to fetch the server's RSA public key over a non-TLS
   * connection (needed for caching_sha2_password after a server restart).
   * Local development only; production should use TLS instead. Default false.
   */
  @IsBoolean({ message: 'DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL must be true or false' })
  DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL = false;

  /**
   * Pooled connections per API replica (SRS OPS 003 pool budgets). Keep
   * `(api replicas + worker replicas) × limit` below the server's
   * `max_connections`, with headroom for migrations and admin sessions. A
   * capacity run at NFR 003 volumes exhausts the driver default of 10.
   */
  @IsInt({ message: 'DATABASE_CONNECTION_LIMIT must be an integer' })
  @Min(1, { message: 'DATABASE_CONNECTION_LIMIT must be at least 1' })
  @Max(100, { message: 'DATABASE_CONNECTION_LIMIT must be 100 or fewer' })
  DATABASE_CONNECTION_LIMIT = 20;

  /**
   * Number of trusted reverse-proxy hops in front of the API (SRS ARC 004 /
   * SEC 003). 0 = trust nothing (client IP is the socket peer; X-Forwarded-For
   * is ignored). Set to 1 behind the production reverse proxy. Never a
   * wildcard: spoofable X-Forwarded-For from the open internet must not
   * influence rate limits or audit records.
   */
  @IsInt({ message: 'TRUST_PROXY must be an integer number of proxy hops' })
  @Min(0)
  @Max(10)
  TRUST_PROXY = 0;

  /** redis://[:password@]host:port[/db] — required (login throttling). */
  @IsString({ message: 'REDIS_URL is required' })
  @Validate(RedisUrlConstraint)
  REDIS_URL!: string;

  /** Random secret for keyed hashes; >= 32 characters. Never logged. */
  @IsString({ message: 'APP_SECRET_KEY is required' })
  @MinLength(32, { message: 'APP_SECRET_KEY must be at least 32 characters' })
  @MaxLength(512)
  APP_SECRET_KEY!: string;

  /** Browser origins allowed for session-authenticated admin mutations. */
  @ArrayNotEmpty({ message: 'TRUSTED_ORIGINS must list at least one origin' })
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'], disallow_auth: true }, { each: true, message: 'TRUSTED_ORIGINS entries must be http(s) origins' })
  TRUSTED_ORIGINS: string[] = ['http://127.0.0.1:3002', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://localhost:3000'];

  @IsBoolean({ message: 'SESSION_COOKIE_SECURE must be true or false' })
  SESSION_COOKIE_SECURE = true;

  @IsInt()
  @Min(5)
  @Max(240)
  SESSION_IDLE_MINUTES = 30;

  @IsInt()
  @Min(1)
  @Max(72)
  SESSION_ABSOLUTE_HOURS = 12;

  @IsInt()
  @Min(19456, { message: 'ARGON2_MEMORY_KIB must be at least 19456 (OWASP minimum)' })
  @Max(1048576)
  ARGON2_MEMORY_KIB = 19456;

  @IsInt()
  @Min(2, { message: 'ARGON2_TIME_COST must be at least 2 (OWASP minimum)' })
  @Max(20)
  ARGON2_TIME_COST = 2;

  @IsInt()
  @Min(1)
  @Max(8)
  ARGON2_PARALLELISM = 1;

  /** Base URL of the admin app used in reset links (no trailing slash). */
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'], disallow_auth: true }, { message: 'PUBLIC_ADMIN_URL must be an http(s) URL' })
  PUBLIC_ADMIN_URL = 'http://127.0.0.1:3002/admin';

  /** "none" or "console" (console only outside production). */
  @IsIn(['none', 'console'], { message: 'MAIL_TRANSPORT must be none or console' })
  MAIL_TRANSPORT: 'none' | 'console' = 'none';

  @IsBoolean({ message: 'OPENAPI_ENABLED must be true or false' })
  OPENAPI_ENABLED = false;

  /** Public site origin; used for canonical links and the expected Turnstile hostname. */
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'], disallow_auth: true }, { message: 'PUBLIC_SITE_URL must be an http(s) URL' })
  PUBLIC_SITE_URL?: string;

  /** Cloudflare Turnstile secret (SRS SEC 002). Required in production; without it public submissions are refused, never accepted unverified. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  TURNSTILE_SECRET_KEY?: string;

  /** Where general site enquiries are sent (SRS ENQ 002). Without it, general enquiries are refused rather than dropped. */
  @IsOptional()
  @IsString()
  @MaxLength(254)
  SITE_ENQUIRY_RECIPIENT?: string;

  /** Verified sender address used for outbound enquiry mail (SRS ENQ 005). */
  @IsOptional()
  @IsString()
  @MaxLength(254)
  MAIL_FROM_ADDRESS?: string;

  /** Version string recorded with each acknowledgement of the review guidelines and privacy notice (SRS PRIV 001). */
  @IsString()
  @MaxLength(32)
  SUBMISSION_TERMS_VERSION = '2026-09-01';

  /** S3-compatible endpoint (MinIO locally); omit for AWS S3 itself. */
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }, { message: 'MEDIA_S3_ENDPOINT must be an http(s) URL' })
  MEDIA_S3_ENDPOINT?: string;

  @IsString()
  @MaxLength(64)
  MEDIA_S3_REGION = 'us-east-1';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  MEDIA_S3_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  MEDIA_S3_SECRET_ACCESS_KEY?: string;

  /** Private bucket that receives uploads before validation (SRS MED 002). */
  @IsString()
  @MaxLength(63)
  MEDIA_QUARANTINE_BUCKET = 'melbourne-sphere-quarantine';

  /** Bucket holding published, re-encoded variants only. */
  @IsString()
  @MaxLength(63)
  MEDIA_PUBLIC_BUCKET = 'melbourne-sphere-media';

  /** Public base URL for variants (a CDN in production). */
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] }, { message: 'MEDIA_PUBLIC_BASE_URL must be an http(s) URL' })
  MEDIA_PUBLIC_BASE_URL?: string;

  /** Base64 of exactly 32 random bytes; AES-256-GCM key for encrypted fields. */
  @IsString({ message: 'FIELD_ENCRYPTION_KEY is required' })
  @Validate(EncryptionKeyConstraint)
  FIELD_ENCRYPTION_KEY!: string;
}

/** Accepts true/false/1/0 (case-insensitive); anything else is left for validation to reject. */
function toBoolean(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return value;
}

/** Converts a strictly numeric string to a number; anything else is left for validation to reject. */
function toInteger(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return /^\d+$/.test(value) ? Number(value) : value;
}

/**
 * Validates the merged environment (process.env + .env file). Throws an Error
 * whose message lists the offending keys and constraints only. Values are never
 * included so that a startup failure cannot leak secrets into logs.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const raw: Record<string, unknown> = {};
  const KEYS = [
    'NODE_ENV', 'PORT', 'DATABASE_URL', 'DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL', 'DATABASE_CONNECTION_LIMIT', 'TRUST_PROXY',
    'REDIS_URL', 'APP_SECRET_KEY', 'TRUSTED_ORIGINS', 'SESSION_COOKIE_SECURE', 'SESSION_IDLE_MINUTES',
    'SESSION_ABSOLUTE_HOURS', 'ARGON2_MEMORY_KIB', 'ARGON2_TIME_COST', 'ARGON2_PARALLELISM',
    'PUBLIC_ADMIN_URL', 'PUBLIC_SITE_URL', 'MAIL_TRANSPORT', 'OPENAPI_ENABLED', 'FIELD_ENCRYPTION_KEY',
    'TURNSTILE_SECRET_KEY', 'SUBMISSION_TERMS_VERSION', 'SITE_ENQUIRY_RECIPIENT', 'MAIL_FROM_ADDRESS',
    'MEDIA_S3_ENDPOINT', 'MEDIA_S3_REGION', 'MEDIA_S3_ACCESS_KEY_ID', 'MEDIA_S3_SECRET_ACCESS_KEY',
    'MEDIA_QUARANTINE_BUCKET', 'MEDIA_PUBLIC_BUCKET', 'MEDIA_PUBLIC_BASE_URL',
  ] as const;
  for (const key of KEYS) {
    // Only the declared keys are considered; blank strings count as unset.
    if (config[key] !== undefined && config[key] !== '') raw[key] = config[key];
  }
  if ('PORT' in raw) raw.PORT = toInteger(raw.PORT);
  if ('TRUST_PROXY' in raw) raw.TRUST_PROXY = toInteger(raw.TRUST_PROXY);
  for (const key of ['DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL', 'SESSION_COOKIE_SECURE', 'OPENAPI_ENABLED'] as const) {
    if (key in raw) raw[key] = toBoolean(raw[key]);
  }
  for (const key of ['SESSION_IDLE_MINUTES', 'SESSION_ABSOLUTE_HOURS', 'ARGON2_MEMORY_KIB', 'ARGON2_TIME_COST', 'ARGON2_PARALLELISM', 'DATABASE_CONNECTION_LIMIT'] as const) {
    if (key in raw) raw[key] = toInteger(raw[key]);
  }
  if (typeof raw.TRUSTED_ORIGINS === 'string') {
    raw.TRUSTED_ORIGINS = raw.TRUSTED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter((o) => o.length > 0);
  }
  if (typeof raw.PUBLIC_ADMIN_URL === 'string') raw.PUBLIC_ADMIN_URL = raw.PUBLIC_ADMIN_URL.replace(/\/+$/, '');
  if (typeof raw.PUBLIC_SITE_URL === 'string') raw.PUBLIC_SITE_URL = raw.PUBLIC_SITE_URL.replace(/\/+$/, '');

  const validated = plainToInstance(EnvironmentVariables, raw);
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: true,
  });
  if (errors.length > 0) {
    const details = errors.map(
      (e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
    );
    throw new Error(
      `Invalid environment configuration:\n${details.join('\n')}\n` +
        'Fix the variables above (see apps/api/.env.example).',
    );
  }
  if (validated.NODE_ENV === 'production') {
    const production: string[] = [];
    if (!validated.SESSION_COOKIE_SECURE) production.push('  - SESSION_COOKIE_SECURE: must be true in production');
    if (validated.MAIL_TRANSPORT === 'console') production.push('  - MAIL_TRANSPORT: console is not allowed in production');
    if (!validated.TURNSTILE_SECRET_KEY) production.push('  - TURNSTILE_SECRET_KEY: required in production (public submissions are verified server side)');
    if (!validated.PUBLIC_SITE_URL) production.push('  - PUBLIC_SITE_URL: required in production (canonical links and Turnstile hostname check)');
    if (!validated.MAIL_FROM_ADDRESS) production.push('  - MAIL_FROM_ADDRESS: required in production (verified sender for enquiry mail)');
    if (!validated.MEDIA_S3_ACCESS_KEY_ID || !validated.MEDIA_S3_SECRET_ACCESS_KEY) production.push('  - MEDIA_S3_ACCESS_KEY_ID / MEDIA_S3_SECRET_ACCESS_KEY: required in production (least-privilege media credentials)');
    if (!validated.MEDIA_PUBLIC_BASE_URL) production.push('  - MEDIA_PUBLIC_BASE_URL: required in production (public/CDN base URL for media variants)');
    if (validated.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL) production.push('  - DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: must be false in production (use TLS)');
    if (validated.TRUSTED_ORIGINS.some((o) => o.startsWith('http://'))) production.push('  - TRUSTED_ORIGINS: must be https origins in production');
    if (production.length) {
      throw new Error(`Invalid environment configuration for production:\n${production.join('\n')}`);
    }
  }
  return {
    NODE_ENV: validated.NODE_ENV,
    PORT: validated.PORT,
    DATABASE_URL: validated.DATABASE_URL,
    DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL: validated.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL,
    DATABASE_CONNECTION_LIMIT: validated.DATABASE_CONNECTION_LIMIT,
    TRUST_PROXY: validated.TRUST_PROXY,
    REDIS_URL: validated.REDIS_URL,
    APP_SECRET_KEY: validated.APP_SECRET_KEY,
    TRUSTED_ORIGINS: validated.TRUSTED_ORIGINS,
    SESSION_COOKIE_SECURE: validated.SESSION_COOKIE_SECURE,
    SESSION_IDLE_MINUTES: validated.SESSION_IDLE_MINUTES,
    SESSION_ABSOLUTE_HOURS: validated.SESSION_ABSOLUTE_HOURS,
    ARGON2_MEMORY_KIB: validated.ARGON2_MEMORY_KIB,
    ARGON2_TIME_COST: validated.ARGON2_TIME_COST,
    ARGON2_PARALLELISM: validated.ARGON2_PARALLELISM,
    PUBLIC_ADMIN_URL: validated.PUBLIC_ADMIN_URL,
    PUBLIC_SITE_URL: validated.PUBLIC_SITE_URL,
    TURNSTILE_SECRET_KEY: validated.TURNSTILE_SECRET_KEY,
    SUBMISSION_TERMS_VERSION: validated.SUBMISSION_TERMS_VERSION,
    SITE_ENQUIRY_RECIPIENT: validated.SITE_ENQUIRY_RECIPIENT,
    MAIL_FROM_ADDRESS: validated.MAIL_FROM_ADDRESS,
    MEDIA_S3_ENDPOINT: validated.MEDIA_S3_ENDPOINT,
    MEDIA_S3_REGION: validated.MEDIA_S3_REGION,
    MEDIA_S3_ACCESS_KEY_ID: validated.MEDIA_S3_ACCESS_KEY_ID,
    MEDIA_S3_SECRET_ACCESS_KEY: validated.MEDIA_S3_SECRET_ACCESS_KEY,
    MEDIA_QUARANTINE_BUCKET: validated.MEDIA_QUARANTINE_BUCKET,
    MEDIA_PUBLIC_BUCKET: validated.MEDIA_PUBLIC_BUCKET,
    MEDIA_PUBLIC_BASE_URL: validated.MEDIA_PUBLIC_BASE_URL,
    MAIL_TRANSPORT: validated.MAIL_TRANSPORT,
    OPENAPI_ENABLED: validated.OPENAPI_ENABLED,
    FIELD_ENCRYPTION_KEY: validated.FIELD_ENCRYPTION_KEY,
  };
}
