/**
 * Worker configuration. It shares the API's variables (same deployment secrets)
 * but validates only what the worker itself needs, and refuses to run in
 * production with a development transport (SRS ENQ 005, SEC 004).
 */
export interface WorkerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string;
  redisUrl: string;
  fieldEncryptionKey: string;
  mailTransport: 'none' | 'console';
  mailFromAddress: string | undefined;
  siteEnquiryRecipient: string | undefined;
  concurrency: number;
  /** Web tier purge endpoint; null when no cached HTML tier is deployed (SRS CACHE 002). */
  revalidate: { url: string; token: string } | null;
  media: {
    endpoint: string | undefined;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    quarantineBucket: string;
    publicBucket: string;
  };
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const problems: string[] = [];
  const required = (key: string): string => {
    const value = (env[key] ?? '').trim();
    if (!value) problems.push(`  - ${key}: required`);
    return value;
  };
  const nodeEnv = (env.NODE_ENV ?? 'development') as WorkerConfig['nodeEnv'];
  if (!['development', 'test', 'production'].includes(nodeEnv)) problems.push('  - NODE_ENV: must be development, test or production');
  const databaseUrl = required('DATABASE_URL');
  const redisUrl = required('REDIS_URL');
  const fieldEncryptionKey = required('FIELD_ENCRYPTION_KEY');
  const mailTransport = (env.MAIL_TRANSPORT ?? 'none') as WorkerConfig['mailTransport'];
  if (!['none', 'console'].includes(mailTransport)) problems.push('  - MAIL_TRANSPORT: must be none or console');
  const mailFromAddress = (env.MAIL_FROM_ADDRESS ?? '').trim() || undefined;
  const revalidateUrl = (env.WEB_REVALIDATE_URL ?? '').trim();
  const revalidateToken = (env.WEB_REVALIDATE_TOKEN ?? '').trim();
  if ((revalidateUrl === '') !== (revalidateToken === '')) {
    problems.push('  - WEB_REVALIDATE_URL / WEB_REVALIDATE_TOKEN: set both or neither');
  }
  if (revalidateUrl !== '' && !/^https?:\/\//.test(revalidateUrl)) problems.push('  - WEB_REVALIDATE_URL: must be an absolute http(s) URL');
  const concurrency = Number(env.WORKER_CONCURRENCY ?? '2');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) problems.push('  - WORKER_CONCURRENCY: must be an integer 1-20');
  if (!(env.MEDIA_S3_ACCESS_KEY_ID ?? '').trim() || !(env.MEDIA_S3_SECRET_ACCESS_KEY ?? '').trim()) {
    problems.push('  - MEDIA_S3_ACCESS_KEY_ID / MEDIA_S3_SECRET_ACCESS_KEY: required (the worker publishes media variants)');
  }
  if (nodeEnv === 'production') {
    if (revalidateUrl === '') problems.push('  - WEB_REVALIDATE_URL: required in production so cache purges reach the web tier (SRS CACHE 002)');
    if (revalidateUrl !== '' && !revalidateUrl.startsWith('https://')) problems.push('  - WEB_REVALIDATE_URL: must use https in production');
    if (mailTransport !== 'none') problems.push('  - MAIL_TRANSPORT: the console transport cannot be used in production');
    if (!mailFromAddress) problems.push('  - MAIL_FROM_ADDRESS: required in production (verified sender)');
    problems.push('  - No email provider adapter is configured: add one before running the worker in production (decision D03)');
  }
  if (problems.length > 0) throw new Error(`Invalid worker configuration:\n${problems.join('\n')}`);
  return {
    nodeEnv,
    databaseUrl,
    redisUrl,
    fieldEncryptionKey,
    mailTransport,
    mailFromAddress,
    siteEnquiryRecipient: (env.SITE_ENQUIRY_RECIPIENT ?? '').trim() || undefined,
    concurrency,
    revalidate: revalidateUrl !== '' && revalidateToken !== '' ? { url: revalidateUrl, token: revalidateToken } : null,
    media: {
      endpoint: (env.MEDIA_S3_ENDPOINT ?? '').trim() || undefined,
      region: (env.MEDIA_S3_REGION ?? 'us-east-1').trim(),
      accessKeyId: (env.MEDIA_S3_ACCESS_KEY_ID ?? '').trim(),
      secretAccessKey: (env.MEDIA_S3_SECRET_ACCESS_KEY ?? '').trim(),
      quarantineBucket: (env.MEDIA_QUARANTINE_BUCKET ?? 'melbourne-sphere-quarantine').trim(),
      publicBucket: (env.MEDIA_PUBLIC_BUCKET ?? 'melbourne-sphere-media').trim(),
    },
  };
}
