import type { APIRoute } from 'astro';
import { abs, site } from '../lib/site';

// One open group for every crawler, including AI search and user-triggered agents.
// Content-Signal states the training preference; keep it consistent with any CDN setting.
export const GET: APIRoute = () => {
  const train = site.aiTraining ? 'yes' : 'no';
  const body = [
    'User-agent: *',
    'Allow: /',
    `Content-Signal: search=yes, ai-input=yes, ai-train=${train}`,
    '',
    `Sitemap: ${abs('/sitemap.xml')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
