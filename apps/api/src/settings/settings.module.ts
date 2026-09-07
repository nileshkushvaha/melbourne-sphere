import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { HomePublicController, SettingsAdminController, StaticPagesAdminController, StaticPagesPublicController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { StaticPagesService } from './static-pages.service.js';

/** Site settings and the editable information pages (SRS CFG 001–002). */
@Module({
  imports: [AuthModule],
  controllers: [HomePublicController, SettingsAdminController, StaticPagesAdminController, StaticPagesPublicController],
  providers: [SettingsService, StaticPagesService],
  exports: [SettingsService, StaticPagesService],
})
export class SettingsModule {}
