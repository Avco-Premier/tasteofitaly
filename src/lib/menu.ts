// Menus use the menu-to-json schema: { menuName, subcategories: [{ name, description, items: [...] }] }
type DetailedMod = { name: string; additionalPrice: string };
type Mod = { name: string; isRequired: boolean; minChoices: number; maxChoices: number; detailedModifications: DetailedMod[] };
export type MenuItem = { name: string; description: string; price: string; displayOrder: number; imageUrl?: string; modifications?: Mod[]; diets?: string[] };

// Optional per-item diet tags (added by the builder, only when the kitchen confirms them).
export const DIETS: Record<string, { label: string; schema: string }> = {
  vegan: { label: 'VG', schema: 'https://schema.org/VeganDiet' },
  vegetarian: { label: 'V', schema: 'https://schema.org/VegetarianDiet' },
  glutenFree: { label: 'GF', schema: 'https://schema.org/GlutenFreeDiet' },
  halal: { label: 'Halal', schema: 'https://schema.org/HalalDiet' },
  kosher: { label: 'Kosher', schema: 'https://schema.org/KosherDiet' },
  dairyFree: { label: 'DF', schema: '' },
};
export type MenuSection = { name: string; description: string; displayOrder: number; items: MenuItem[] };
export type Menu = { menuName: string; subcategories: MenuSection[] };

const files = import.meta.glob<{ default: Menu }>('../data/menus/*.json', { eager: true });

export function getMenu(name: string): Menu | null {
  const hit = Object.entries(files).find(([path]) => path.endsWith(`/${name}.json`));
  if (!hit) return null;
  const menu = hit[1].default;
  return {
    ...menu,
    subcategories: [...menu.subcategories]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({ ...s, items: [...s.items].sort((a, b) => a.displayOrder - b.displayOrder) })),
  };
}

export function slug(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
}

/** "12.00" -> "$12", "12.50" -> "$12.50". */
export function money(p: string | number): string {
  const n = typeof p === 'number' ? p : parseFloat(p);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** Required single-choice groups (sizes, quantities) become visible price options. */
export function priceOptions(item: MenuItem): { label: string; price: string; amount: number }[] {
  const base = parseFloat(item.price);
  // Only groups whose options change the price are sizes; a required free choice
  // (grits or home fries) stays in the description instead of becoming a price list.
  const group = item.modifications?.find((m) => m.isRequired && m.maxChoices === 1 && m.detailedModifications.length > 1
    && m.detailedModifications.some((d) => parseFloat(d.additionalPrice || '0') !== 0));
  if (!group) return [];
  return group.detailedModifications.map((d) => {
    const amount = Math.round((base + parseFloat(d.additionalPrice || '0')) * 100) / 100;
    return { label: d.name, price: money(amount), amount };
  });
}

/** Optional add-on groups summarised as one line, e.g. "Add: bacon +$2, avocado +$1.50". */
export function addOns(item: MenuItem): string {
  const groups = (item.modifications || []).filter((m) => !m.isRequired);
  const parts = groups.flatMap((g) =>
    g.detailedModifications.map((d) => (parseFloat(d.additionalPrice) > 0 ? `${d.name} +${money(d.additionalPrice)}` : d.name)),
  );
  return parts.length ? parts.slice(0, 12).join(', ') : '';
}

export function allItems(menu: Menu): MenuItem[] {
  return menu.subcategories.flatMap((s) => s.items);
}

export function findItem(name: string, menus: (Menu | null)[]): MenuItem | undefined {
  const target = name.trim().toLowerCase();
  for (const m of menus) {
    const hit = m && allItems(m).find((i) => i.name.trim().toLowerCase() === target);
    if (hit) return hit;
  }
  return undefined;
}
