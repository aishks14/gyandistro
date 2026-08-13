import puppeteer, { type Browser } from 'puppeteer';
import { env } from '../config/env';

/**
 * One shared browser instance, reused across every PDF request — launching
 * a fresh browser per request would cost a full second or two on top of the
 * render itself. Individual requests get their own page (tab) inside this
 * one browser, closed after use; the browser itself stays warm.
 */
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

/**
 * Renders the real, live article page as a PDF — not a hand-built template.
 * `emulateMediaType('print')` makes the browser apply the site's existing
 * @media print rules, so the header, footer, ads and comments are already
 * stripped out by CSS that was written for exactly this purpose.
 *
 * Navigates to CLIENT_ORIGIN, not the API's own port — /article/:slug is a
 * React Router route, served by the frontend, not by this Express server.
 * Reusing CLIENT_ORIGIN (already configured for CORS) means this points at
 * the right place automatically in both development and production.
 */
export async function renderArticleToPdf(slug: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const clientOrigin = env.clientOrigin[0];
    const url = `${clientOrigin}/article/${slug}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' }
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

/** Called once on server shutdown so the browser process doesn't linger. */
export async function closePdfBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}