import { ConflictException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { DEFAULT_HOME_SETTINGS, HOME_SETTINGS_KEY, validateHomeSettings, type HomeSettings } from './home-settings.js';
import { DEFAULT_GENERAL_SETTINGS, GENERAL_SETTINGS_KEY, SOCIAL_PLATFORMS, validateGeneralSettings, type GeneralSettings } from './general-settings.js';
import { MediaService } from '../media/media.service.js';
import { CacheService } from '../cache/cache.service.js';
import { CACHE_TAGS } from '@melbourne-sphere/domain';
import type { HomeSettingsRecordDto, PublicHeroSlideDto, PublicHomeDto, UpdateHomeSettingsDto } from './dto/settings.dto.js';
import type { GeneralSettingsRecordDto, PublicSiteSettingsDto, SettingsImageDto, UpdateGeneralSettingsDto } from './dto/general-settings.dto.js';

/**
 * Editable site settings (SRS CFG 001): validated server-side, versioned,
 * with the acting administrator recorded and every change audited. Reads fall
 * back to the documented defaults so the site never renders empty content.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly media: MediaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Turns stored slide references into renditions the site can render. A slide
   * whose asset is missing or not processed is dropped rather than rendered
   * broken, so the hero degrades to the solid fallback (SRS HERO 001).
   */
  private async resolveSlides(slides: HomeSettings['heroSlides']): Promise<PublicHeroSlideDto[]> {
    const resolved = await Promise.all(
      slides.map(async (slide) => {
        const asset = await this.media.heroRendition(slide.mediaId);
        if (!asset) return null;
        return {
          url: asset.url,
          previewUrl: asset.previewUrl,
          alt: asset.alt,
          caption: slide.caption ?? null,
          focalX: slide.focalX,
          focalY: slide.focalY,
          width: asset.width,
          height: asset.height,
        } satisfies PublicHeroSlideDto;
      }),
    );
    return resolved.filter((slide): slide is PublicHeroSlideDto => slide !== null);
  }

  async homeSettings(): Promise<HomeSettingsRecordDto> {
    const db = await this.database.client();
    const row = await db.siteSetting.findUnique({ where: { key: HOME_SETTINGS_KEY } });
    if (!row) return { ...DEFAULT_HOME_SETTINGS, heroSlidePreviews: [], version: 0, updatedAt: new Date(0).toISOString(), updatedByAdminId: null };
    const { errors, value } = validateHomeSettings(row.data);
    if (Object.keys(errors).length > 0) {
      // A stored document that no longer validates (e.g. after a rule change) must not break the public site.
      this.logger.warn('stored home settings failed validation; serving defaults');
      return { ...DEFAULT_HOME_SETTINGS, heroSlidePreviews: [], version: row.version, updatedAt: row.updatedAt.toISOString(), updatedByAdminId: row.updatedByAdminId };
    }
    return { ...value, heroSlidePreviews: await this.resolveSlides(value.heroSlides), version: row.version, updatedAt: row.updatedAt.toISOString(), updatedByAdminId: row.updatedByAdminId };
  }

  async updateHomeSettings(input: UpdateHomeSettingsDto, actor: AdminPrincipal, ctx: RequestContext): Promise<HomeSettingsRecordDto> {
    const { errors, value } = validateHomeSettings(input);
    if (Object.keys(errors).length > 0) throw new HttpException({ code: 'VALIDATION_ERROR', message: 'Some settings are invalid', fields: errors }, HttpStatus.BAD_REQUEST);
    const db = await this.database.client();
    const current = await db.siteSetting.findUnique({ where: { key: HOME_SETTINGS_KEY } });
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== input.expectedVersion) throw new ConflictException({ code: 'STALE_VERSION', message: 'These settings were changed by someone else. Reload and try again.' });
    const data = value as unknown as Prisma.InputJsonObject;
    const row = await db.$transaction(async (tx) => {
      const saved = current
        ? await tx.siteSetting.update({ where: { key: HOME_SETTINGS_KEY }, data: { data, version: { increment: 1 }, updatedByAdminId: actor.id } })
        : await tx.siteSetting.create({ data: { key: HOME_SETTINGS_KEY, data, version: 1, updatedByAdminId: actor.id } });
      // The home page renders these settings, so its cached copy must be purged.
      await this.cache.recordInvalidation(tx, { resourceType: 'site_setting', resourceId: HOME_SETTINGS_KEY, correlationId: ctx.requestId, tags: [CACHE_TAGS.settings] });
      return saved;
    });
    await this.cache.bumpNamespace();
    await this.audit.record({ action: 'settings.home.update', actorAdminId: actor.id, targetType: 'site_setting', targetId: HOME_SETTINGS_KEY, metadata: { phrases: value.heroPhrases.length, slides: value.heroSlides.length, countersEnabled: value.countersEnabled }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return { ...value, heroSlidePreviews: await this.resolveSlides(value.heroSlides), version: row.version, updatedAt: row.updatedAt.toISOString(), updatedByAdminId: row.updatedByAdminId };
  }

  /** Public home payload: hero content plus counters only when enabled and available (SRS HERO 007). */
  async publicHome(): Promise<PublicHomeDto> {
    const settings = await this.homeSettings();
    const hero: PublicHomeDto = { heroHeadline: settings.heroHeadline, heroPhrases: settings.heroPhrases, heroSlides: settings.heroSlidePreviews };
    if (!settings.countersEnabled) return hero;
    try {
      const db = await this.database.client();
      const [businesses, categories, areas] = await Promise.all([
        db.business.count({ where: { status: 'published' } }),
        db.category.count({ where: { active: true, primaryOf: { some: { status: 'published' } } } }),
        db.localArea.count({ where: { active: true, businesses: { some: { status: 'published' } } } }),
      ]);
      return { ...hero, counters: { businesses, categories, areas } };
    } catch (error) {
      // Counters are optional: hide them rather than show invented totals.
      this.logger.warn(`home counters unavailable (${(error as { code?: string })?.code ?? 'error'})`);
      return hero;
    }
  }


  // ---- general settings (SRS CFG 001) ---------------------------------------

  /**
   * Stored general settings, or the documented defaults when nothing has been
   * saved. A stored document that no longer validates (after a rule change, for
   * example) is reported and replaced by the defaults rather than breaking the
   * public shell.
   */
  private async storedGeneral(): Promise<{ value: GeneralSettings; version: number; updatedAt: string; updatedByAdminId: string | null }> {
    const db = await this.database.client();
    const row = await db.siteSetting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
    if (!row) return { value: SettingsService.generalDefaults(), version: 0, updatedAt: new Date(0).toISOString(), updatedByAdminId: null };
    const { errors, value } = validateGeneralSettings(row.data);
    if (Object.keys(errors).length > 0) {
      this.logger.warn('stored general settings failed validation; serving defaults');
      return { value: SettingsService.generalDefaults(), version: row.version, updatedAt: row.updatedAt.toISOString(), updatedByAdminId: row.updatedByAdminId };
    }
    return { value, version: row.version, updatedAt: row.updatedAt.toISOString(), updatedByAdminId: row.updatedByAdminId };
  }

  /** Resolves the three branding assets; an asset that is missing or unprocessed simply is not published (SRS MED 002). */
  private async resolveBranding(value: GeneralSettings): Promise<{ logo: SettingsImageDto | null; favicon: SettingsImageDto | null; shareImage: SettingsImageDto | null }> {
    const [logo, favicon, shareImage] = await Promise.all([
      this.media.publicImageRefOfKind(value.logoMediaId, 'card'),
      this.media.publicImageRefOfKind(value.faviconMediaId, 'thumbnail'),
      this.media.publicImageRefOfKind(value.shareImageMediaId, 'hero'),
    ]);
    return { logo, favicon, shareImage };
  }

  async generalSettings(): Promise<GeneralSettingsRecordDto> {
    const stored = await this.storedGeneral();
    const branding = await this.resolveBranding(stored.value);
    return {
      ...stored.value,
      supportPhone: stored.value.supportPhone?.display ?? null,
      supportPhoneDisplay: stored.value.supportPhone,
      ...branding,
      version: stored.version,
      updatedAt: stored.updatedAt,
      updatedByAdminId: stored.updatedByAdminId,
    };
  }

  async updateGeneralSettings(input: UpdateGeneralSettingsDto, actor: AdminPrincipal, ctx: RequestContext): Promise<GeneralSettingsRecordDto> {
    const { errors, value } = validateGeneralSettings(input);
    if (Object.keys(errors).length > 0) throw new HttpException({ code: 'VALIDATION_ERROR', message: 'Some settings are invalid', fields: errors }, HttpStatus.BAD_REQUEST);
    // Branding must reference assets that exist and are processed; otherwise the
    // shell would carry a broken image on every page.
    const mediaFields: [keyof GeneralSettings, string | null][] = [
      ['logoMediaId', value.logoMediaId],
      ['faviconMediaId', value.faviconMediaId],
      ['shareImageMediaId', value.shareImageMediaId],
    ];
    const mediaErrors: Record<string, string[]> = {};
    for (const [field, mediaId] of mediaFields) {
      if (!mediaId) continue;
      if (!(await this.media.publicImageRefOfKind(mediaId, 'card'))) mediaErrors[field] = ['That image does not exist or is still being processed'];
    }
    if (Object.keys(mediaErrors).length > 0) throw new HttpException({ code: 'VALIDATION_ERROR', message: 'Some settings are invalid', fields: mediaErrors }, HttpStatus.BAD_REQUEST);

    const db = await this.database.client();
    const current = await db.siteSetting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== input.expectedVersion) throw new ConflictException({ code: 'STALE_VERSION', message: 'These settings were changed by someone else. Reload and try again.' });
    const data = value as unknown as Prisma.InputJsonObject;
    const row = await db.$transaction(async (tx) => {
      const saved = current
        ? await tx.siteSetting.update({ where: { key: GENERAL_SETTINGS_KEY }, data: { data, version: { increment: 1 }, updatedByAdminId: actor.id } })
        : await tx.siteSetting.create({ data: { key: GENERAL_SETTINGS_KEY, data, version: 1, updatedByAdminId: actor.id } });
      // Every public page renders the shell, so the whole web tier is purged.
      await this.cache.recordInvalidation(tx, { resourceType: 'site_setting', resourceId: GENERAL_SETTINGS_KEY, correlationId: ctx.requestId, tags: [CACHE_TAGS.settings] });
      return saved;
    });
    await this.cache.bumpNamespace();
    await this.audit.record({
      action: 'settings.general.update',
      actorAdminId: actor.id,
      targetType: 'site_setting',
      targetId: GENERAL_SETTINGS_KEY,
      // Metadata records what changed shape, never the values themselves.
      metadata: {
        headerTopBarEnabled: value.headerTopBarEnabled,
        socialLinks: SOCIAL_PLATFORMS.filter((platform) => value.social[platform] !== null).length,
        hasSupportEmail: value.supportEmail !== null,
        hasSupportPhone: value.supportPhone !== null,
        brandingAssets: [value.logoMediaId, value.faviconMediaId, value.shareImageMediaId].filter(Boolean).length,
      },
      requestId: ctx.requestId,
      ipAddress: ctx.ip,
    });
    const branding = await this.resolveBranding(value);
    return {
      ...value,
      supportPhone: value.supportPhone?.display ?? null,
      supportPhoneDisplay: value.supportPhone,
      ...branding,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      updatedByAdminId: row.updatedByAdminId,
    };
  }

  /** Public shell payload (SRS CFG 001, UX 002): only values an editor has actually published. */
  async publicSiteSettings(): Promise<PublicSiteSettingsDto> {
    const { value } = await this.storedGeneral();
    const branding = await this.resolveBranding(value);
    return {
      name: value.applicationName,
      shortName: value.shortName,
      organisationName: value.organisationName,
      tagline: value.tagline,
      metaDescription: value.metaDescription,
      contact: { email: value.supportEmail, phone: value.supportPhone, websiteUrl: value.websiteUrl, address: value.address },
      branding,
      headerTopBarEnabled: value.headerTopBarEnabled,
      social: SOCIAL_PLATFORMS.flatMap((platform) => (value.social[platform] ? [{ platform, url: value.social[platform]! }] : [])),
      footer: { copyrightText: value.copyrightText, text: value.footerText },
    };
  }

  /** Exposed for tests and the admin "reset to defaults" action. */
  static generalDefaults(): GeneralSettings {
    return { ...DEFAULT_GENERAL_SETTINGS, social: { ...DEFAULT_GENERAL_SETTINGS.social } };
  }

  /** Exposed for tests and future settings keys. */
  static defaults(): HomeSettings {
    return { ...DEFAULT_HOME_SETTINGS, heroPhrases: [...DEFAULT_HOME_SETTINGS.heroPhrases] };
  }
}
