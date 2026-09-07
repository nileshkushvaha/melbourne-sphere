import { NextResponse, type NextRequest } from 'next/server';

/**
 * Applies the redirect table to public content paths (SRS SEO 004): a changed
 * slug answers 301 to the new address and a deliberately removed page answers
 * 410. Unknown paths fall through so the page itself renders its own 404 —
 * a missing page is never redirected to the home page.
 *
 * Resolutions are cached in memory for a short window so a busy path costs one
 * API call rather than one per request.
 */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;

interface Resolution {
  kind: 'permanent' | 'gone';
  status: 301 | 410;
  targetPath: string | null;
}

const cache = new Map<string, { value: Resolution | null; expires: number }>();

const apiOrigin = (process.env.API_ORIGIN ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');

async function resolve(pathname: string): Promise<Resolution | null> {
  const cached = cache.get(pathname);
  if (cached && cached.expires > Date.now()) return cached.value;
  let value: Resolution | null = null;
  try {
    const url = new URL(`${apiOrigin}/api/v1/seo/redirects/resolve`);
    url.searchParams.set('path', pathname);
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (response.ok) {
      const body = (await response.json()) as { data?: Resolution };
      value = body.data ?? null;
    }
  } catch {
    // The API being unreachable must not take the site down: fall through to
    // normal rendering, which surfaces its own error state.
    return null;
  }
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(pathname, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const resolution = await resolve(pathname.toLowerCase().replace(/\/+$/, '') || '/');
  if (!resolution) return NextResponse.next();
  if (resolution.kind === 'gone') {
    return new NextResponse('This page has been removed permanently.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
    });
  }
  if (resolution.targetPath) {
    const target = new URL(`${resolution.targetPath}${search}`, request.nextUrl.origin);
    return NextResponse.redirect(target, 301);
  }
  return NextResponse.next();
}

/** Only content routes are consulted; assets and API routes never are. */
export const config = {
  matcher: ['/business/:path*', '/blog/:path*', '/directory/:path*'],
};
