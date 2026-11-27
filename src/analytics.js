/**
 * Cookieless analytics. Nothing loads and no request is made until an endpoint
 * is set. Create a free GoatCounter account, add this site, then set the
 * VITE_GOATCOUNTER_ENDPOINT build variable to its count endpoint (for example
 * "https://thijn.goatcounter.com/count"). The deploy workflow reads the
 * GOATCOUNTER_ENDPOINT repository variable. No cookies, no banner.
 */
const GOATCOUNTER_ENDPOINT = import.meta.env.VITE_GOATCOUNTER_ENDPOINT ?? "";

let ready = false;

export function initAnalytics() {
  if (!GOATCOUNTER_ENDPOINT) return;

  window.goatcounter = window.goatcounter || {};

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.dataset.goatcounter = GOATCOUNTER_ENDPOINT;
  script.addEventListener("load", () => {
    ready = true;
  }, { once: true });
  document.head.append(script);

  document.addEventListener("click", (event) => {
    const target = event.target.closest?.("[data-track]");
    if (target) track(target.dataset.track);
  });
}

/** Record a named interaction (project open, case study, phase change). */
export function track(name) {
  if (!GOATCOUNTER_ENDPOINT || !ready || !window.goatcounter?.count) return;
  window.goatcounter.count({ path: name, title: name, event: true });
}
