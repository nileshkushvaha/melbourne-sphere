/**
 * @melbourne-sphere/database — backend-only database access.
 *
 * Import this package from the API and worker only. It must never be bundled
 * into browser code (SRS ARC 002). No client is created at import time.
 * Long-running processes should use DatabaseConnection (managed lifecycle);
 * createDatabaseClient is the low-level factory for scripts.
 */
export { createDatabaseClient } from './client.js';
export type { CreateDatabaseClientOptions, DatabaseClient } from './client.js';
export { DatabaseConnection, DatabaseUnavailableError } from './connection.js';
export type {
  DatabaseCheckResult,
  DatabaseConnectionEvent,
  DatabaseConnectionOptions,
  DatabaseConnectionState,
  MinimalClient,
} from './connection.js';
export { parseMysqlUrl } from './url.js';
export type { MysqlConnectionSettings } from './url.js';
export { Prisma, AdminUserStatus, AdminTokenPurpose, BusinessStatus, AddressVisibility, HoursMode, HoursExceptionKind, BusinessLinkKind, ReviewStatus, AbuseReportReason, AbuseReportStatus, AbuseReportOutcome, EnquiryKind, EnquiryHandlingStatus, EnquiryDeliveryStatus, OutboxStatus, PostStatus, MediaStatus, MediaVariantKind, RedirectKind, PostBodyFormat, AuthorLinkKind, StaticPageStatus } from './generated/prisma/client.js';
export type {
  AdminLoginChallenge,
  AdminRecoveryCode,
  AdminRole,
  AdminSession,
  AdminUser,
  AuditLog,
  Business,
  BusinessAddress,
  BusinessCategory,
  BusinessRating,
  BusinessService,
  Category,
  LocalArea,
  Service,
  ServiceSynonym,
  PasswordResetToken,
  Permission,
  Role,
  RolePermission,
  SystemProbe, OpeningInterval, HoursException, BusinessLink, SiteSetting, Review, AbuseReport, IdempotencyRecord, Enquiry, OutboxEvent, ProviderMessageEvent, Post, Author, BlogCategory, BlogTag, PostTag, ContentRevision, Comment, MediaAsset, MediaVariant, BusinessMedia, Redirect, AuthorLink, StaticPage, FeaturedPlacement } from './generated/prisma/client.js';
