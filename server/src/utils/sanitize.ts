import sanitizeHtml from 'sanitize-html';

/**
 * Post bodies keep formatting but lose anything executable.
 * This is the main defence against stored XSS.
 */
export function cleanPostHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'h2', 'h3', 'h4', 'p', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 's',
      'code', 'pre', 'a', 'img', 'figure', 'figcaption', 'hr', 'br', 'table',
      'thead', 'tbody', 'tr', 'th', 'td', 'span'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      span: ['class'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // External links can never reach window.opener.
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' })
    }
  });
}

/** Comments are plain text only — no markup survives. */
export function cleanText(dirty: string): string {
  return sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} }).trim();
}

export function stripHtml(html: string): string {
  // Block tags carry an implied space. Without this, "...spreadsheet.</p><h2>Count"
  // collapses to "spreadsheet.Count" in every auto-generated excerpt.
  const spaced = html.replace(/<\/(p|h[1-6]|li|blockquote|div|tr|figcaption|pre)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ');

  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}

export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function makeExcerpt(html: string, limit = 220): string {
  const text = stripHtml(html);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, '')}...`;
}
