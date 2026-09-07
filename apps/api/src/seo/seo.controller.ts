import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { RequestContext } from '../auth/auth.service.js';
import { CurrentAdmin, Public, RequirePermissions, type AuthenticatedRequest } from '../auth/decorators.js';
import { getRequestId } from '../common/request-id.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { CreateRedirectDto, ListRedirectsQueryDto, RedirectDto, RedirectResolutionDto } from './dto/redirect.dto.js';
import { SitemapFeedDto } from './dto/sitemap.dto.js';
import { RedirectsService } from './redirects.service.js';
import { SITEMAP_SECTIONS, SitemapService, type SitemapSection } from './sitemap.service.js';

const ctxOf = (req: AuthenticatedRequest): RequestContext => ({ ip: req.ip ?? 'unknown', userAgent: req.headers['user-agent'], requestId: getRequestId(req) });

/** Feeds the web tier renders as XML sitemaps and applies as redirects (SRS SEO 002/004). */
@ApiTags('public-seo')
@Public()
@Controller('seo')
export class SeoPublicController {
  constructor(
    private readonly sitemap: SitemapService,
    private readonly redirects: RedirectsService,
  ) {}

  @Get('sitemap/:section')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: `Canonical indexable paths for one sitemap section (${SITEMAP_SECTIONS.join(', ')})` })
  @ApiOkResponse({ type: SitemapFeedDto })
  async section(@Param('section') section: string) {
    if (!(SITEMAP_SECTIONS as readonly string[]).includes(section)) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
    const data = await this.sitemap.section(section as SitemapSection);
    return { data, meta: { count: data.length, generatedAt: new Date().toISOString() } };
  }

  @Get('redirects/resolve')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Resolve a public path to a 301 target or a 410; 404 when there is no rule' })
  @ApiOkResponse({ type: RedirectResolutionDto })
  async resolve(@Query('path') path?: string) {
    const resolution = path ? await this.redirects.resolve(path) : null;
    if (!resolution) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
    return { data: resolution };
  }
}

/** Redirect administration (SRS SEO 004); `redirects.manage` throughout. */
@ApiTags('admin-seo')
@Controller('admin/redirects')
export class RedirectsAdminController {
  constructor(private readonly redirects: RedirectsService) {}

  @RequirePermissions('redirects.manage')
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List redirects (q, kind, page, pageSize)' })
  @ApiOkResponse({ type: [RedirectDto] })
  list(@Query() query: ListRedirectsQueryDto) {
    return this.redirects.list(query);
  }

  @RequirePermissions('redirects.manage')
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Create a 301 redirect, or mark a removed path as 410 gone' })
  @ApiOkResponse({ type: RedirectDto })
  async create(@Body() body: CreateRedirectDto, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    return { data: await this.redirects.create(body, actor, ctxOf(req)) };
  }

  @RequirePermissions('redirects.manage')
  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Delete a redirect' })
  async remove(@Param('id') id: string, @CurrentAdmin() actor: AdminPrincipal, @Req() req: AuthenticatedRequest) {
    await this.redirects.remove(id, actor, ctxOf(req));
  }
}
