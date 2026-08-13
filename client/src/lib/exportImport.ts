import TurndownService from 'turndown';
import { gfm } from '@joplin/turndown-plugin-gfm';

/**
 * The shape both export and import agree on. Deliberately narrow: only
 * fields the author actually typed. Never server-controlled data — no _id,
 * slug, author, status, views, likes, commentCount. That's what makes
 * import safe by construction: there's nothing in this file that could
 * overwrite an ID, inflate a counter, or reassign ownership, because none
 * of that was ever in here to begin with. Everything still passes through
 * the server's HTML sanitizer on save, exactly like text typed by hand.
 */
export interface ArticlePackage {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.use(gfm);

/** Triggers a real browser download — no server round-trip. */
function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoking the blob URL synchronously here is a real, well-known race
  // condition: the browser's download manager reads the blob data
  // asynchronously, not in the same tick as click(). Revoking too early
  // can invalidate the URL before that read finishes, which shows up as
  // exactly what you'd expect from a broken link — "Site wasn't available."
  // Deferring the revoke gives the browser time to actually finish reading
  // the file first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'article'
  );
}

export function exportAsJson(article: ArticlePackage) {
  const json = JSON.stringify(article, null, 2);
  downloadFile(`${slugify(article.title)}.json`, json, 'application/json');
}

export function exportAsMarkdown(article: ArticlePackage) {
  // @joplin/turndown-plugin-gfm's strikethrough rule already emits correct
  // double-tilde GFM syntax natively — no post-processing needed.
  const body = turndown.turndown(article.content);

  const frontMatter = [
    '---',
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    article.category ? `category: "${article.category}"` : null,
    article.tags.length ? `tags: [${article.tags.map((t) => `"${t}"`).join(', ')}]` : null,
    article.excerpt ? `excerpt: "${article.excerpt.replace(/"/g, '\\"')}"` : null,
    '---',
    ''
  ]
    .filter(Boolean)
    .join('\n');

  downloadFile(`${slugify(article.title)}.md`, frontMatter + '\n' + body, 'text/markdown');
}

/**
 * Reads a file the user picked and validates its shape before handing it
 * back — a malformed file should fail loudly and specifically, not silently
 * populate the form with `undefined` in three fields.
 */
export function parseImportFile(raw: string): ArticlePackage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('That file does not look like an exported article.');
  }

  const d = data as Record<string, unknown>;
  if (typeof d.title !== 'string' || typeof d.content !== 'string') {
    throw new Error('That file is missing a title or body — is it an exported article?');
  }

  return {
    title: d.title,
    excerpt: typeof d.excerpt === 'string' ? d.excerpt : '',
    content: d.content,
    category: typeof d.category === 'string' ? d.category : '',
    tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string') : [],
    seo: {
      metaTitle: typeof (d.seo as any)?.metaTitle === 'string' ? (d.seo as any).metaTitle : '',
      metaDescription:
        typeof (d.seo as any)?.metaDescription === 'string' ? (d.seo as any).metaDescription : '',
      keywords: Array.isArray((d.seo as any)?.keywords)
        ? (d.seo as any).keywords.filter((k: unknown): k is string => typeof k === 'string')
        : []
    }
  };
}