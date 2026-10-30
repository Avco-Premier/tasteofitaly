# quickbuild report — Taste of Italy

Built 2026-10-30 · 1 gate round(s) · **0 FAIL · 17 WARN**

## Warnings

- Inputs · Trust (E-E-A-T) inputs (site): Missing or thin: owner/founder names; opening year. Ask the client — never invent these.
- Inputs · Analytics configured (site): site.analytics.ga4Id is empty — the site will launch without traffic data
- Images · Image weight (/about/): 615.DSHDsCaF_2lHIVr.jpg is 244 KB
- Content · Claims to verify (/about/): 1 sentence(s) make popularity/process claims not found in intake.md — confirm or cut: 95), lunch specials every day ($15
- Content · No repeated facts (/about/): Stated 4+ times: '$11.95' ×4 — say each fact once, where it's most useful
- Images · Image weight (/faq/): 615.DSHDsCaF_2lHIVr.jpg is 244 KB
- Content · Claims to verify (/faq/): 1 sentence(s) make popularity/process claims not found in intake.md — confirm or cut: The menu has 14 sections: Menu Family Special Combo, Drinks, Gourmet Italian Pizza, Chef Salads, Buffalo Chick
- Content · No repeated facts (/faq/): Stated 4+ times: '$12.95' ×9, '$14.95' ×7, '$9.95' ×8, '$18.95' ×5, '$10.95' ×7 — say each fact once, where it's most useful
- Images · Image weight (/): 610.DSF9mXqN_2eYBd9.jpg is 229 KB
- Images · Image weight (/): 615.DSHDsCaF_2lHIVr.jpg is 244 KB
- Images · Image weight (/): 615.DSHDsCaF_2lHIVr.jpg is 244 KB
- Images · Image weight (/): 615.DSHDsCaF_2lHIVr.jpg is 244 KB
- Images · Image weight (/menu/): 610.DSF9mXqN_2eYBd9.jpg is 229 KB
- Technical · No inline scripts (CSP) (/menu/): Inline <script> found; move it to a file so CSP can stay script-src 'self'
- Content · Lists joined once (/menu/): Double 'and' in a list: “…, and smoky ham — bold and satisfying.”
- Content · Claims to verify (/menu/): 1 sentence(s) make popularity/process claims not found in intake.md — confirm or cut: It has 14 sections: menu family special combo, drinks, gourmet italian pizza, chef salads, buffalo chicken win
- Content · Word count ≥ 500 (/visit/): 464 words in <main>

## Generic text in use (replace with the owner's words when you have them)

- `featured`
- `business.known_for`

## Answers that would make the site stronger

- **/visit/** is 36 words short: answer visit.neighborhood_text, visit.landmarks, visit.parking, visit.transit in full
- `business.founding_year` — Year it opened (blank if unknown)
- `business.founding_date` — Exact opening date YYYY-MM-DD or YYYY-MM (blank if unknown)
- `business.description` — One factual sentence: what it is, where, since when
- `menu.dietary_note` — Dietary / allergy note that is TRUE (e.g. 'Gluten-free toast +$2; not a gluten-free kitchen.')
- `visit.parking` — Parking
- `visit.arrival` — Best time to come / waits
- `visit.pickup` — Where to pick up online orders
- `amenities.wifi` — Free Wi-Fi?
- `amenities.high_chairs` — High chairs?
- `amenities.dog_friendly` — Dogs allowed (outside)?
- `amenities.parking` — Free parking available?
- `founders` — Owners / chefs
- `extra_faq` — Extra questions guests ask (optional)

## Next

- `npm run preview:bg` then open http://127.0.0.1:4321/ (stop with `npm run preview:stop`)
- Full gate: `npm run preview:bg && npm run check:full; npm run preview:stop`
- Deploy: see references/launch.md (Vercel, `VERCEL_DEEP_CLONE=true`)
