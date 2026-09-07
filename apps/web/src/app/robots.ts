import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site';

/**
 * Crawl guidance (SRS SEO 002): the sitemap index plus the routes that should
 * never be crawled. This is guidance, not access control — authorisation is
 * enforced by the API on every request.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Filtered searches are noindex,follow; keeping crawlers out of the
        // query space stops them burning budget on infinite combinations.
        disallow: ['/admin', '/api/', '/directory?', '/blog?', '/*?utm_', '/*?q='],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
