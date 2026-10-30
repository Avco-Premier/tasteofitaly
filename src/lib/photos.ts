import type { ImageMetadata } from 'astro';
import manifest from '../data/photos.json';

// Every photo lives in src/assets/photos and is described once in photos.json:
// { "file": "godfather-hero.jpg", "alt": "...", "subject": "dish|interior|exterior|team|catering|logo",
//   "dish": "Godfather", "use": ["home-hero", "social"] }
export type Photo = { file: string; alt: string; subject: string; dish?: string; use?: string[]; src: ImageMetadata };

const images = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });

const byFile = new Map(
  Object.entries(images).map(([path, mod]) => [path.split('/').pop() as string, mod.default]),
);

export const photos: Photo[] = (manifest as Omit<Photo, 'src'>[])
  .filter((p) => byFile.has(p.file))
  .map((p) => ({ ...p, src: byFile.get(p.file) as ImageMetadata }));

export function photoFor(use: string): Photo | undefined {
  return photos.find((p) => p.use?.includes(use));
}

export function photosFor(use: string): Photo[] {
  return photos.filter((p) => p.use?.includes(use));
}

export function dishPhoto(dish: string): Photo | undefined {
  const d = dish.trim().toLowerCase();
  return photos.find((p) => p.dish && p.dish.trim().toLowerCase() === d);
}

const brand = import.meta.glob<{ default: ImageMetadata }>('../assets/brand/*.{svg,png,jpg,webp}', { eager: true });
export function brandImage(file: string): ImageMetadata | undefined {
  const hit = Object.entries(brand).find(([path]) => path.endsWith(`/${file}`));
  return hit?.[1].default;
}

// ---- Picking photos for the v4 layout: full-bleed heroes, the home photo strip, the visit gallery.
// Only wide, large photos make heroes (a portrait or a 550px thumbnail cropped to 3:1 loses the food).
const wide = (p: Photo) => p.src.width >= p.src.height && p.src.width >= 1000;
const VENUE = ['interior', 'exterior'];

/** Home hero: every photo tagged home-hero, topped up with other wide shots (max 3 crossfade). */
export function heroSlides(max = 3): Photo[] {
  const tagged = photosFor('home-hero');
  const rest = photos.filter((p) => !tagged.includes(p) && wide(p) && ['dish', 'interior', 'exterior', 'catering'].includes(p.subject));
  return [...tagged, ...rest].slice(0, max);
}

const PAGE_ORDER = ['menu', 'about', 'catering', 'visit', 'faq'];
const PREFER: Record<string, string[]> = { visit: ['exterior', 'interior'], about: ['interior', 'team', 'exterior'], catering: ['catering', 'interior'] };

/** Inner-page hero: the photo tagged `<page>-hero`, else a different wide photo per page (none → the green no-photo hero). */
export function pageHero(page: string): Photo | undefined {
  const tagged = photoFor(`${page}-hero`);
  if (tagged) return tagged;
  const onHome = new Set(heroSlides().map((p) => p.file));
  const pool = photos.filter((p) => wide(p) && p.subject !== 'logo');
  const preferred = pool.filter((p) => (PREFER[page] ?? []).includes(p.subject));
  if (preferred.length) return preferred[0];
  const fresh = pool.filter((p) => !onHome.has(p.file) && p.subject !== 'team');
  const list = fresh.length ? fresh : pool;
  return list.length ? list[Math.max(0, PAGE_ORDER.indexOf(page)) % list.length] : undefined;
}

/** Home strip: food and room photos, featured dishes first. */
export function stripPhotos(max = 10): Photo[] {
  const hero = heroSlides()[0];  // the photo the visitor just saw full-size doesn't come back two scrolls later
  return photos.filter((p) => p !== hero && ['dish', ...VENUE, 'catering'].includes(p.subject)).slice(0, max);
}

/** Visit gallery: the room and the storefront only (food belongs on the menu). */
export function venuePhotos(max = 4): Photo[] {
  return photos.filter((p) => VENUE.includes(p.subject)).slice(0, max);
}

/** A team member's portrait: a team photo whose alt or file names them. */
export function portraitFor(name: string): Photo | undefined {
  const first = name.split(' ')[0].toLowerCase();
  return photos.find((p) => p.subject === 'team' && (p.alt.toLowerCase().includes(name.toLowerCase()) || p.file.toLowerCase().includes(first)));
}
