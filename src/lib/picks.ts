// Picks for the home sections: which dishes, menu sections and photos go where. Data only (real menu items, real
// prices, the client's photos), so a theme can lay the home page out as cards, tabs and panels without new claims.
import { biz } from './site';
import { getMenu, findItem, money, priceOptions, type MenuItem, type MenuSection } from './menu';
import { photos, dishPhoto, heroSlides, type Photo } from './photos';

export const mainMenu = getMenu('main');
const menus = [mainMenu, getMenu(biz.catering.menuFile)];

export function priceLabel(i: MenuItem): string {
  const o = priceOptions(i);
  return o.length ? `from ${o[0].price}` : money(i.price);
}

/** A menu description cut to one line or two for a card. */
export function shortDesc(s = '', max = 90): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max - 2);
  return `${t.slice(0, cut > 40 ? cut : max - 2).replace(/[,;:\s]+$/, '')}…`;
}

export function signatureDishes(): MenuItem[] {
  return (biz.featuredItems as string[]).map((n) => findItem(n, menus)).filter((i): i is MenuItem => Boolean(i));
}

/** The menu sections worth a tab or an accordion row: in menu order, with enough dishes to fill a row of cards. */
export function topSections(max = 6, minItems = 1): MenuSection[] {
  return (mainMenu?.subcategories ?? []).filter((s) => s.items.length >= minItems).slice(0, max);
}

/** The dishes to show for a section: ones with a photo first, then ones with a description, in menu order. */
export function sectionDishes(s: MenuSection, max: number, skip: Set<string> = new Set()): MenuItem[] {
  const score = (i: MenuItem) => (dishPhoto(i.name) ? 2 : 0) + (i.description?.trim() ? 1 : 0);
  return s.items.filter((i) => !skip.has(i.name)).map((i, n) => ({ i, n }))
    .sort((a, b) => score(b.i) - score(a.i) || a.n - b.n).slice(0, max).map((x) => x.i);
}

/** Photos for the home sections, each used once: `take(['interior'])` hands out the next unused photo of that kind. */
export function photoPool() {
  const used = new Set<string>(heroSlides().slice(0, 1).map((p) => p.file));
  const usable = photos.filter((p) => p.subject !== 'logo');
  return {
    take(subjects: string[] = [], { wide = false, any = true } = {}): Photo | undefined {
      const ok = (p: Photo) => !used.has(p.file) && (!wide || p.src.width >= p.src.height);
      const hit = usable.find((p) => ok(p) && subjects.includes(p.subject)) ?? (any ? usable.find(ok) : undefined);
      if (hit) used.add(hit.file);
      return hit;
    },
    use(p?: Photo) { if (p) used.add(p.file); return p; },
    has(p?: Photo) { return Boolean(p && used.has(p.file)); },
  };
}
