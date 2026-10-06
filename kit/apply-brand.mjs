// Applies brand.config.json to the whole site: business details, colors and fonts.
// Netlify runs this automatically on every deploy (see netlify.toml).
// To preview on your own computer: node kit/apply-brand.mjs   (it only runs once per copy of the files)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MARK = path.join(ROOT, ".brand-applied");
if (fs.existsSync(MARK)) { console.log("Brand already applied to these files. Skipping."); process.exit(0); }
const C = JSON.parse(fs.readFileSync(path.join(ROOT, "brand.config.json"), "utf8"));

// ---------- values ----------
const safe = (v) => String(v == null ? "" : v).replace(/'/g, "’").replace(/"/g, "”").replace(/[<>]/g, "");
const digits = String(C.phone || "").replace(/\D/g, "");
const V = {
  BUSINESS_NAME: C.businessName, SHORT_NAME: C.shortName, SHORT_NAME_UPPER: String(C.shortName || "").toUpperCase(),
  SOFTWARE_BRAND: C.softwareBrandName || `${C.shortName} Tax Software`, OWNER_NAME: C.ownerName,
  OWNER_FIRST: String(C.ownerName || "").split(" ")[0], EMAIL: C.email, PHONE: C.phone, PHONE_DIGITS: digits,
  DOMAIN: C.domain, CITY: C.city, CITY_STATE: `${C.city}, ${C.state}`, ADDRESS: C.address,
  INTAKE_URL: C.links?.clientIntake, BOOKING_URL: C.links?.booking, REVIEW_URL_NOPROTO: String(C.links?.googleReview || "").replace(/^https?:\/\//, ""),
  AIRTABLE_BASE_ID: C.airtableBaseId,
};
for (const [k, v] of Object.entries(C.stripeLinks || {})) V["STRIPE_" + k] = v;
for (const k of Object.keys(V)) V[k] = safe(V[k] || "#");

// ---------- colors ----------
const hex2rgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgb2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
const hsl2rgb = ([h, s, l]) => { const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)); };
const toHex = (rgb) => "#" + rgb.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
const OLD = { primary: rgb2hsl(hex2rgb("#0f4d2d")), accent: rgb2hsl(hex2rgb("#c9a13b")) };
const NEW = { primary: rgb2hsl(hex2rgb(C.colors?.primary || "#0f4d2d")), accent: rgb2hsl(hex2rgb(C.colors?.accent || "#c9a13b")) };
function recolor(rgb) {
  const [h, s, l] = rgb2hsl(rgb);
  const fam = h >= 85 && h <= 175 && s > 0.12 ? "primary" : h >= 28 && h <= 62 && s > 0.25 ? "accent" : null;
  if (!fam) return null;
  const o = OLD[fam], n = NEW[fam];
  const s2 = Math.min(1, s * (o[1] ? n[1] / o[1] : 1));
  const l2 = Math.max(0, Math.min(1, l + (n[2] - o[2]) * (1 - Math.abs(2 * l - 1))));
  return hsl2rgb([n[0], s2, l2]);
}
const recolorText = (s) => s
  .replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m) => { const r = recolor(hex2rgb(m)); return r ? toHex(r) : m; })
  .replace(/(rgba?\()\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, (m, pre, a, b, c) => { const r = recolor([+a, +b, +c]); return r ? pre + r.join(",") : m; });

// ---------- fonts ----------
const HF = C.fonts?.heading || "Fraunces", BF = C.fonts?.body || "Inter";
const fontsUrl = `https://fonts.googleapis.com/css2?family=${HF.replace(/ /g, "+")}:wght@600;700&family=${BF.replace(/ /g, "+")}:wght@400;500;600;700;800&display=swap`;
const refont = (s) => s.replace(/https:\/\/fonts\.googleapis\.com\/css2\?family=[^"')\s]+/g, fontsUrl).replace(/\bFraunces\b/g, HF).replace(/\bInter\b/g, BF);

// ---------- layout ----------
// Copies the website layout you picked ("modern", "bold" or "classic") into place.
const LAYOUT = ["modern", "bold", "classic"].includes(C.layout) ? C.layout : "modern";
const LDIR = path.join(ROOT, "layouts", LAYOUT);
// ---------- features: which parts of the kit this business uses ----------
const FEAT = Object.assign({ website: true, preparers: true, eros: true, software: true, academy: true, referrals: true }, C.features || {});
for (const k of Object.keys(FEAT)) FEAT[k] = Boolean(FEAT[k]);
const on = (list) => list.split(/\s+/).filter(Boolean).some((k) => FEAT[k]);

for (const f of fs.readdirSync(LDIR)) {
  if (f === "index-lite.html") continue;
  fs.copyFileSync(path.join(LDIR, f), f === "site.css" ? path.join(ROOT, "css", "site.css") : path.join(ROOT, f));
}
// No client website? Use the simple welcome page as the home page.
if (!FEAT.website) fs.copyFileSync(path.join(LDIR, "index-lite.html"), path.join(ROOT, "index.html"));

// Pages that belong to parts you didn't pick are removed.
const PAGES = {
  "website": ["taxes.html", "contact.html"],
  "software": ["software.html", "ero-start.html", "ero-signed-taxslayer.html", "ero-signed-olt.html", "agreement-taxslayer.html", "agreement-olt.html"],
  "preparers eros software": ["join.html"],
  "preparers": ["agreement-new.html", "agreement-returning.html", "agreement-signed.html", "agreement-signed-new.html"],
  "eros": ["team.html", "team-agreement.html", "team-signed.html"],
  "eros software": ["support.html"],
  "academy": ["academy.html", "academy-pay.html", "team-training.html"],
  "referrals": ["refer.html", "r.html"],
};
for (const [need, files] of Object.entries(PAGES)) if (!on(need)) for (const f of files) { try { fs.unlinkSync(path.join(ROOT, f)); } catch {} }

// ---------- brand.css (color and font variables used by the website) ----------
const shade = (hex, dl, ds = 1) => { const [h, s, l] = rgb2hsl(hex2rgb(hex)); return toHex(hsl2rgb([h, Math.min(1, s * ds), Math.max(0, Math.min(1, l + dl))])); };
const rgba = (hex, a) => `rgba(${hex2rgb(hex).join(",")},${a})`;
const P = C.colors?.primary || "#1e3a8a", A = C.colors?.accent || "#f59e0b";
const lum = (hex) => { const [r, g, b] = hex2rgb(hex).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const BRAND_CSS = `/* Made from brand.config.json on every deploy. Edit brand.config.json, not this file. */
:root{
  --p:${P};--p-d:${shade(P, -0.1)};--p-50:${shade(P, 0.95 - rgb2hsl(hex2rgb(P))[2], 0.6)};--p-ring:${rgba(P, 0.18)};
  --a:${A};--a-d:${shade(A, -0.12)};--a-ink:${lum(A) > 0.35 ? shade(A, -0.42) : "#ffffff"};--a-glow:${rgba(A, 0.35)};
  --ink:#16201b;--muted:#5f6b66;--line:#e3e6e4;--bg:#ffffff;--bg-soft:#f7f8fa;--bg-cream:#faf8f3;
  --hf:'${HF}',Georgia,serif;--bf:'${BF}',system-ui,sans-serif;
}
`;

// ---------- walk files ----------
const SKIP = new Set(["node_modules", ".git", "kit", ".netlify", "layouts"]);
const NO_RECOLOR = new Set([path.join(ROOT, "css", "site.css"), path.join(ROOT, "css", "brand.css")]);
let n = 0;
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (SKIP.has(f)) continue;
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|js|mjs|css|xml|txt)$/.test(f) || /jspdf|qrcode/.test(f)) continue;
    let s = fs.readFileSync(p, "utf8"); const o = s;
    s = s.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in V ? V[k] : m));
    if (!p.includes(`${path.sep}netlify${path.sep}`)) s = NO_RECOLOR.has(p) ? refont(s) : refont(recolorText(s));
    if (s !== o) { fs.writeFileSync(p, s); n++; }
  }
})(ROOT);
fs.writeFileSync(path.join(ROOT, "css", "brand.css"), BRAND_CSS);

// features.css hides anything marked for a part you didn't pick; site.js and portal.js remove it.
const tags = new Set();
(function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (SKIP.has(f)) continue;
    if (fs.statSync(p).isDirectory()) { scan(p); continue; }
    if (!/\.(html|js)$/.test(f)) continue;
    for (const m of fs.readFileSync(p, "utf8").matchAll(/data-f="([^"]*)"/g)) tags.add(m[1]);
  }
})(ROOT);
const hide = [...tags].filter((t) => /^[a-z ]+$/.test(t) && t.trim() && !on(t));
fs.writeFileSync(path.join(ROOT, "css", "features.css"), "/* Made from brand.config.json. */\n" + hide.map((t) => `[data-f="${t}"]{display:none!important}`).join("\n") + "\n");
const FEAT_JS = `window.FEATURES = ${JSON.stringify(FEAT)};\n`;
fs.appendFileSync(path.join(ROOT, "js", "settings.js"), "\n" + FEAT_JS);
const pj = path.join(ROOT, "portal", "portal.js");
fs.writeFileSync(pj, FEAT_JS + fs.readFileSync(pj, "utf8"));

// sitemap lists only the pages you kept
const keep = ["", "taxes.html", "software.html", "join.html", "academy.html", "contact.html", "refer.html", "privacy.html"].filter((f) => !f || fs.existsSync(path.join(ROOT, f)));
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + keep.map((f) => `  <url><loc>https://${V.DOMAIN}/${f}</loc></url>`).join("\n") + `\n</urlset>\n`);
fs.writeFileSync(MARK, new Date().toISOString());
console.log(`Brand applied to ${n} files for ${C.businessName} using the ${LAYOUT} layout. Parts: ${Object.keys(FEAT).filter((k) => FEAT[k]).join(", ")}.`);
