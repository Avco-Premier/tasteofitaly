import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

// Indexable routes for sitemap.xml and llms.txt, derived from src/pages so a
// page added or deleted there shows up (or disappears) everywhere automatically.
const pages = import.meta.glob('../pages/**/*.astro');
// Dish and area pages are generated from copy files, one route per file.
const dynamicCopy = import.meta.glob<any>(['../copy/dishes/*.md', '../copy/areas/*.md'], { eager: true });

export type Route = { path: string; name: string; file: string; label?: string; description?: string };
const copyFiles = import.meta.glob<any>('../copy/*.md', { eager: true });

export function routes(): Route[] {
  return Object.keys(pages)
    .map((p) => p.replace('../pages/', ''))
    .filter((p) => !p.startsWith('404') && !p.includes('['))
    .map((p) => {
      const name = p.replace(/\.astro$/, '').replace(/\/index$/, '').replace(/^index$/, '');
      const fm = copyFiles[`../copy/${name || 'home'}.md`]?.frontmatter;
      return { path: name ? `/${name}/` : '/', name: name || 'home', file: `src/pages/${p}`, description: fm?.description };
    })
    .concat(
      Object.entries(dynamicCopy).map(([p, mod]) => {
        const rel = p.replace('../copy/', '').replace(/\.md$/, '');
        return { path: `/${rel}/`, name: rel, file: `src/copy/${rel}.md`, label: mod.frontmatter?.h1, description: mod.frontmatter?.description };
      }),
    )
    .sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));
}

// lastmod = newest real change to the page, its copy file, or the data it renders:
// the last git commit, or the file's mtime when it has uncommitted edits (or no git).
function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function lastChange(files: string[]): Date {
  const present = files.filter((f) => existsSync(f));
  const quoted = present.map((f) => `"${f}"`).join(' ');
  const committed = sh(`git log -1 --format=%cI -- ${quoted}`);
  const dirty = sh(`git status --porcelain -- ${quoted}`)
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3));
  const times = dirty.length || !committed
    ? (dirty.length ? dirty : present).filter((f) => existsSync(f)).map((f) => statSync(f).mtimeMs)
    : [];
  if (committed) times.push(new Date(committed).getTime());
  return new Date(Math.max(...times));
}

export function lastmod(route: Route): string {
  // site.json is shared by every page, so it is deliberately not a dependency:
  // a phone-number edit shouldn't make every URL look freshly changed.
  const deps = route.file.endsWith('.md') ? [route.file] : [route.file, `src/copy/${route.name}.md`];
  if (route.name === 'menu') deps.push('src/data/menus/main.json');
  if (route.name === 'catering') deps.push('src/data/menus/catering.json');
  return lastChange(deps).toISOString().slice(0, 10);
}
