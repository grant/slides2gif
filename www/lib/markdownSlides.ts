import {createHash} from 'crypto';

/** Normalize slide source for stable content hash (trim, collapse whitespace). */
export function normalizeSlideSource(raw: string): string {
  return raw
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function contentHash(normalizedSource: string): string {
  return createHash('sha256').update(normalizedSource, 'utf8').digest('hex');
}

/**
 * Convert inline markdown to plain text for Slides (no styling API).
 * Strips **bold**, *italic*, [links](url) → link text, ~~strikethrough~~, `code`.
 */
export function mdToPlainText(md: string): string {
  if (!md.trim()) return '';
  let s = md.trim();
  // Code: `text`
  s = s.replace(/`([^`]+)`/g, '$1');
  // Bold: **text** or __text__
  s = s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
  // Italic: *text* (only after bold so we don't break **)
  s = s.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
  // Strikethrough: ~~text~~
  s = s.replace(/~~(.+?)~~/g, '$1');
  // Links: [text](url) → text
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  return s;
}

/** Block types for structured slide body */
export type Block =
  | {type: 'heading'; level: number; text: string}
  | {type: 'paragraph'; text: string}
  | {type: 'blockquote'; text: string}
  | {type: 'list'; ordered: boolean; items: string[]}
  | {type: 'image'; url: string; alt: string}
  | {type: 'table'; headers: string[]; rows: string[][]};

export interface ParsedSlide {
  /** Raw markdown for this slide (before parsing), normalized for hashing */
  source: string;
  /** Content hash of source for thumbnail cache key */
  contentHash: string;
  /** First # or ## line (without the # markers); empty if none */
  title: string;
  /** Structured body blocks (headings, paragraphs, blockquotes, lists, images, table) */
  blocks: Block[];
  /** Legacy: flattened body text for isTitleSlide and any consumers that expect body */
  body: string;
  /** Whether title has {.big} */
  isBig: boolean;
}

const PLACEHOLDER_TITLE = 'Click to add title';
const PLACEHOLDER_BODY = 'Click to add text';

/**
 * Split markdown by --- into slides and parse each into title + blocks.
 * Supports: H1–H6, paragraphs, blockquotes, ul/ol lists, images ![alt](url), one table per slide.
 * Code blocks (fenced or indented) are skipped. Horizontal rules (---, ***, ___) only split slides.
 */
export function parseMarkdownSlides(markdown: string): ParsedSlide[] {
  const rawSlides = splitSlides(markdown);
  return rawSlides.map((raw): ParsedSlide => {
    const source = normalizeSlideSource(raw);
    const parsed = parseOneSlide(source);
    const body = flattenBlocksToText(parsed.blocks);
    return {
      source,
      contentHash: contentHash(source),
      title: parsed.title,
      blocks: parsed.blocks,
      body,
      isBig: parsed.isBig,
    };
  });
}

function splitSlides(markdown: string): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/\n---\s*\n/);
  return parts.map(p => p.trim()).filter(Boolean);
}

function flattenBlocksToText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'heading') parts.push(b.text);
    else if (b.type === 'paragraph' || b.type === 'blockquote')
      parts.push(b.text);
    else if (b.type === 'list')
      parts.push(b.items.map(i => '• ' + i).join('\n'));
    else if (b.type === 'table')
      parts.push(
        [b.headers.join(' | '), ...b.rows.map(r => r.join(' | '))].join('\n')
      );
    // image: no text
  }
  return parts.join('\n\n').trim();
}

/** Match ATX heading: # to ###### */
const RE_HEADING = /^(#{1,6})\s+(.+)$/;
/** Match table row (contains |) */
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.endsWith('|');
}
/** Match separator row |---| or |:---:|---:| */
const RE_TABLE_SEP = /^\|[\s\-:|]+\|$/;
/** Match image: ![alt](url) or ![alt](url "title") */
const RE_IMAGE_LINE =
  /^!\s*\[([^\]]*)\]\s*\(\s*([^\s)]+)(?:\s+"[^"]*")?\s*\)\s*$/;
/** Match list item: - or * or 1. */
const RE_UNORDERED = /^(\s*)[-*]\s+(.+)$/;
const RE_ORDERED = /^(\s*)(\d+)\.\s+(.+)$/;
/** Fenced code block open/close */
const RE_FENCED = /^```[\w]*\s*$/;

function parseOneSlide(normalized: string): {
  title: string;
  blocks: Block[];
  isBig: boolean;
} {
  let title = '';
  let isBig = false;
  const lines = normalized.split('\n');
  let i = 0;

  // First line: optional # Title {.big} or # / ## title
  if (lines.length > 0) {
    const first = lines[0];
    const bigMatch = first.match(/^#+\s*(.+?)\s*\{\.big\}\s*$/);
    if (bigMatch) {
      title = mdToPlainText(bigMatch[1].trim());
      isBig = true;
      i = 1;
    } else {
      const h1 = first.match(/^#\s+(.+)$/);
      const h2 = first.match(/^##\s+(.+)$/);
      if (h1) {
        title = mdToPlainText(h1[1].trim());
        i = 1;
      } else if (h2) {
        title = mdToPlainText(h2[1].trim());
        i = 1;
      }
    }
  }

  const blocks: Block[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip HTML comments
    if (trimmed.startsWith('<!--')) {
      if (trimmed.endsWith('-->')) {
        i++;
        continue;
      }
      while (i < lines.length && !lines[i].includes('-->')) i++;
      i++;
      continue;
    }
    if (trimmed === '{.column}') {
      i++;
      continue;
    }

    // Blank line: skip (paragraphs will have consumed preceding content)
    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block: skip until closing ```
    if (RE_FENCED.test(trimmed)) {
      i++;
      while (i < lines.length && !RE_FENCED.test(lines[i].trim())) i++;
      if (i < lines.length) i++;
      continue;
    }

    // Indented code block (4 spaces): skip line(s) that look like code
    if (/^    /.test(line)) {
      i++;
      while (
        i < lines.length &&
        (/^    /.test(lines[i]) || lines[i].trim() === '')
      )
        i++;
      continue;
    }

    // ATX heading (H1–H6)
    const headingMatch = trimmed.match(RE_HEADING);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = mdToPlainText(headingMatch[2].trim());
      blocks.push({type: 'heading', level, text});
      i++;
      continue;
    }

    // Blockquote: collect consecutive > lines
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const t = l.trim();
        if (!t.startsWith('>') && t !== '') break;
        if (t.startsWith('>')) {
          const content = t.slice(1).replace(/^\s/, '').trim();
          quoteLines.push(content);
        }
        i++;
      }
      const text = quoteLines
        .map(l => mdToPlainText(l))
        .filter(Boolean)
        .join('\n');
      if (text) blocks.push({type: 'blockquote', text});
      continue;
    }

    // Table: must have |...| and then separator or more rows
    if (isTableRow(trimmed)) {
      const tableRows: string[][] = [];
      const parseRow = (raw: string): string[] =>
        raw
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map(c => mdToPlainText(c.trim()));
      tableRows.push(parseRow(trimmed));
      i++;
      if (i < lines.length && RE_TABLE_SEP.test(lines[i].trim())) {
        i++; // skip separator
      }
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableRows.push(parseRow(lines[i].trim()));
        i++;
      }
      if (tableRows.length >= 1) {
        const headers = tableRows[0];
        const rows = tableRows.slice(1);
        blocks.push({type: 'table', headers, rows});
      }
      continue;
    }

    // Standalone image line: ![alt](url)
    if (RE_IMAGE_LINE.test(trimmed)) {
      const m = trimmed.match(RE_IMAGE_LINE);
      if (m) {
        blocks.push({type: 'image', alt: m[1].trim(), url: m[2].trim()});
        i++;
      } else {
        i++;
      }
      continue;
    }

    // List: unordered or ordered
    const ulMatch = line.match(RE_UNORDERED);
    const olMatch = line.match(RE_ORDERED);
    if (ulMatch || olMatch) {
      const ordered = !!olMatch;
      const items: string[] = [];
      const baseIndent = (ulMatch?.[1] ?? olMatch?.[1] ?? '').length;
      while (i < lines.length) {
        const l = lines[i];
        const u = l.match(RE_UNORDERED);
        const o = l.match(RE_ORDERED);
        if (u) {
          if (ordered && u[1].length <= baseIndent && items.length > 0) break;
          items.push(mdToPlainText(u[2].trim()));
          i++;
        } else if (o) {
          if (!ordered && o[1].length <= baseIndent && items.length > 0) break;
          items.push(mdToPlainText(o[3].trim()));
          i++;
        } else if (l.trim() === '') {
          i++;
        } else if (l.startsWith(' ') && l.trim() !== '' && items.length > 0) {
          const cont = l.replace(/^\s+/, ' ').trim();
          items[items.length - 1] += ' ' + mdToPlainText(cont);
          i++;
        } else {
          break;
        }
      }
      if (items.length > 0) blocks.push({type: 'list', ordered, items});
      continue;
    }

    // Paragraph: collect until blank, heading, blockquote, table, list, or image
    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      const t = l.trim();
      if (t === '') break;
      if (
        RE_HEADING.test(t) ||
        t.startsWith('>') ||
        isTableRow(t) ||
        RE_IMAGE_LINE.test(t)
      )
        break;
      if (RE_UNORDERED.test(l) || RE_ORDERED.test(l)) break;
      if (RE_FENCED.test(t)) break;
      paraLines.push(t);
      i++;
    }
    const paraText = paraLines
      .map(l => mdToPlainText(l))
      .join(' ')
      .trim();
    if (paraText) blocks.push({type: 'paragraph', text: paraText});
  }

  return {title, blocks, isBig};
}

/** Placeholder text used in default Slides layouts (English). */
export function getDefaultPlaceholders(): {title: string; subtitle: string} {
  return {title: PLACEHOLDER_TITLE, subtitle: PLACEHOLDER_BODY};
}
