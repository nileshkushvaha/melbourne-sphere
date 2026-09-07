import type { NextConfig } from "next";

/**
 * Server-only origin of the NestJS API. Read once when the Next.js server
 * starts (`next dev`, `next build`, `next start`), from the shell environment or
 * apps/web/.env* files. It is intentionally NOT a NEXT_PUBLIC_ variable: the
 * browser never sees it and only ever calls relative /api/v1 paths.
 */
const apiOrigin = (process.env.API_ORIGIN ?? "http://127.0.0.1:3001").replace(/\/+$/, "");

if (!/^https?:\/\/[^/\s]+$/.test(apiOrigin)) {
  throw new Error(
    "API_ORIGIN must be an http(s) origin without a path, e.g. http://127.0.0.1:3001",
  );
}

/**
 * Published media lives in object storage (or a CDN in production). Only that
 * origin is allowed as a remote image source, so the optimiser can never be
 * pointed at an arbitrary host.
 */
const mediaBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? "").trim();
const remotePatterns = mediaBaseUrl
  ? [
      (() => {
        const url = new URL(mediaBaseUrl);
        return { protocol: url.protocol.replace(":", "") as "http" | "https", hostname: url.hostname, port: url.port, pathname: `${url.pathname.replace(/\/+$/, "")}/**` };
      })(),
    ]
  : [];

const nextConfig: NextConfig = {
  experimental: {
    // Next 16 otherwise answers a 404 with a bare error document whose content
    // lives only in the flight payload, so the page renders blank. This routes
    // unmatched URLs to app/global-not-found.tsx, which is real server-rendered
    // HTML with the site shell.
    globalNotFound: true,
  },
  images: { remotePatterns },
  // Source-only workspace package (SRS ARC 001 table: packages/ui).
  transpilePackages: ["@melbourne-sphere/ui"],
  async rewrites() {
    return [
      {
        // Same-origin API access (SRS ARC 004): the browser requests /api/v1/*
        // on this host and Next.js forwards it, path intact, to NestJS.
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
