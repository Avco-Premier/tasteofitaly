import data from '../data/site.json';

export const site = data.site;
export const biz = data.business as typeof data.business & {
  video: null | { title: string; description: string; file: string; poster: string; uploadDate: string };
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

/** Base URL the site is being built for (SITE_URL env wins over site.json). */
export function baseUrl(): string {
  return (import.meta.env.SITE as string) || site.url;
}

export function abs(path: string): string {
  return new URL(path, baseUrl()).href;
}

/** "07:00" -> "7 AM", "17:30" -> "5:30 PM". One format everywhere keeps hours consistent. */
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 && h < 24 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

export type DayRow = { day: string; short: string; text: string; closed: boolean };

export function hoursByDay(): DayRow[] {
  return DAYS.map((day) => {
    const spans = biz.hours.filter((h) => h.days.includes(day));
    if (!spans.length) return { day, short: SHORT[day], text: 'Closed', closed: true };
    const text = spans.map((s) => `${fmtTime(s.opens)} – ${fmtTime(s.closes)}`).join(', ');
    return { day, short: SHORT[day], text, closed: false };
  });
}

/** Consecutive days with identical hours collapse: "Mon–Fri: 7 AM – 5 PM". */
export function hoursSummary(): { label: string; text: string }[] {
  const rows = hoursByDay();
  const out: { label: string; text: string }[] = [];
  let start = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].text !== rows[start].text) {
      const label = i - 1 === start ? rows[start].short : `${rows[start].short}–${rows[i - 1].short}`;
      out.push({ label, text: rows[start].text });
      start = i;
    }
  }
  return out;
}

/** "4.5★ from 343+ reviews", linked to the Google reviews, plus the write-a-review link; null without a rating.
 *  Shown as text, never as aggregateRating markup (first-party review stars are self-serving to Google). */
export function ratingLine(): { text: string; url: string; writeUrl: string } | null {
  const g = biz.google as Record<string, any>;
  const rating = Number(g.rating), count = Number(g.reviewCount);
  if (!rating || !count) return null;
  const pid = g.placeId && !String(g.placeId).startsWith('TODO') ? String(g.placeId) : '';
  const url = pid ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(pid)}` : g.mapsUrl || '';
  return { text: `${rating}★ from ${count}+ reviews`, url, writeUrl: g.reviewUrl?.startsWith('http') ? g.reviewUrl : '' };
}

/** The site's look: "market", "bold", "slice" or the original "classic". One stylesheet per site (styles/theme.css,
 *  copied in by quickbuild); the markup, copy and schema are the same for all, so SEO doesn't depend on the look. */
export const variant: string = ((site as any).theme as string) || 'classic';

/** "Dine in · Pickup · Delivery within 4 miles · $2 fee · $20 minimum": the services as one line (announcement bar, fact strip). */
export function serviceBits(): string[] {
  const s = biz.services, d = (biz as any).delivery ?? {};
  return [
    s.dineIn ? 'Dine in' : '', s.takeout ? 'Pickup' : '',
    s.delivery ? `Delivery${d.radiusMiles ? ` within ${d.radiusMiles} miles` : ''}` : '',
    s.delivery && d.fee ? `${d.fee} delivery fee` : '', s.delivery && d.minimum ? `${d.minimum} minimum` : '',
  ].filter(Boolean);
}

export function addressLine(): string {
  const a = biz.address;
  return `${a.street}, ${a.locality}, ${a.region} ${a.postalCode}`;
}

/** Google Maps turn-by-turn directions to the listing (falls back to the address). */
export function directionsUrl(): string {
  const dest = encodeURIComponent(addressLine());
  const pid = biz.google.placeId && !biz.google.placeId.startsWith('TODO') ? `&destination_place_id=${encodeURIComponent(biz.google.placeId)}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${pid}`;
}

export function telHref(phone = biz.phone): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

export function sameAs(): string[] {
  const s = biz.social as Record<string, string>;
  const partners = ((biz.delivery?.partners ?? []) as { url: string }[]).map((p) => p.url);
  return [biz.google.mapsUrl, ...Object.values(s), ...partners].filter((u) => u && u.startsWith('http'));
}

export const enabledServices = Object.entries(biz.services)
  .filter(([, on]) => on)
  .map(([k]) => k);

export const NAV_LABELS: Record<string, string> = {
  menu: 'Menu',
  catering: 'Catering',
  about: 'About',
  visit: 'Visit',
  faq: 'FAQ',
  'private-events': 'Private Events',
  delivery: 'Delivery',
  privacy: 'Privacy',
};

// ---- Brand colors (site.colors: { brand, background }), chosen in the studio's color step.
// Every other token is derived, and text colors are picked for AA contrast, so any pair the studio allows stays readable.
const hex = (h: string) => { const m = h.replace('#', ''); const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const lum = (h: string) => { const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function themeVars(): string {
  const c = (site as any).colors as { brand?: string; background?: string } | undefined;
  const valid = (v?: string) => !!v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
  if (!c || (!valid(c.brand) && !valid(c.background))) return '';
  const brand = valid(c.brand) ? c.brand! : '#01432f';
  const bg = valid(c.background) ? c.background! : '#fbf0db';
  // Text on the brand color: the background color when it reads well, else white or near-black.
  const ink = contrast(bg, brand) >= 4.5 ? bg : contrast('#ffffff', brand) >= 4.5 ? '#ffffff' : '#141414';
  const dark = lum(brand) < 0.18;
  const vars: Record<string, string> = {
    '--brand': brand,
    '--brand-2': mix(brand, dark ? '#ffffff' : '#000000', 0.14),
    '--brand-ink': ink,
    // Softer text tones on the brand color, unless that drops them under 4.5:1 (a bright red leaves no room): then the full ink.
    '--on-brand-muted': contrast(mix(ink, brand, 0.12), brand) >= 4.5 ? mix(ink, brand, 0.12) : ink,
    '--on-brand-soft': contrast(mix(ink, brand, 0.06), brand) >= 4.5 ? mix(ink, brand, 0.06) : ink,
    '--bg': bg,
    '--line-warm': mix(bg, '#000000', 0.11),
    '--sand': mix(bg, '#000000', 0.07),
  };
  // html:root outranks global.css's :root, which the page loads after this inline block.
  return `html:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}
