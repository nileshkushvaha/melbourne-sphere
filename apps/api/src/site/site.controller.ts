import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/** Server-owned Melbourne constants (SRS SCP 001). Not editable anywhere. */
export const SITE_CONTEXT = Object.freeze({
  city: 'Melbourne',
  state: 'VIC',
  country: 'AU',
  timezone: 'Australia/Melbourne',
  locale: 'en-AU',
  /** Planning baseline until decision D01 is recorded (SRS SCP 004). */
  boundary: 'City of Melbourne council area (baseline pending client decision D01)',
});

@ApiTags('public-site')
@Controller('site')
export class SiteController {
  @Get('context')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Fixed Melbourne context: city, state, country, timezone' })
  @ApiOkResponse({ description: '{data: {city, state, country, timezone, locale, boundary}}' })
  context() {
    return { data: SITE_CONTEXT };
  }
}
