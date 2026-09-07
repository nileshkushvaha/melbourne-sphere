import 'server-only';
import type { components } from '@melbourne-sphere/contracts';
import type { SearchState } from './search-params';

export type PublicCategory = components['schemas']['PublicCategoryDto'];
export type BusinessCard = components['schemas']['PublicBusinessCardDto'];
export type BusinessDetail = components['schemas']['PublicBusinessDetailDto'];
export type SearchMeta = components['schemas']['SearchMetaDto'];
export type PublicHome = components['schemas']['PublicHomeDto'];
export type PublicReview = components['schemas']['PublicReviewDto'];
export type PostCard = components['schemas']['PublicPostCardDto'];
export type PostDetail = components['schemas']['PublicPostDto'];
export type BlogTerm = components['schemas']['PublicBlogTermDto'];
export type PublicComment = components['schemas']['PublicCommentDto'];
/** GET /areas is documented by operation only; shape from TaxonomyService.publicAreas(). */
export interface PublicArea {
  id: string;
  name: string;
  slug: string;
  editorialIntro: string | null;
}

const apiOrigin = (process.env.API_ORIGIN ?? 'http://127.0.0.1:3001').replace(/\/+$/, '');

/** Error from the API or the network; pages let it reach the error boundary (SRS DIR 006: never shown as zero results). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null = null,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ApiRequestError';
  }
}

interface FetchOptions {
  /** Next.js data-cache lifetime in seconds (SRS CACHE 001: explicit per fetch). */
  revalidate: number;
  tags?: string[];
  query?: Record<string, string | number | null | undefined>;
}

async function apiGet<T>(path: string, options: FetchOptions): Promise<T> {
  const url = new URL(`${apiOrigin}/api/v1${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: 'application/json' }, next: { revalidate: options.revalidate, tags: options.tags } });
  } catch (error) {
    throw new ApiRequestError(0, 'NETWORK', 'The directory service could not be reached', null, { cause: error });
  }
  if (!response.ok) {
    let code = 'HTTP_ERROR';
    let message = `Request failed (${response.status})`;
    let requestId: string | null = response.headers.get('x-request-id');
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string; requestId?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      requestId = body.error?.requestId ?? requestId;
    } catch {
      // non-JSON error body: keep the status-based message
    }
    throw new ApiRequestError(response.status, code, message, requestId);
  }
  return (await response.json()) as T;
}

/** Hero content and optional counters (SRS HERO 002/007). Falls back to the SRS wording if the API is unreachable so the hero still renders. */
export async function fetchHome(): Promise<PublicHome> {
  try {
    return (await apiGet<{ data: PublicHome }>('/home', { revalidate: 60, tags: ['settings'] })).data;
  } catch {
    return { heroHeadline: 'Discover Melbourne businesses', heroPhrases: ['local services', 'places to eat', 'independent shops'], heroSlides: [] };
  }
}

export async function fetchCategories(): Promise<PublicCategory[]> {
  return (await apiGet<{ data: PublicCategory[] }>('/categories', { revalidate: 300, tags: ['taxonomy'] })).data;
}

export async function fetchAreas(): Promise<PublicArea[]> {
  return (await apiGet<{ data: PublicArea[] }>('/areas', { revalidate: 300, tags: ['taxonomy'] })).data;
}

/** Flattens the two-level tree; the parent is kept on children for breadcrumbs. */
export function flattenCategories(tree: PublicCategory[]): (PublicCategory & { parent: PublicCategory | null })[] {
  return tree.flatMap((c) => [{ ...c, parent: null }, ...c.children.map((child) => ({ ...child, parent: c }))]);
}

export async function searchBusinesses(state: SearchState, fixed: { category?: string; area?: string } = {}): Promise<{ data: BusinessCard[]; meta: SearchMeta }> {
  return apiGet('/businesses', {
    revalidate: 30,
    tags: ['businesses'],
    query: { q: state.q, category: fixed.category ?? state.category, area: fixed.area ?? state.area, minRating: state.minRating, sort: state.sort, page: state.page, pageSize: 20 },
  });
}

/** Approved reviews for a published business (SRS REV 003); pending content never appears here. */
export async function fetchReviews(businessId: string, page = 1): Promise<{ data: PublicReview[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }> {
  return apiGet('/businesses/' + encodeURIComponent(businessId) + '/reviews', { revalidate: 60, tags: ['reviews', `reviews:${businessId}`], query: { page, pageSize: 10 } });
}

export async function fetchPosts(params: { page?: number; category?: string; tag?: string; q?: string } = {}): Promise<{ data: PostCard[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }> {
  return apiGet('/posts', { revalidate: 60, tags: ['posts'], query: { page: params.page ?? 1, category: params.category, tag: params.tag, q: params.q } });
}

export async function fetchBlogTerms(kind: 'blog-categories' | 'tags'): Promise<BlogTerm[]> {
  return (await apiGet<{ data: BlogTerm[] }>(`/${kind}`, { revalidate: 300, tags: ['posts', 'taxonomy'] })).data;
}

/** null for 404 (draft/unknown) so the page renders not-found (SRS BLOG 003). */
export async function fetchPost(slug: string): Promise<PostDetail | null> {
  try {
    return (await apiGet<{ data: PostDetail }>(`/posts/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ['posts', `post:${slug}`] })).data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export async function fetchComments(postId: string, page = 1): Promise<{ data: PublicComment[]; meta: { page: number; pageSize: number; total: number; pageCount: number } }> {
  return apiGet(`/posts/${encodeURIComponent(postId)}/comments`, { revalidate: 60, tags: ['comments', `comments:${postId}`], query: { page, pageSize: 20 } });
}

/** null for 404 (unpublished/unknown) so the page can render not-found; other failures propagate. */
export async function fetchBusiness(slug: string): Promise<BusinessDetail | null> {
  try {
    return (await apiGet<{ data: BusinessDetail }>(`/businesses/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ['businesses', `business:${slug}`] })).data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export interface SitemapEntry {
  path: string;
  lastModified: string;
}

/** Canonical, indexable paths for one sitemap section (SRS SEO 002). */
export async function fetchSitemapSection(section: 'businesses' | 'editorial' | 'taxonomies'): Promise<SitemapEntry[]> {
  return (await apiGet<{ data: SitemapEntry[] }>(`/seo/sitemap/${section}`, { revalidate: 300, tags: ['sitemap', `sitemap:${section}`] })).data;
}

export interface RedirectResolution {
  kind: 'permanent' | 'gone';
  status: 301 | 410;
  targetPath: string | null;
}

/** Resolves a path against the redirect table; null when there is no rule (SRS SEO 004). */
export async function resolveRedirect(path: string): Promise<RedirectResolution | null> {
  try {
    return (await apiGet<{ data: RedirectResolution }>('/seo/redirects/resolve', { revalidate: 60, tags: ['redirects'], query: { path } })).data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export interface StaticPageContent {
  slug: string;
  title: string;
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
  contactEmail: string | null;
  updatedAt: string;
}

/** Published information page (SRS CFG 002); null while it is still a draft. */
export async function fetchStaticPage(slug: string): Promise<StaticPageContent | null> {
  try {
    return (await apiGet<{ data: StaticPageContent }>(`/pages/${encodeURIComponent(slug)}`, { revalidate: 300, tags: ['pages', `page:${slug}`] })).data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

/** Published information pages, for footer navigation; never links to a draft. */
export async function fetchStaticPages(): Promise<{ slug: string; title: string }[]> {
  try {
    return (await apiGet<{ data: { slug: string; title: string }[] }>('/pages', { revalidate: 300, tags: ['pages'] })).data;
  } catch {
    // The footer must render even when the API is unreachable.
    return [];
  }
}
