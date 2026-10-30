import type { APIRoute } from 'astro';
import { abs, biz, addressLine, hoursSummary, fmtTime, NAV_LABELS } from '../lib/site';
import { routes } from '../lib/routes';
import { servedAreas } from '../lib/areas';
import { getMenu, money, priceOptions } from '../lib/menu';

// llms.txt in the llmstxt.org shape: H1, one-line summary blockquote, then
// sections of [label](url) links. Every fact comes from site.json, so it can't drift from the pages.
export const GET: APIRoute = () => {
  const lines: string[] = [];
  lines.push(`# ${biz.name}`, '');
  lines.push(`> ${biz.description}`, '');
  lines.push(`Last updated: ${new Date().toISOString().slice(0, 10)}. Hours, prices and terms below come from the restaurant.`, '');

  lines.push('## Key facts', '');
  lines.push(`- Category: ${biz.category}`);
  lines.push(`- Cuisine: ${biz.cuisines.join(', ')}`);
  lines.push(`- Meals: ${biz.meals.join(', ')}`);
  lines.push(`- Address: ${addressLine()}`);
  lines.push(`- Phone: ${biz.phoneDisplay}`);
  for (const p of biz.additionalPhones as { label: string; display: string }[]) lines.push(`- ${p.label}: ${p.display}`);
  if (biz.email) lines.push(`- Email: ${biz.email}`);
  lines.push(`- Hours: ${hoursSummary().map((h) => `${h.label} ${h.text}`).join('; ')}`);
  const services = Object.entries(biz.services).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase());
  lines.push(`- Services: ${services.join(', ')}`);
  if (biz.serviceArea.length) lines.push(`- ${biz.services.delivery ? 'Delivery area' : 'Neighborhoods served'}: ${biz.serviceArea.join(', ')}`);
  for (const p of (biz as any).servicePeriods ?? []) lines.push(`- ${p.name}: ${p.from && p.to ? `${fmtTime(p.from)} – ${fmtTime(p.to)}` : p.from ? `from ${fmtTime(p.from)}` : ''}${p.days?.length ? ` (${p.days.join(', ')})` : ''}`);
  const partners = (biz.delivery.partners as { name: string }[]).map((x) => x.name).filter(Boolean);
  if (!biz.services.delivery && partners.length) lines.push(`- Restaurant delivery: through ${partners.join(', ')} only (no in-house delivery)`);
  const c = biz.catering;
  if (biz.services.catering) {
    if (c.serviceArea.length) lines.push(`- Catering area: ${c.serviceArea.join(', ')}`);
    if (c.leadTime) lines.push(`- Catering lead time: ${c.leadTime}`);
    if (c.minimum) lines.push(`- Catering minimum: ${c.minimum}`);
    if (c.deliveryNote) lines.push(`- Catering ${/set[- ]?up/i.test(c.deliveryNote) ? 'delivery & set-up' : 'pickup & delivery'}: ${c.deliveryNote}`);
    if (c.menuFile === 'main') lines.push('- Catering is ordered from the regular menu (below)');
  }
  if (biz.hoursNote) lines.push(`- Hours note: ${biz.hoursNote}`);
  lines.push(`- Reservations: ${biz.services.reservations ? (biz.reservations.url ? `yes, book at ${biz.reservations.url}` : 'yes, by phone') : 'not taken (walk-in only)'}`);
  if (biz.address.neighborhood) lines.push(`- Neighborhood: ${biz.address.neighborhood}`);
  if (biz.foundingYear) lines.push(`- Open since: ${biz.foundingYear}`);
  for (const f of biz.founders as { name: string; role: string; bio: string }[]) if (f.name) lines.push(`- ${f.role || 'Owner'}: ${f.name}${f.bio ? `. ${f.bio}` : ''}`);
  for (const a of biz.awards as { name: string; issuer: string; year: string }[]) lines.push(`- Award: ${a.name}, ${a.issuer} ${a.year}`.trim());
  if (biz.google.rating && biz.google.reviewCount) lines.push(`- Google rating: ${biz.google.rating}/5 from ${biz.google.reviewCount} reviews${biz.google.ratingCheckedOn ? ` (as of ${biz.google.ratingCheckedOn})` : ''}`);
  if (servedAreas.length) {
    lines.push('- Areas served (each with its own terms):');
    for (const a of servedAreas) lines.push(`  - ${a.name}${a.zips.length ? ` (${a.zips.join(', ')})` : ''}${a.services.length ? `, ${a.services.join(' & ')}` : ''}${a.terms ? `: ${a.terms}` : ''}`);
  }
  if (biz.priceRange) lines.push(`- Price range: ${biz.priceRange}`);
  const v = ((biz as any).visit ?? {}) as Record<string, string>;
  if (v.parking) lines.push(`- Parking: ${v.parking}`);
  if (v.transit) lines.push(`- Transit: ${v.transit}`);
  if (v.accessibility) lines.push(`- Accessibility: ${v.accessibility}`);
  if ((biz as any).dietaryNote) lines.push(`- Dietary: ${(biz as any).dietaryNote}`);
  const AMEN: Record<string, string> = { wifi: 'free Wi-Fi', outdoorSeating: 'outdoor seating', highChairs: 'high chairs', wheelchairAccessible: 'wheelchair accessible', dogFriendly: 'dogs welcome outside', parking: 'free parking' };
  const amen = Object.entries(((biz as any).amenities ?? {}) as Record<string, boolean>).filter(([k, val]) => val && AMEN[k]).map(([k]) => AMEN[k]);
  if (amen.length) lines.push(`- Amenities: ${amen.join(', ')}`);
  if (((biz as any).paymentMethods ?? []).length) lines.push(`- Payment: ${(biz as any).paymentMethods.join(', ')}`);
  for (const p of biz.press as { outlet: string; title: string; date: string }[]) lines.push(`- Press: ${p.outlet}${p.title ? `, "${p.title}"` : ''}${p.date ? ` (${p.date.slice(0, 7)})` : ''}`);
  lines.push('');

  lines.push('## Pages', '');
  for (const r of routes()) {
    const label = r.name === 'home' ? 'Home' : r.label ?? NAV_LABELS[r.name] ?? r.name;
    lines.push(`- [${label}](${abs(r.path)})${r.description ? `: ${r.description}` : ''}`);
  }
  if (biz.ordering.url) lines.push(`- [Order online](${biz.ordering.url}): order ahead from the full menu for pickup${biz.services.delivery ? ' or delivery' : ''} at ${biz.address.street}`);
  if (biz.google.mapsUrl?.startsWith('http')) lines.push(`- [Google Maps listing](${biz.google.mapsUrl}): address, directions, photos and Google reviews`);
  lines.push('');

  const featured = biz.featuredItems as string[];
  const menu = getMenu('main');
  if (menu && featured.length) {
    // One line per signature dish: the first menu item with that name (the one the site's copy quotes). Its section is
    // named when the same name sits in another section too ("The Works" round $14 vs Sicilian $19/$26).
    const rows = menu.subcategories.flatMap((s) => s.items.map((i) => ({ i, sec: s.name })));
    const items = featured.map((f) => rows.find((r) => r.i.name === f)).filter(Boolean) as { i: (typeof rows)[number]['i']; sec: string }[];
    if (items.length) {
      lines.push('## Signature dishes', '');
      for (const { i, sec } of items) {
        const opts = priceOptions(i);
        const price = opts.length ? opts.map((o) => `${o.label} ${o.price}`).join(', ') : money(i.price);
        const shared = rows.filter((r) => r.i.name === i.name).length > 1;
        lines.push(`- ${i.name}${shared ? ` (${sec})` : ''}, ${price}${i.description ? `: ${i.description}` : ''}`);
      }
      lines.push('');
    }
  }

  const cmenu = biz.services.catering && biz.catering.menuFile !== 'main' ? getMenu(biz.catering.menuFile) : null;
  if (cmenu) {
    lines.push('## Catering menu', '');
    for (const i of cmenu.subcategories.flatMap((s) => s.items)) lines.push(`- ${i.name} (${money(i.price)})${i.description ? `: ${i.description}` : ''}`);
    lines.push('');
  }

  const social = Object.entries(biz.social as Record<string, string>).filter(([, u]) => u?.startsWith('http'));
  if (social.length) {
    lines.push('## Official profiles', '');
    for (const [k, u] of social) lines.push(`- [${k[0].toUpperCase() + k.slice(1)}](${u})`);
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
