import type { APIRoute } from 'astro';
import { site } from '../data/site';
export const GET: APIRoute = () => new Response(`# ${site.name}

> Pizza and Italian food at 40-05 Junction Boulevard, Corona, Queens, NY 11368. Phone: ${site.phone}.

## Website
- [Home](${site.url}/): Restaurant overview.
- [Menu](${site.url}/menu/): Browse the restaurant menu. Confirm current prices and availability in direct ordering.
- [Specials](${site.url}/specials/): Family meal and combo information.
- [Catering](${site.url}/catering/): Group meal information; contact the restaurant to confirm details.
- [Our Story](${site.url}/about/): About Taste of Italy.
- [Visit](${site.url}/visit/): Address, telephone and visitor information. Confirm hours with the restaurant.

## Direct ordering
- [Order pickup or delivery](${site.orderUrl}): AVCO direct ordering; authoritative current options, prices and availability.
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
