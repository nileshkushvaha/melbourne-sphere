export { smtpConfigFromEnv, type SmtpConfig, type SmtpEnv, type SmtpConfigResult } from './config.js';
export { SmtpTransport, SMTP_TIMEOUTS_MS, MAX_TEXT_BYTES, classify, toSendOptions, type MailMessage, type MailSendResult, type TransporterFactory } from './transport.js';
export { PermanentMailError, TransientMailError, redactAddresses } from './errors.js';
