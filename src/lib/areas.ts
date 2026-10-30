// Service areas from src/data/areas.json (written by scripts/local_areas.py, reviewed with the client).
// Only areas the client confirmed (serve: true) are ever shown or marked up.
export type Area = {
  name: string; kind: string; distanceMi: number; zips: string[];
  serve: boolean | null; services: string[]; terms: string; page: boolean;
};

const file = import.meta.glob<{ default: { areas: Area[] } }>('../data/areas.json', { eager: true });
const all: Area[] = Object.values(file)[0]?.default.areas ?? [];

export const servedAreas: Area[] = all.filter((a) => a.serve === true).sort((a, b) => a.distanceMi - b.distanceMi);

export function areaSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');
}

export function findArea(name: string): Area | undefined {
  const n = name.trim().toLowerCase();
  return servedAreas.find((a) => a.name.toLowerCase() === n);
}
