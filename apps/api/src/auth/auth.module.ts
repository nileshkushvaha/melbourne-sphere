import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { IdentityModule } from '../identity/identity.module.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { AccountService } from './account.service.js';
import { AuthController } from './auth.controller.js';
import { FieldEncryptionService } from '../common/field-encryption.service.js';
import { TotpService } from './totp/totp.service.js';
import { AuthService } from './auth.service.js';
import { CsrfOriginGuard } from './guards/csrf-origin.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { LoginThrottleService } from './login-throttle.service.js';
import { ConsoleMailer } from './mailer/console-mailer.js';
import { MailerPort } from './mailer/mailer.port.js';
import { NullMailer } from './mailer/null-mailer.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';

/**
 * AuthenticationModule (SRS section 16). Registers the global guard chain in
 * order: CSRF origin → session → permissions. Guards are global so that every
 * future admin controller inherits them without opting in.
 */
@Module({
  imports: [IdentityModule],
  controllers: [AuthController],
  providers: [
    PasswordService,
    SessionService,
    LoginThrottleService,
    AuthService,
    AccountService,
    TotpService,
    FieldEncryptionService,
    {
      provide: MailerPort,
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        config.get('MAIL_TRANSPORT', { infer: true }) === 'console' ? new ConsoleMailer() : new NullMailer(),
      inject: [ConfigService],
    },
    { provide: APP_GUARD, useClass: CsrfOriginGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [SessionService, PasswordService, MailerPort, FieldEncryptionService],
})
export class AuthModule {}
