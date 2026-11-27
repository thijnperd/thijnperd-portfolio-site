import { TRANSLATIONS } from './translations.js';

export const SUPPORTED_LANGS = ['en', 'nl', 'de'];
const STORAGE_KEY = 'thijnperd-lang';

function normalizeLang(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGS.includes(base) ? base : null;
}

function readInitialLanguage() {
  try {
    const queryLang = normalizeLang(new URLSearchParams(window.location.search).get('lang'));
    if (queryLang) return queryLang;
  } catch {
    /* ignore invalid search strings */
  }

  try {
    const stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    /* ignore blocked storage */
  }

  const prefs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const entry of prefs) {
    const matched = normalizeLang(entry);
    if (matched) return matched;
  }

  return 'en';
}

let currentLang = readInitialLanguage();
let initialized = false;
let i18nAbort = null;

export function getLanguage() {
  return currentLang;
}

export function t(key, lang = currentLang) {
  const parts = String(key).split('.');
  let node = TRANSLATIONS[lang] || TRANSLATIONS.en;
  for (const part of parts) {
    node = node?.[part];
  }
  if (node !== undefined) return node;

  let fallback = TRANSLATIONS.en;
  for (const part of parts) {
    fallback = fallback?.[part];
  }
  return fallback !== undefined ? fallback : key;
}

function applyTranslations() {
  const doc = document;
  doc.documentElement.lang = currentLang;

  for (const btn of doc.querySelectorAll('[data-lang-pick]')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.langPick === currentLang));
  }

  for (const el of doc.querySelectorAll('[data-i18n]')) {
    const value = t(el.dataset.i18n, currentLang);
    if (typeof value === 'string') el.textContent = value;
  }

  for (const el of doc.querySelectorAll('[data-i18n-html]')) {
    const value = t(el.dataset.i18nHtml, currentLang);
    if (typeof value === 'string') el.innerHTML = value;
  }

  for (const el of doc.querySelectorAll('[data-i18n-attr]')) {
    const pairs = el.dataset.i18nAttr.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf(':');
      if (idx === -1) continue;
      const attr = pair.slice(0, idx).trim();
      const key = pair.slice(idx + 1).trim();
      const value = t(key, currentLang);
      if (attr && typeof value === 'string') el.setAttribute(attr, value);
    }
  }

  const pageScope = doc.body?.dataset.i18nPage;
  if (pageScope) {
    const nextTitle = t(`${pageScope}.pageTitle`, currentLang);
    if (typeof nextTitle === 'string' && nextTitle !== `${pageScope}.pageTitle`) {
      doc.title = nextTitle;
    }
    const nextDesc = t(`${pageScope}.pageDescription`, currentLang);
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc && typeof nextDesc === 'string' && nextDesc !== `${pageScope}.pageDescription`) {
      metaDesc.setAttribute('content', nextDesc);
    }
  }

  for (const note of doc.querySelectorAll('[data-en-only-note]')) {
    note.hidden = currentLang === 'en';
  }
}

export function setLanguage(next, { persist = true } = {}) {
  const normalized = normalizeLang(next) || 'en';
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      /* ignore blocked storage */
    }
  }
  const changed = normalized !== currentLang;
  currentLang = normalized;
  applyTranslations();
  if (changed) {
    window.dispatchEvent(new CustomEvent('thijnperd:langchange', { detail: { lang: currentLang } }));
  }
}

export function initI18n() {
  if (initialized) return currentLang;
  initialized = true;
  i18nAbort = new AbortController();
  const { signal } = i18nAbort;

  applyTranslations();

  document.addEventListener('click', (event) => {
    const btn = event.target.closest?.('[data-lang-pick]');
    if (!btn) return;
    setLanguage(btn.dataset.langPick, { persist: true });
  }, { signal });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    const synced = normalizeLang(event.newValue);
    if (synced && synced !== currentLang) setLanguage(synced, { persist: false });
  }, { signal });

  window.addEventListener('pagehide', () => {
    i18nAbort?.abort();
    initialized = false;
  }, { signal, once: true });

  return currentLang;
}
