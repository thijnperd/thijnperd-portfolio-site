// A page can be read in Dutch while the index it sits on is English. In that state every
// link that has a translated destination should lead there directly, and a card should
// carry the title of the page it opens, instead of sending the reader to English and
// asking them to pick the language a second time.

import { TRANSLATED_PAGES } from './translatedPages.js';
import { getLanguage } from './i18n.js';

const originals = new WeakMap();

export function initLocalizedLinks() {
  const apply = () => {
    const lang = getLanguage();
    const pages = lang === 'en' ? null : TRANSLATED_PAGES[lang] || null;

    for (const link of document.querySelectorAll('a[href]')) {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:')) continue;

      let url;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        continue;
      }
      if (url.origin !== window.location.origin) continue;
      // Already localised (a translated page's own body) or the switch itself.
      if (/^\/(nl|de)\//.test(url.pathname) || link.closest('.lang-switch')) continue;

      if (!originals.has(link)) originals.set(link, raw);
      const english = originals.get(link);
      const englishPath = new URL(english, window.location.href).pathname;
      if (!pages || !(englishPath in pages)) {
        link.setAttribute('href', english);
        continue;
      }
      link.setAttribute('href', lang === 'en' ? englishPath : `/${lang}${englishPath}`);
    }

    for (const el of document.querySelectorAll('[data-doc-title]')) {
      if (!('titleEn' in el.dataset)) el.dataset.titleEn = el.textContent;
      el.textContent = pages?.[el.dataset.docTitle]?.title ?? el.dataset.titleEn;
    }
  };

  apply();
  window.addEventListener('thijnperd:langchange', apply);
}
