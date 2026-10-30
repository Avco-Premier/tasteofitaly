import { abs, biz, site, sameAs, DAYS } from './site';
import { getMenu, allItems, priceOptions, findItem, DIETS, type Menu, type MenuItem } from './menu';
import { servedAreas } from './areas';
import { routes, lastmod } from './routes';
import { dishPhoto } from './photos';

// One entity graph, generated from site.json, emitted on every page.
// Every page references the same Restaurant @id, so search engines and AI
// systems see one consistent business instead of several conflicting ones.

export const ids = {
  restaurant: () => abs('/#restaurant'),
  website: () => abs('/#website'),
  menu: () => abs('/menu/#menu'),
  catering: () => abs('/catering/#service'),
  logo: () => abs('/#logo'),
};

export type PageKind = 'home' | 'menu' | 'catering' | 'about' | 'visit' | 'faq' | 'dish' | 'area' | 'page';
export type Crumb = { name: string; path: string };
export type PageCtx = {
  kind: PageKind;
  path: string;
  title: string;
  description: string;
  crumbs: Crumb[];
  imageUrl?: string;
  logoUrl?: string;
  imageUrls?: string[];
  dish?: string;
  area?: string;
};

function openingHours() {
  return biz.hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days.filter((d) => DAYS.includes(d)).map((d) => `https://schema.org/${d}`),
    opens: h.opens,
    closes: h.closes,
  }));
}

function areaServed(names: string[]) {
  return names.map((name) => ({ '@type': 'Place', name }));
}

// Towns are their own locality; a neighborhood ("West Asheville") sits inside the restaurant's city.
const locality = (a: { name: string; kind: string }) =>
  /neighbou?rhood|suburb|quarter/i.test(a.kind) ? biz.address.locality : a.name;

function areasWithZips() {
  return servedAreas.map((a) => ({
    '@type': 'Place',
    name: a.name,
    address: a.zips.length
      ? a.zips.map((z) => ({ '@type': 'PostalAddress', addressLocality: locality(a), postalCode: z, addressRegion: biz.address.region, addressCountry: biz.address.country }))
      : { '@type': 'PostalAddress', addressLocality: locality(a), addressRegion: biz.address.region, addressCountry: biz.address.country },
  }));
}

// GBP categories that have a schema.org type of their own: a cafe-bakery is ["Restaurant","Bakery"].
const EXTRA_TYPES: [RegExp, string][] = [[/bakery/i, 'Bakery'], [/coffee|cafe|café/i, 'CafeOrCoffeeShop'], [/\bbar\b|pub/i, 'BarOrPub'], [/brewery|brewpub/i, 'Brewery'], [/winery/i, 'Winery']];
const extraTypes = [...new Set(((biz.gbpCategories ?? []) as string[]).flatMap((c) => EXTRA_TYPES.filter(([re]) => re.test(c)).map(([, t]) => t)))];

function restaurant(ctx: PageCtx) {
  const node: Record<string, unknown> = {
    '@type': extraTypes.length ? ['Restaurant', ...extraTypes] : 'Restaurant',
    '@id': ids.restaurant(),
    name: biz.name,
    description: biz.description,
    url: abs('/'),
    telephone: biz.phone,
    priceRange: biz.priceRange,
    // Meals people search for ("breakfast", "brunch") ride along with the cuisines.
    servesCuisine: [...biz.cuisines, ...(biz.meals as string[]).filter((m) => /breakfast|brunch/i.test(m)).map((m) => m[0].toUpperCase() + m.slice(1))],
    address: {
      '@type': 'PostalAddress',
      streetAddress: biz.address.street,
      addressLocality: biz.address.locality,
      addressRegion: biz.address.region,
      postalCode: biz.address.postalCode,
      addressCountry: biz.address.country,
    },
    openingHoursSpecification: openingHours(),
    acceptsReservations: biz.services.reservations ? (biz.reservations.url || true) : false,
    // A typed reference (with url) so the link resolves even on pages that don't embed the full Menu.
    hasMenu: { '@type': 'Menu', '@id': ids.menu(), url: abs('/menu/') },
  };
  if (biz.alternateNames.length) node.alternateName = biz.alternateNames;
  if (biz.geo.lat != null && biz.geo.lng != null) {
    node.geo = { '@type': 'GeoCoordinates', latitude: biz.geo.lat, longitude: biz.geo.lng };
  }
  if (biz.google.mapsUrl?.startsWith('http')) node.hasMap = biz.google.mapsUrl;
  if (biz.email) node.email = biz.email;
  if (ctx.logoUrl) node.logo = { '@type': 'ImageObject', '@id': ids.logo(), url: ctx.logoUrl };
  // Press coverage the site cites, as the articles the business is the subject of.
  const press = (biz.press as { outlet: string; title: string; url: string; date: string }[]).filter((p) => p.url?.startsWith('http'));
  if (press.length) node.subjectOf = press.map((p) => ({ '@type': 'NewsArticle', headline: p.title || p.outlet, url: p.url, ...(p.date ? { datePublished: p.date } : {}), publisher: { '@type': 'Organization', name: p.outlet } }));
  if (ctx.imageUrls?.length) node.image = ctx.imageUrls;
  const links = sameAs();
  if (links.length) node.sameAs = links;
  // The restaurant itself 'serves' only areas it delivers to; catering-only areas belong to the catering Service.
  const deliveryAreas = areasWithZips().filter((p) => servedAreas.find((a) => a.name === p.name)?.services.includes('delivery'));
  if (deliveryAreas.length) {
    // the restaurant's own town first (it isn't a "served area" row: it's home), then the radius as a circle
    const home = { '@type': 'Place', name: biz.address.locality, address: { '@type': 'PostalAddress', addressLocality: biz.address.locality, postalCode: biz.address.postalCode, addressRegion: biz.address.region, addressCountry: biz.address.country } };
    const r = Number((biz as any).delivery?.radiusMiles);
    const circle = r ? [{ '@type': 'GeoCircle', geoMidpoint: { '@type': 'GeoCoordinates', latitude: biz.geo.lat, longitude: biz.geo.lng }, geoRadius: Math.round(r * 1609.34) }] : [];
    node.areaServed = [home, ...deliveryAreas.filter((p) => p.name !== biz.address.locality), ...circle];
  }
  else if (biz.services.delivery && biz.serviceArea.length) node.areaServed = areaServed(biz.serviceArea);
  const fd = (biz as any).foundingDate || (biz.foundingYear ? String(biz.foundingYear) : '');
  if (fd) node.foundingDate = fd;
  const amen = ((biz as any).amenities ?? {}) as Record<string, boolean>;
  const AMEN: Record<string, string> = { wifi: 'Free Wi-Fi', outdoorSeating: 'Outdoor seating', highChairs: 'High chairs', wheelchairAccessible: 'Wheelchair accessible', dogFriendly: 'Dog-friendly outdoor seating', parking: 'Parking' };
  const feats = Object.entries(amen).filter(([k]) => AMEN[k]).map(([k, v]) => ({ '@type': 'LocationFeatureSpecification', name: AMEN[k], value: Boolean(v) }));
  if (feats.length) node.amenityFeature = feats;
  const pay = ((biz as any).paymentMethods ?? []) as string[];
  if (pay.length) node.paymentAccepted = pay.join(', ');
  const founders = biz.founders.filter((f) => f.name && !f.name.startsWith('TODO'));
  const person = (f: { name: string; role: string; bio?: string }) => ({ '@type': 'Person', '@id': abs(`/about/#${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`), name: f.name, jobTitle: f.role, ...(f.bio ? { description: f.bio } : {}) });
  // An owner who took over later ("Owner (since 2013)" at a place opened in 1969) is not its founder.
  const fy = Number(biz.foundingYear) || 0;
  const cameLater = (f: { role: string; bio?: string }) => {
    const m = `${f.role} ${f.bio ?? ''}`.match(/\bsince (\d{4})\b|\b(?:took over|bought|purchased|acquired)\b[^.]*?\b(\d{4})\b/i);
    return fy > 0 && m != null && Number(m[1] ?? m[2]) > fy;
  };
  const original = founders.filter((f) => !cameLater(f));
  const later = founders.filter(cameLater);
  if (original.length) node.founder = original.map(person);
  if (later.length) node.employee = later.map(person);
  if (biz.awards.length) node.award = biz.awards.map((a: any) => [a.name, a.issuer, a.year].filter(Boolean).join(', '));
  if (biz.additionalPhones.length) {
    // contactType is the short label before any parenthesis: "Catering line (Dana)" → "Catering line".
    node.contactPoint = biz.additionalPhones.map((p: any) => ({ '@type': 'ContactPoint', contactType: p.label.split('(')[0].trim(), telephone: p.phone }));
  }
  const today = new Date().toISOString().slice(0, 10);
  const closures = (((biz as any).specialClosures ?? []) as { date: string; name?: string }[]).filter((c) => c.date >= today);
  if (closures.length) {
    node.specialOpeningHoursSpecification = closures.map((c) => ({ '@type': 'OpeningHoursSpecification', name: c.name, validFrom: c.date, validThrough: c.date, opens: '00:00', closes: '00:00' }));
  }
  // Inline stub (type, @id, name, url) so the reference resolves on every page, not only /catering/.
  if (biz.services.catering) node.makesOffer = { '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': ids.catering(), name: `${biz.name} Catering`, url: abs('/catering/') } };
  if (biz.ordering.url) {
    node.potentialAction = {
      '@type': 'OrderAction',
      target: { '@type': 'EntryPoint', urlTemplate: biz.ordering.url, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
      // Own delivery (a radius, not only third-party apps) is DeliveryModeOwnFleet; otherwise the schema contradicts "we deliver".
      ...((biz.services.takeout || biz.services.delivery)
        ? { deliveryMethod: [
            ...(biz.services.takeout ? ['https://schema.org/OnSitePickup'] : []),
            ...(biz.services.delivery && biz.delivery?.radiusMiles ? ['https://schema.org/DeliveryModeOwnFleet'] : []),
          ] }
        : {}),
    };
  }
  return node;
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': ids.website(),
    url: abs('/'),
    name: biz.name,
    inLanguage: site.language,
    publisher: { '@id': ids.restaurant() },
  };
}

const PAGE_TYPE: Record<PageKind, string> = {
  home: 'WebPage', menu: 'WebPage', catering: 'WebPage', about: 'AboutPage', visit: 'ContactPage', faq: 'FAQPage', dish: 'WebPage', area: 'WebPage', page: 'WebPage',
};

function webPage(ctx: PageCtx) {
  const node: Record<string, unknown> = {
    '@type': PAGE_TYPE[ctx.kind],
    '@id': `${abs(ctx.path)}#webpage`,
    url: abs(ctx.path),
    name: ctx.title,
    description: ctx.description,
    inLanguage: site.language,
    isPartOf: { '@id': ids.website() },
    about: { '@id': ids.restaurant() },
  };
  const route = routes().find((r) => r.path === ctx.path);
  if (route) node.dateModified = lastmod(route);
  if (ctx.imageUrl) node.primaryImageOfPage = { '@type': 'ImageObject', url: ctx.imageUrl };
  if (ctx.kind !== 'home') node.breadcrumb = { '@id': `${abs(ctx.path)}#breadcrumb` };
  if (ctx.kind === 'menu') node.mainEntity = { '@id': ids.menu() };
  if (ctx.kind === 'about' || ctx.kind === 'visit') node.mainEntity = { '@id': ids.restaurant() };
  if (ctx.kind === 'dish' && ctx.dish) {
    const it = findItem(ctx.dish, [getMenu('main'), getMenu(biz.catering.menuFile)]);
    if (it) node.mainEntity = { ...menuItem(it), '@id': `${abs(ctx.path)}#dish` };
  }
  if (ctx.kind === 'area' && ctx.area) node.spatialCoverage = { '@type': 'Place', name: ctx.area };
  if (ctx.kind === 'catering' && biz.services.catering) node.mainEntity = { '@id': ids.catering() };
  if (ctx.kind === 'faq') {
    node.mainEntity = biz.faq.map((f: any) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    }));
  }
  return node;
}

function breadcrumbs(ctx: PageCtx) {
  const trail = [{ name: 'Home', path: '/' }, ...ctx.crumbs];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(ctx.path)}#breadcrumb`,
    itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  };
}

function addOnItems(i: MenuItem) {
  return (i.modifications ?? [])
    .filter((m) => !m.isRequired)
    .flatMap((m) => m.detailedModifications)
    .map((d) => ({ '@type': 'MenuItem', name: d.name, offers: { '@type': 'Offer', price: Number(d.additionalPrice || 0).toFixed(2), priceCurrency: 'USD' } }));
}

function menuItem(i: MenuItem) {
  const options = priceOptions(i);
  const diets = (i.diets ?? []).map((d) => DIETS[d]?.schema).filter(Boolean);
  return {
    '@type': 'MenuItem',
    name: i.name,
    ...(i.description ? { description: i.description } : {}),
    ...(dishPhoto(i.name) ? { image: abs(dishPhoto(i.name)!.src.src) } : {}),
    ...(diets.length ? { suitableForDiet: diets } : {}),
    ...(addOnItems(i).length ? { menuAddOn: addOnItems(i) } : {}),
    // Sized items publish one Offer per size, so the markup carries every visible price.
    offers: options.length
      ? options.map((o) => ({ '@type': 'Offer', name: `${i.name} (${o.label})`, price: o.amount.toFixed(2), priceCurrency: 'USD' }))
      : { '@type': 'Offer', price: Number(i.price).toFixed(2), priceCurrency: 'USD' },
  };
}

function menuNode(menu: Menu, id: string, url: string) {
  return {
    '@type': 'Menu',
    '@id': id,
    name: menu.menuName,
    url,
    inLanguage: site.language,
    hasMenuSection: menu.subcategories.map((s) => ({
      '@type': 'MenuSection',
      name: s.name,
      ...(s.description ? { description: s.description } : {}),
      hasMenuItem: s.items.map((i) => menuItem(i)),
    })),
  };
}

function cateringService() {
  const c = biz.catering;
  // Catering ordered from the regular menu: the Menu node already lists it; repeating it as Offers is 38 KB of duplicate data.
  const menu = c.menuFile !== 'main' ? getMenu(c.menuFile) : null;
  const node: Record<string, unknown> = {
    '@type': 'Service',
    '@id': ids.catering(),
    serviceType: 'Catering',
    name: `${biz.name} Catering`,
    url: abs('/catering/'),
    provider: { '@id': ids.restaurant() },
    // Confirmed catering areas carry their zip codes; fall back to the plain names.
    areaServed: servedAreas.some((a) => a.services.includes('catering'))
      ? areasWithZips().filter((p) => servedAreas.find((a) => a.name === p.name)?.services.includes('catering'))
      : areaServed(c.serviceArea.length ? c.serviceArea : biz.serviceArea),
  };
  // Area-specific conditions ("25+ guests only") belong in the terms too, not just on the page.
  const areaRules = servedAreas.filter((a) => a.services.includes('catering') && /\bonly\b|\d+\s*\+|minimum/i.test(a.terms)).map((a) => `${a.name}: ${a.terms}.`);
  // "48 hours" reads as a duration; anything else is the client's own sentence ("Call ahead with your headcount.").
  const lead = c.leadTime && (/^\s*(?:at least\s+)?(?:\d+|one|two|three|four|five|six|seven|a|an)(?:\s*(?:-|–|to)\s*\d+)?\s*(?:business\s+)?(?:hours?|hrs?|days?|weeks?)\s*\.?\s*$/i.test(c.leadTime)
    ? `Order ${c.leadTime.replace(/\.$/, '')} ahead.` : c.leadTime.replace(/([^.!?])$/, '$1.'));
  const terms = [lead, c.minimum && `Minimum ${c.minimum}.`, c.deliveryNote, ...areaRules].filter(Boolean).join(' ');
  if (terms) node.description = terms;
  if (menu) {
    // Service.hasOfferCatalog must be an OfferCatalog; each catering item is an Offer.
    node.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: menu.menuName,
      itemListElement: menu.subcategories.map((s) => ({
        '@type': 'OfferCatalog',
        name: s.name,
        itemListElement: s.items.map((i) => {
          // "per person", "per dozen", "serves 10" in the description become a unit price.
          const d = (i.description || '').toLowerCase();
          // Only an explicit "per …" is a unit price; "serves 10" describes the portion and stays in the description.
          const unit = /per (person|guest)/.test(d) ? 'person' : /per dozen|a dozen|one dozen/.test(d) ? 'dozen' : /per tray/.test(d) ? 'tray' : '';
          return {
            '@type': 'Offer',
            price: Number(i.price).toFixed(2),
            priceCurrency: 'USD',
            ...(unit ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: Number(i.price).toFixed(2), priceCurrency: 'USD', unitText: unit } } : {}),
            itemOffered: { '@type': 'MenuItem', name: i.name, ...(i.description ? { description: i.description } : {}) },
          };
        }),
      })),
    };
  }
  return node;
}

function videoNode() {
  const v = biz.video;
  if (!v || !v.file) return null;
  return {
    '@type': 'VideoObject',
    name: v.title,
    description: v.description,
    thumbnailUrl: abs(v.poster),
    contentUrl: abs(v.file),
    uploadDate: v.uploadDate,
  };
}

function apps() {
  const out: Record<string, unknown>[] = [];
  if (biz.apps.iosUrl) out.push({ '@type': 'MobileApplication', name: biz.name, operatingSystem: 'iOS', applicationCategory: 'FoodAndDrinkApplication', url: biz.apps.iosUrl, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
  if (biz.apps.androidUrl) out.push({ '@type': 'MobileApplication', name: biz.name, operatingSystem: 'Android', applicationCategory: 'FoodAndDrinkApplication', url: biz.apps.androidUrl, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
  return out;
}

export function graph(ctx: PageCtx) {
  const nodes: Record<string, unknown>[] = [restaurant(ctx), website(), webPage(ctx)];
  if (ctx.kind !== 'home') nodes.push(breadcrumbs(ctx));
  const main = getMenu('main');
  if (ctx.kind === 'menu' && main) nodes.push(menuNode(main, ids.menu(), abs('/menu/')));
  if (ctx.kind === 'catering' && biz.services.catering) nodes.push(cateringService());
  if (ctx.kind === 'home') {
    const v = videoNode();
    if (v) nodes.push(v);
    nodes.push(...apps());
  }
  return { '@context': 'https://schema.org', '@graph': nodes };
}

export function menuItemCount(): number {
  const m = getMenu('main');
  return m ? allItems(m).length : 0;
}
