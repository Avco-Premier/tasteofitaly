import type { APIRoute } from 'astro';
import { abs } from '../lib/site';
import { routes, lastmod } from '../lib/routes';

// loc + real lastmod only. changefreq and priority are ignored by Google, so they are omitted.
export const GET: APIRoute = () => {
  const urls = routes()
    .map((r) => `  <url>\n    <loc>${abs(r.path)}</loc>\n    <lastmod>${lastmod(r)}</lastmod>\n  </url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
