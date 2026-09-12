import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Req, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '../auth/auth.service.js';
import { CurrentAdmin, Public, RequirePermissions, type AuthenticatedRequest } from '../auth/decorators.js';
import { getRequestId } from '../common/request-id.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { HomeSettingsRecordDto, PublicHomeDto, UpdateHomeSettingsDto } from './dto/settings.dto.js';
import { SeoSettingsRecordDto, UpdateSeoSettingsDto } from './dto/seo-settings.dto.js';
import { GeneralSettingsRecordDto, PublicSiteSettingsDto, UpdateGeneralSettingsDto } from './dto/general-settings.dto.js';
import { SettingsService } from './settings.service.js';
import { StaticPagesService } from './static-pages.service.js';
import { CreateStaticPageDto, PublicStaticPageDto, PublicStaticPageSummaryDto, StaticPageDto, StaticPageStateDto, UpdateStaticPageDto, ListStaticPagesQueryDto } from './dto/static-page.dto.js';

const ctxOf = (req: AuthenticatedRequest): RequestContext => ({ ip: req.ip ?? 'unknown', userAgent: req.headers['user-agent'], requestId: getRequestId(req) });

/** Public home payload (SRS section 15: `GET /home`). Featured placements and latest posts join in later phases. */
@ApiTags('public-site')
@Public()
@Controller('home')
export class HomePublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Hero content and optional published-record counters' })
  @ApiOkResponse({ type: PublicHomeDto })
  async home() {
    return { data: await this.settings.publicHome() };
  }
}

/** Public shell settings (SRS CFG 001): the name, contact details, branding, header bar and footer the public site renders. */
@ApiTags('public-site')
@Public()
@Controller('site')
export class SiteSettingsPublicController {
  constructor(private readonly settings: SettingsService) {}

  @Get('settings')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Application name, contact details, branding, header bar and footer' })
  @ApiOkResponse({ type: PublicSiteSettingsDto })
  async settingsPayload() {
    return { data: await this.settings.publicSiteSettings() };
  }
}

/** Editable site settings (SRS CFG 001); `settings.manage` only. */
@ApiTags('admin-settings')
@Controller('admin/settings')
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @RequirePermissions('settings.manage')
  @Get('home')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: HomeSettingsRecordDto })
  async get() {
    return { data: await this.settings.homeSettings() };
  }

  @RequirePermissions('settings.manage')
  @Get('general')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Application information, branding, header bar and footer' })
  @ApiOkResponse({ type: GeneralSettingsRecordDto })
  async getGeneral() {
    return { data: await this.settings.generalSettings() };
  }

  @RequirePermissions('settings.manage')
  @Put('general')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Replace the general settings (expectedVersion; audited)' })
  @ApiOkResponse({ type: GeneralSettingsRecordDto })
  async putGeneral(@Body() body: UpdateGeneralSettingsDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.settings.updateGeneralSettings(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('settings.manage')
  @Get('seo')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Search and social metadata for routes with no record of their own' })
  @ApiOkResponse({ type: SeoSettingsRecordDto })
  async getSeo() {
    return { data: await this.settings.seoSettings() };
  }

  @RequirePermissions('settings.manage')
  @Put('seo')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Replace the SEO settings (expectedVersion; audited)' })
  @ApiOkResponse({ type: SeoSettingsRecordDto })
  async putSeo(@Body() body: UpdateSeoSettingsDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.settings.updateSeoSettings(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('settings.manage')
  @Put('home')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Replace the home settings (expectedVersion; audited)' })
  @ApiOkResponse({ type: HomeSettingsRecordDto })
  async put(@Body() body: UpdateHomeSettingsDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.settings.updateHomeSettings(body, actor, ctxOf(req)) };
  }
}

/** Information pages (SRS CFG 002); `settings.manage` throughout. */
@ApiTags('admin-settings')
@Controller('admin/pages')
export class StaticPagesAdminController {
  constructor(private readonly pages: StaticPagesService) {}

  @RequirePermissions('settings.manage')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Every page, including ones never edited (q, status)' })
  @ApiOkResponse({ type: [StaticPageDto] })
  async list(@Query() query: ListStaticPagesQueryDto) {
    return { data: await this.pages.list(query) };
  }

  @RequirePermissions('settings.manage')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Create a page at a chosen address; reserved and taken addresses are refused (SRS 1.7)' })
  @ApiOkResponse({ type: StaticPageDto })
  async create(@Body() body: CreateStaticPageDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.pages.create(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('settings.manage')
  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: StaticPageDto })
  async get(@Param('slug') slug: string) {
    return { data: await this.pages.get(slug) };
  }

  @RequirePermissions('settings.manage')
  @Delete(':slug')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Delete a custom page. A system page, or one still published, is refused.' })
  async remove(@Param('slug') slug: string, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    await this.pages.remove(slug, actor, ctxOf(req));
  }

  @RequirePermissions('settings.manage')
  @Put(':slug')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Save the page; editing published text keeps a revision' })
  @ApiOkResponse({ type: StaticPageDto })
  async update(@Param('slug') slug: string, @Body() body: UpdateStaticPageDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.pages.update(slug, body, actor, ctxOf(req)) };
  }

  @RequirePermissions('settings.manage')
  @Post(':slug/publish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Publish; 409 PUBLICATION_BLOCKED lists what is missing (SRS CFG 002)' })
  @ApiOkResponse({ type: StaticPageDto })
  async publish(@Param('slug') slug: string, @Body() body: StaticPageStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.pages.setStatus(slug, 'published', body, actor, ctxOf(req)) };
  }

  @RequirePermissions('settings.manage')
  @Post(':slug/unpublish')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: StaticPageDto })
  async unpublish(@Param('slug') slug: string, @Body() body: StaticPageStateDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.pages.setStatus(slug, 'draft', body, actor, ctxOf(req)) };
  }
}

/** Published information pages for the public site (SRS CFG 002). */
@ApiTags('public-site')
@Public()
@Controller('pages')
export class StaticPagesPublicController {
  constructor(private readonly pages: StaticPagesService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Published information pages, for footer navigation' })
  @ApiOkResponse({ type: [PublicStaticPageSummaryDto] })
  async list() {
    return { data: await this.pages.publicList() };
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'One published information page (404 while it is a draft)' })
  @ApiOkResponse({ type: PublicStaticPageDto })
  async page(@Param('slug') slug: string) {
    return { data: await this.pages.publicPage(slug) };
  }
}
