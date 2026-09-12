import { fetchSiteSettings } from '@/lib/api';
import { hasAnalytics } from '@/lib/analytics';
import { Analytics } from './analytics';
import { ConsentBanner } from './consent-banner';

/**
 * The consent question and the analytics it governs, together.
 *
 * A server component so the identifiers are read once with the rest of the
 * shell settings — already cached and already invalidated when the settings
 * change — while the two client components below it decide, in the browser,
 * whether anything actually loads.
 *
 * When no analytics are configured, neither is rendered: an unconfigured site
 * should not ask visitors to agree to something that would never happen.
 */
export async function SiteAnalytics() {
  const settings = await fetchSiteSettings();
  const ids = settings.seo?.analytics;
  // The type guard is what lets the component below take a non-null value.
  if (!hasAnalytics(ids)) return null;
  return (
    <>
      <Analytics ids={ids} />
      <ConsentBanner configured />
    </>
  );
}
