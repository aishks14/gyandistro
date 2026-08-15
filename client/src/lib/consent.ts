/**
 * Cookie consent state.
 *
 * GyanDistro currently sets exactly one cookie — the httpOnly refresh token
 * used to keep you signed in. That one is "strictly necessary" under GDPR's
 * ePrivacy rules and doesn't need consent, only disclosure (see the Privacy
 * Policy). This module exists for what comes next: the moment an ad network
 * or analytics tool is added, its script needs to check consent *before*
 * loading — that's the actual legal requirement, not just showing a banner.
 *
 * Deliberately using localStorage, not a cookie, to remember the choice
 * itself — the record of "did they consent" shouldn't itself be one of the
 * things requiring consent.
 */

export type ConsentChoice = 'accepted' | 'rejected';

const STORAGE_KEY = 'gyandistro-cookie-consent';
const CHANGE_EVENT = 'gyandistro-consent-change';

/** null means "never asked" — the banner should still be showing. */
export function getConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'accepted' || value === 'rejected' ? value : null;
}

export function setConsent(choice: ConsentChoice): void {
  window.localStorage.setItem(STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CHANGE_EVENT, { detail: choice }));
}

/**
 * What a future ad-script loader should check before injecting anything.
 * e.g.: `if (hasNonEssentialConsent()) { loadAdSenseScript(); }`
 */
export function hasNonEssentialConsent(): boolean {
  return getConsent() === 'accepted';
}

/** Lets any component react live when the choice changes, without prop drilling. */
export function onConsentChange(handler: (choice: ConsentChoice) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}