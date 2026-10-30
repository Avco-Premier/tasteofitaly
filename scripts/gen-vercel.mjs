// Writes vercel.json from src/data/site.json before every build, so security
// headers, CSP hosts, caching and redirects always match the site's real integrations.
import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'));
const { site, business: biz } = data;

const host = (u) => { try { return new URL(u).origin; } catch { return null; } };
const uniq = (a) => [...new Set(a.filter(Boolean))];

const scriptSrc = ["'self'"];
const connectSrc = ["'self'"];
const frameSrc = ['https://www.google.com', 'https://maps.google.com'];
if (site.analytics?.ga4Id) {
  scriptSrc.push('https://www.googletagmanager.com');
  connectSrc.push('https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com', 'https://www.google.com', 'https://stats.g.doubleclick.net');
}
for (const u of site.extraFrameHosts ?? []) frameSrc.push(host(u));
for (const u of site.extraScriptHosts ?? []) scriptSrc.push(host(u));

const csp = [
  "default-src 'self'",
  `script-src ${uniq(scriptSrc).join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src ${uniq(connectSrc).join(' ')}`,
  `frame-src ${uniq(frameSrc).join(' ')}`,
  "media-src 'self' https:",
  "base-uri 'self'",
  "form-action 'self' https:",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const security = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

const redirects = (site.redirects ?? []).map((r) => ({ source: r.from, destination: r.to, permanent: true }));
// After launch, send the *.vercel.app host to the real domain so only one host is indexable.
if (site.launched && site.vercelProjectDomain) {
  redirects.push({
    source: '/:path*',
    has: [{ type: 'host', value: site.vercelProjectDomain }],
    destination: `${site.url.replace(/\/$/, '')}/:path*`,
    permanent: true,
  });
}

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  trailingSlash: true,
  headers: [
    { source: '/(.*)', headers: security },
    { source: '/_astro/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/((?!_astro/).*)\\.(svg|png|ico|webmanifest)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
    { source: '/(robots.txt|sitemap.xml|llms.txt)', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
    { source: '/(robots.txt|llms.txt)', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] },
    { source: '/ga-init.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
  ],
  redirects,
};

writeFileSync(new URL('../vercel.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
console.log(`vercel.json written (${redirects.length} redirects)`);
