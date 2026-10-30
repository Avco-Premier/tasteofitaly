import { defineConfig } from 'astro/config';
import data from './src/data/site.json' with { type: 'json' };

// SITE_URL lets an audit build point canonicals at a preview host
// (e.g. https://my-project.vercel.app) without editing site.json.
const siteUrl = process.env.SITE_URL || data.site.url;
if (!/^https:\/\/[^\s]+$/.test(siteUrl)) {
  throw new Error(`site.url in src/data/site.json must be the client's https:// domain (got "${siteUrl}").`);
}

export default defineConfig({
  site: siteUrl,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Small sites ship ~10 KB of CSS; inlining removes every render-blocking request.
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  prefetch: false,
});
