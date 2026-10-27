import type { APIRoute } from 'astro';
import { site } from '../data/site';
const routes = ['', 'menu/', 'specials/', 'catering/', 'about/', 'visit/'];
export const GET: APIRoute = () => {
  const urls = routes.map(route => `<url><loc>${site.url}/${route}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
