// The home copy (src/copy/home.md, written by quickbuild) split into blocks, so a theme can spread it over separate
// sections instead of one long column. Same words, same order of importance: nothing is added or dropped.
import raw from '../copy/home.md?raw';
import data from '../data/site.json';

export type Block = { id: string; heading: string; html: string };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** The small markdown quickbuild writes: paragraphs, "- " lists, **bold**, [text](url). */
export function md(src: string): string {
  const inline = (t: string) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, url) => `<a href="${url}"${/^https?:/.test(url) ? ' rel="noopener"' : ''}>${txt}</a>`);
  return src.trim().split(/\n{2,}/).map((para) => {
    const lines = para.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('');
}

const KINDS: [string, RegExp][] = [
  ['known', /known for|what is .* known/i],
  ['delivery', /delivery in|where we deliver/i],
  ['how', /dine in|take ?out|order ahead/i],
  ['pickup', /pickup|ordering/i],
  ['find', /where to find|find us|getting here/i],
];

/** intro (the opening paragraph), named blocks (known, how, delivery, pickup, find), the rest in order, and the closing link row. */
export function homeBlocks(): { intro: string; blocks: Record<string, Block>; rest: Block[]; links: string } {
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  const [first, ...parts] = body.split(/^## /m);
  const blocks: Record<string, Block> = {};
  const rest: Block[] = [];
  let links = '';
  for (const part of parts) {
    const [head, ...lines] = part.split('\n');
    let text = lines.join('\n').trim();
    // the page's closing link row ("[Hours…](/visit/) · [Our story](/about/) · …") rides on the last section
    const tail = text.match(/\n\n(\[[^\n]+\]\([^)]+\)(?: · \[[^\n]+\]\([^)]+\))+)\s*$/);
    if (tail) { links = md(tail[1]); text = text.slice(0, tail.index).trim(); }
    const heading = head.trim();
    const kind = KINDS.find(([k, rx]) => !blocks[k] && rx.test(heading))?.[0];
    const block = { id: kind ?? heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), heading, html: md(text) };
    if (kind) blocks[kind] = block; else rest.push(block);
  }
  let intro = first.trim();
  const lone = intro.match(/\n\n(\[[^\n]+\]\([^)]+\)(?: · \[[^\n]+\]\([^)]+\))+)\s*$/);
  if (lone && !parts.length) { links = md(lone[1]); intro = intro.slice(0, lone.index).trim(); }
  return { intro: md(intro), blocks, rest, links };
}

/** A heading as HTML with the town's name wrapped in <span class="hl"> ("Pizza delivery in <span>East Northport</span>"),
 *  so a theme can colour it. Same words; themes that don't style .hl show plain text. */
export function accent(text: string): string {
  const town = (data.business.address?.locality ?? '').trim();
  const safe = esc(text);
  if (!town) return safe;
  const rx = new RegExp(`\\b(${esc(town).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`);
  return safe.replace(rx, '<span class="hl">$1</span>');
}
