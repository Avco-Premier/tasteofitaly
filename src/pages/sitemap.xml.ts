import type { APIRoute } from 'astro';
const routes = ['', 'menu/', 'specials/', 'catering/', 'about/', 'visit/'];
export const GET: APIRoute = () => {
  const lastmod = '2026-09-14';
  const urls = routes.map(route => `<url><loc>https://tasteofitalyny.com/${route}</loc><lastmod>${lastmod}</lastmod><changefreq>${route === 'menu/' ? 'weekly' : 'monthly'}</changefreq><priority>${route === '' ? '1.0' : '0.8'}</priority></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
