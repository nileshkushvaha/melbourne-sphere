/** Connection settings derived from a mysql:// URL. Never log this object. */
export interface MysqlConnectionSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Parses `mysql://user:password@host:port/database` (Prisma's MySQL URL form).
 * User, password and database are percent-decoded, so credentials containing
 * reserved characters must be URL-encoded in the environment. Errors never
 * include the URL or any of its parts.
 */
export function parseMysqlUrl(url: string): MysqlConnectionSettings {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (parsed.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL must use the mysql:// scheme');
  }
  if (!parsed.hostname) {
    throw new Error('DATABASE_URL must include a host');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (!database || database.includes('/')) {
    throw new Error('DATABASE_URL must end with a single database name');
  }
  const port = parsed.port ? Number(parsed.port) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_URL port must be an integer between 1 and 65535');
  }
  return {
    host: parsed.hostname,
    port,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}
