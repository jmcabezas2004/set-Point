/* Extracción local y gratuita del ADN de marca (sin IA de pago).
   Lee la web (HTML + CSS), analiza los colores de capturas y logo,
   lee el texto de las capturas con OCR (Tesseract, en el navegador)
   y rellena la ficha con reglas. */

const UA_TIMEOUT = 15000;

/* ================= Descarga de páginas ================= */

let localApi = null; // ¿hay servidor local (node adn/server.js)?
let lastRoute = null;

async function hasLocalApi() {
  if (localApi !== null) return localApi;
  try {
    const r = await fetch("/api/ping", { cache: "no-store" });
    localApi = r.ok && (await r.json()).ok === true;
  } catch { localApi = false; }
  return localApi;
}

function withTimeout(ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
}

async function routes() {
  const list = [];
  if (await hasLocalApi()) list.push({ id: "local", build: (u) => `/api/fetch?url=${encodeURIComponent(u)}` });
  list.push({ id: "direct", build: (u) => u });
  list.push({ id: "allorigins", build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` });
  list.push({ id: "corsproxy", build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}` });
  if (lastRoute) list.sort((a, b) => (a.id === lastRoute ? -1 : b.id === lastRoute ? 1 : 0));
  return list;
}

export async function fetchResource(url, as = "text") {
  let lastErr;
  for (const r of await routes()) {
    const t = withTimeout(UA_TIMEOUT);
    try {
      const res = await fetch(r.build(url), { signal: t.signal });
      if (!res.ok) {
        if (r.id === "local" && res.status >= 400 && res.status < 500) throw Object.assign(new Error(`HTTP ${res.status}`), { final: true });
        throw new Error(`HTTP ${res.status}`);
      }
      const out = as === "blob" ? await res.blob() : await res.text();
      if (as === "text" && !out) throw new Error("vacío");
      lastRoute = r.id;
      return out;
    } catch (e) { lastErr = e; if (e.final) break; } finally { t.done(); }
  }
  throw lastErr || new Error("No se pudo descargar");
}

/* ================= Utilidades de texto ================= */

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
const endDot = (s) => { s = clean(s).replace(/[\s.,;:]+$/, ""); return /[!?…]$/.test(s) ? s : s + "."; };
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const uniqBy = (arr, key) => { const s = new Set(); return arr.filter((x) => { const k = key(x); if (!k || s.has(k)) return false; s.add(k); return true; }); };
const abs = (href, base) => { try { return new URL(href, base).href; } catch { return ""; } };

function textOf(el) { return clean(el?.textContent); }

function pageText(doc) {
  const body = doc.body?.cloneNode(true);
  if (!body) return "";
  body.querySelectorAll("script,style,noscript,svg,iframe,template").forEach((n) => n.remove());
  // Separar bloques para que no se peguen palabras
  body.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6,section,article,br,a,span,td").forEach((n) => n.append(" "));
  return clean(body.textContent);
}

/* ================= Colores ================= */

export function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  h = h.slice(0, 6);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hueDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function makeColor(rgb, score, source) {
  const hsl = rgbToHsl(rgb);
  return { rgb, hex: toHex(rgb), score, source, ...hsl };
}

function mergeColors(list, threshold = 22) {
  const out = [];
  for (const c of list.sort((a, b) => b.score - a.score)) {
    const m = out.find((o) => dist(o.rgb, c.rgb) < threshold);
    if (m) m.score += c.score; else out.push({ ...c });
  }
  return out.sort((a, b) => b.score - a.score);
}

function parseColorValues(value) {
  const found = [];
  for (const m of value.matchAll(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi)) {
    const h = m[1];
    if ((h.length === 8 && parseInt(h.slice(6), 16) < 128) || (h.length === 4 && parseInt(h[3] + h[3], 16) < 128)) continue;
    found.push(hexToRgb(h));
  }
  for (const m of value.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+%?))?\s*\)/gi)) {
    let a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (m[4]?.endsWith("%")) a /= 100;
    if (a < 0.5) continue;
    found.push([+m[1], +m[2], +m[3]]);
  }
  return found;
}

function cssColors(css, html) {
  const list = [];
  for (const m of css.matchAll(/([-\w]+)\s*:\s*([^;{}]+)/g)) {
    const prop = m[1].toLowerCase();
    if (prop.startsWith("--wp--preset") || prop.includes("shadow") || prop.startsWith("--bs-") && !/primary|secondary/.test(prop)) continue;
    let w = 1;
    if (/^--e-global-color-primary/.test(prop)) w = 40;
    else if (/^--e-global-color-(secondary|accent)/.test(prop)) w = 25;
    else if (/^--e-global-color-text/.test(prop)) w = 6;
    else if (/^--e-global-color-/.test(prop)) w = 8;
    else if (prop.startsWith("--") && /primar|brand|marca|accent|acento|principal|main|secondar|theme|corporat/.test(prop)) w = 18;
    else if (prop.startsWith("--")) w = 2;
    else if (/^background/.test(prop)) w = 1.5;
    else if (prop === "fill" || prop === "stroke") w = 2;
    for (const rgb of parseColorValues(m[2])) list.push(makeColor(rgb, w, "css"));
  }
  const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']theme-color/i);
  if (theme) parseColorValues(theme[1]).forEach((rgb) => list.push(makeColor(rgb, 30, "meta")));
  return mergeColors(list);
}

/* Paleta dominante de una imagen (dataURL, blob o ImageBitmap) */
export async function imagePalette(src, maxSide = 96) {
  let bmp;
  if (src instanceof Blob) bmp = await createImageBitmap(src);
  else bmp = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
  const sc = Math.min(1, maxSide / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * sc)), h = Math.max(1, Math.round(h0 * sc));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // transparente
    const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const b = buckets.get(k) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2]; b.n++;
    buckets.set(k, b); total++;
  }
  const list = [...buckets.values()].map((b) => makeColor([b.r / b.n, b.g / b.n, b.b / b.n], b.n / total, "img"));
  return mergeColors(list, 28).slice(0, 10);
}

function svgColors(svgText) {
  return mergeColors(parseColorValues(svgText.replace(/<style[\s\S]*?<\/style>/gi, (s) => s)).map((rgb) => makeColor(rgb, 1, "logo")));
}

const isChromatic = (c) => c.s > 0.22 && c.l > 0.12 && c.l < 0.9;
const isDark = (c) => c.l < 0.3;
const isWhiteish = (c) => c.l > 0.93;

function pickRoles(colors) {
  const pool = colors.filter((c) => c.score > 0);
  const principal = pool.find(isChromatic) || pool.find((c) => !isWhiteish(c)) || null;
  const rest = pool.filter((c) => c !== principal);
  const secundario =
    rest.find((c) => isDark(c) && (!principal || dist(c.rgb, principal.rgb) > 40)) ||
    rest.find((c) => isChromatic(c) && principal && hueDiff(c.h, principal.h) > 30) ||
    rest.find((c) => !isWhiteish(c)) || null;
  const rest2 = rest.filter((c) => c !== secundario);
  let acento =
    rest2.find((c) => isChromatic(c) && (!principal || hueDiff(c.h, principal.h) > 30) && (!secundario || dist(c.rgb, secundario.rgb) > 60) && c.score >= (principal?.score || 0) * 0.08) || null;
  if (!acento) acento = secundario && isDark(secundario) ? makeColor([255, 255, 255], 0, "auto") : makeColor([20, 23, 29], 0, "auto");
  return { principal, secundario, acento };
}

export function colorName(c) {
  const { h, s, l } = c;
  if (l > 0.94) return "Blanco";
  if (l < 0.09) return "Negro";
  if (s < 0.12 || (s < 0.2 && l > 0.3 && l < 0.85)) {
    if (l < 0.3) return h >= 190 && h <= 270 && s > 0.06 ? "Azul Marino" : "Antracita";
    return l > 0.75 ? "Gris Perla" : "Gris";
  }
  if (h < 12 || h >= 345) return l < 0.3 ? "Granate" : l > 0.75 ? "Rosa" : "Rojo";
  if (h < 35) return l < 0.35 ? "Marrón" : l > 0.75 ? "Melocotón" : s < 0.5 ? "Terracota" : "Naranja";
  if (h < 50) return l < 0.45 ? "Ámbar" : l > 0.78 ? "Arena" : s < 0.55 ? "Dorado" : "Ámbar";
  if (h < 65) return l < 0.4 ? "Oliva" : "Amarillo";
  if (h < 160) return l < 0.28 ? "Verde Bosque" : l > 0.72 ? "Verde Menta" : h < 90 ? "Verde Lima" : "Verde";
  if (h < 195) return l < 0.3 ? "Petróleo" : "Turquesa";
  if (h < 225) return l < 0.3 ? "Azul Marino" : l > 0.75 ? "Azul Cielo" : "Azul";
  if (h < 260) return l < 0.3 ? "Azul Marino" : l > 0.75 ? "Lavanda" : "Azul Índigo";
  if (h < 290) return l < 0.3 ? "Berenjena" : l > 0.75 ? "Lila" : "Violeta";
  return l > 0.75 ? "Rosa" : l < 0.3 ? "Burdeos" : "Fucsia";
}

/* ================= Tipografías ================= */

const GENERIC_FONTS = /^(inherit|initial|unset|sans-serif|serif|monospace|cursive|fantasy|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto mono|helvetica neue|helvetica|arial|ui-sans-serif|ui-serif|ui-monospace|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|var\(.*)$/i;
const ICON_FONTS = /awesome|eicons|dashicons|icomoon|elementor|icons?$|glyph|material symbols|material icons|fontello|star|slick|swiper|wc|woocommerce|revicons|ionicons|themify|lineicons|feather|bootstrap-icons|socicon|simple-line|etmodules|genericons/i;

const FONT_INFO = {
  "montserrat": "sans-serif geométrica y moderna", "raleway": "sans-serif moderna y elegante", "poppins": "sans-serif geométrica y amable",
  "open sans": "sans-serif humanista y muy legible", "roboto": "sans-serif neo-grotesca y neutra", "lato": "sans-serif humanista y cálida",
  "inter": "sans-serif neo-grotesca y funcional", "nunito": "sans-serif redondeada y cercana", "nunito sans": "sans-serif limpia y cercana",
  "oswald": "sans-serif condensada y con fuerza", "bebas neue": "display condensada en mayúsculas, con mucha fuerza", "playfair display": "serif de alto contraste, elegante",
  "merriweather": "serif robusta y legible", "lora": "serif contemporánea y cálida", "work sans": "sans-serif grotesca y versátil",
  "source sans pro": "sans-serif humanista y clara", "source sans 3": "sans-serif humanista y clara", "dm sans": "sans-serif geométrica y limpia",
  "rubik": "sans-serif de esquinas suaves", "quicksand": "sans-serif redondeada y amable", "josefin sans": "sans-serif geométrica de aire vintage",
  "cormorant garamond": "serif clásica y refinada", "eb garamond": "serif clásica y editorial", "libre baskerville": "serif clásica y sobria",
  "barlow": "sans-serif industrial y legible", "manrope": "sans-serif moderna y técnica", "mulish": "sans-serif minimalista",
  "archivo": "sans-serif grotesca con carácter", "pt sans": "sans-serif humanista", "noto sans": "sans-serif neutra y legible",
  "ubuntu": "sans-serif humanista con personalidad", "outfit": "sans-serif geométrica y actual", "plus jakarta sans": "sans-serif moderna y elegante",
  "roboto slab": "slab serif robusta", "abril fatface": "display serif de alto contraste", "dancing script": "manuscrita informal",
  "great vibes": "caligráfica elegante", "pacifico": "manuscrita desenfadada", "kanit": "sans-serif con fuerza", "anton": "display condensada muy pesada",
  "fira sans": "sans-serif humanista y técnica", "jost": "sans-serif geométrica tipo Futura", "urbanist": "sans-serif geométrica y moderna",
};

function fontDesc(family, fallback = "") {
  const k = family.toLowerCase();
  if (FONT_INFO[k]) return FONT_INFO[k];
  if (/serif/.test(fallback) && !/sans/.test(fallback)) return "serif";
  if (/script|hand/.test(k)) return "manuscrita";
  return "sans-serif moderna";
}

function firstFamily(value) {
  for (let f of value.split(",")) {
    f = f.replace(/!important/i, "").replace(/["']/g, "").trim();
    if (!f || GENERIC_FONTS.test(f) || ICON_FONTS.test(f)) continue;
    return f;
  }
  return null;
}

function collectFonts(html, css) {
  const all = new Map(); // family -> {heading, body, total, fallback, bold}
  const bump = (fam, kind, w, extra = {}) => {
    if (!fam) return;
    const key = fam.replace(/\+/g, " ").trim();
    if (!key || ICON_FONTS.test(key) || GENERIC_FONTS.test(key)) return;
    const e = all.get(key) || { family: key, heading: 0, body: 0, total: 0, fallback: "", bold: 0 };
    e[kind] = (e[kind] || 0) + w; e.total += w;
    if (extra.fallback) e.fallback = extra.fallback;
    if (extra.bold) e.bold += extra.bold;
    all.set(key, e);
  };
  // Google Fonts
  const gf = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'\s)>]+/gi), ...css.matchAll(/fonts\.googleapis\.com\/css2?\?[^"'\s)]+/gi)].map((m) => m[0].replace(/&amp;/g, "&"));
  for (const u of gf) {
    const q = u.split("?")[1] || "";
    for (const part of q.split("&")) {
      if (!part.startsWith("family=")) continue;
      decodeURIComponent(part.slice(7)).split("|").forEach((f) => bump(f.split(":")[0], "total", 6));
    }
  }
  // Elementor / variables de tema
  for (const m of css.matchAll(/--e-global-typography-([\w-]+?)-font-family\s*:\s*([^;}]+)/gi)) {
    bump(firstFamily(m[2]), /primary|secondary/.test(m[1]) ? "heading" : "body", 20);
  }
  for (const m of css.matchAll(/--[\w-]*(heading|title|display|body|base|text|primary)[\w-]*font[\w-]*\s*:\s*([^;}]+)/gi)) {
    bump(firstFamily(m[2]), /body|base|text/.test(m[1]) ? "body" : "heading", 10);
  }
  // Reglas
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().toLowerCase();
    if (sel.startsWith("@font-face")) continue;
    const ff = m[2].match(/font-family\s*:\s*([^;]+)/i);
    if (!ff) continue;
    const fam = firstFamily(ff[1]);
    const fallback = (ff[1].match(/\b(sans-serif|serif|monospace|cursive)\b/i) || [""])[0].toLowerCase();
    const fw = (m[2].match(/font-weight\s*:\s*(\w+)/i) || [])[1];
    const bold = fw && (/bold|black|heavy/.test(fw) || +fw >= 600) ? 1 : 0;
    if (/(^|[\s,>])h[1-3]\b|heading|title|titulo|display|hero/.test(sel)) bump(fam, "heading", 3, { fallback, bold });
    else if (/(^|[\s,])(body|html|p)\b|text|content/.test(sel)) bump(fam, "body", 3, { fallback });
    else bump(fam, "total", 1, { fallback });
  }
  // @font-face (fuentes propias)
  for (const m of css.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*([^;]+)/gi)) bump(firstFamily(m[1]), "total", 2);

  const list = [...all.values()];
  if (!list.length) return null;
  const byHeading = [...list].sort((a, b) => b.heading - a.heading || b.total - a.total);
  const byBody = [...list].sort((a, b) => b.body - a.body || b.total - a.total);
  const heading = byHeading[0].heading ? byHeading[0] : byBody[0];
  const body = byBody[0].body ? byBody[0] : heading;
  return { heading, body };
}

/* ================= Sector ================= */

const SECTORS = [
  { key: "INMOBILIARIA", art: "esta inmobiliaria", kw: ["inmobiliaria", "vivienda", "inmueble", "pisos", "compraventa", "alquiler", "propietario", "hipoteca", "chalet"], services: "SERVICIOS AL PROPIETARIO", person: "Agente principal" },
  { key: "RESTAURANTE", art: "este restaurante", kw: ["restaurante", "carta", "menú", "reservar mesa", "cocina", "tapas", "gastronom", "bar ", "vinos"], services: "CARTA Y SERVICIOS", person: "Chef / Responsable" },
  { key: "CLÍNICA", art: "esta clínica", kw: ["clínica", "paciente", "dental", "fisioterapia", "odontolog", "médic", "cita previa", "salud"], services: "TRATAMIENTOS Y SERVICIOS", person: "Director/a" },
  { key: "ESTÉTICA", art: "este centro", kw: ["peluquería", "estética", "belleza", "uñas", "manicura", "spa", "facial", "barbería"], services: "SERVICIOS", person: "Responsable" },
  { key: "DESPACHO", art: "este despacho", kw: ["abogad", "asesoría", "gestoría", "fiscal", "jurídic", "contable", "laboral"], services: "SERVICIOS", person: "Socio/a principal" },
  { key: "GIMNASIO", art: "este centro", kw: ["gimnasio", "entrenamiento", "fitness", "crossfit", "entrenador", "pilates", "yoga"], services: "SERVICIOS Y CLASES", person: "Entrenador/a principal" },
  { key: "CLUB DEPORTIVO", art: "este club", kw: ["club", "temporada", "liga", "jornada", "partido", "federación", "cantera"], services: "ACTIVIDADES Y SERVICIOS", person: "Presidente/a" },
  { key: "TIENDA", art: "esta tienda", kw: ["tienda", "carrito", "envío", "comprar", "productos", "oferta", "añadir al carrito", "catálogo"], services: "PRODUCTOS Y SERVICIOS", person: "Responsable" },
];
const GENERIC_SECTOR = { key: "MARCA", art: "esta marca", services: "SERVICIOS", person: "Responsable" };

function detectSector(text, tpl) {
  if (tpl === "inmobiliaria") return SECTORS[0];
  if (tpl === "generica") return GENERIC_SECTOR;
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const s of SECTORS) {
    const score = s.kw.reduce((n, k) => n + Math.min(5, t.split(k).length - 1), 0);
    if (score > bestScore) { best = s; bestScore = score; }
  }
  return bestScore >= 2 ? best : GENERIC_SECTOR;
}

/* ================= Datos de contacto ================= */

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi;
const PHONE_RE = /(?:\+34[\s.-]?)?\b[6789](?:[\s.-]?\d){8}\b/g;

function fmtPhone(p) {
  const d = p.replace(/\D/g, "").replace(/^34(?=\d{9}$)/, "");
  if (d.length !== 9) return clean(p);
  return d[0] === "9" ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}`;
}

function pickEmail(cands, host) {
  const ok = uniqBy(cands.map((e) => e.toLowerCase().replace(/^mailto:/, "").split("?")[0]), (e) => e)
    .filter((e) => !/\.(png|jpe?g|webp|gif|svg)$/.test(e) && !/sentry|wixpress|example|domain|email@|tuemail|@2x/.test(e));
  return ok.find((e) => host && e.endsWith(host.replace(/^www\./, ""))) || ok[0] || null;
}

/* ================= Lectura de la web ================= */

const SUBPAGE_RE = /servici|nosotros|quienes|qui%C3%A9nes|about|empresa|contact|equipo|productos|carta|tratamientos|que-hacemos|vender|propietario/i;

async function readSite(url, onStatus) {
  onStatus("Leyendo la web…");
  const homeHtml = await fetchResource(url);
  const parser = new DOMParser();
  const pages = [{ url, html: homeHtml, doc: parser.parseFromString(homeHtml, "text/html") }];
  const host = new URL(url).host;

  const links = uniqBy([...pages[0].doc.querySelectorAll("a[href]")]
    .map((a) => abs(a.getAttribute("href"), url).split("#")[0])
    .filter((h) => { try { const u = new URL(h); return u.host === host && SUBPAGE_RE.test(u.pathname) && !/\.(pdf|jpe?g|png|zip)$/i.test(u.pathname); } catch { return false; } }), (h) => h)
    .filter((h) => h !== url).slice(0, 4);

  onStatus(`Leyendo ${links.length + 1} páginas de la web…`);
  const subs = await Promise.allSettled(links.map(async (l) => {
    const html = await fetchResource(l);
    return { url: l, html, doc: parser.parseFromString(html, "text/html") };
  }));
  subs.forEach((s) => s.status === "fulfilled" && pages.push(s.value));

  // CSS: <style> en línea + hojas enlazadas (las más relevantes)
  onStatus("Analizando estilos (colores y tipografías)…");
  let css = pages.map((p) => [...p.doc.querySelectorAll("style")].map((s) => s.textContent).join("\n")).join("\n");
  css += "\n" + [...pages[0].doc.querySelectorAll("[style]")].map((e) => `x{${e.getAttribute("style")}}`).join("\n");
  const sheets = uniqBy([...pages[0].doc.querySelectorAll('link[rel~="stylesheet"][href]')].map((l) => abs(l.getAttribute("href"), url)), (h) => h)
    .filter((h) => !/fonts\.googleapis|font-?awesome|dashicons|wp-includes|block-library|bootstrap(\.min)?\.css|animate|swiper|slick|eicons|elementor-icons/i.test(h))
    .sort((a, b) => score(b) - score(a)).slice(0, 8);
  function score(h) { return (/post-\d+|global|custom|style|theme|main|app/i.test(h) ? 2 : 0) + (new URL(h).host === host ? 1 : 0); }
  const sheetTexts = await Promise.allSettled(sheets.map((s) => fetchResource(s)));
  sheetTexts.forEach((r) => { if (r.status === "fulfilled" && r.value.length < 3e6) css += "\n" + r.value; });
  const gfLinks = [...pages[0].doc.querySelectorAll('link[href*="fonts.googleapis"]')].map((l) => l.getAttribute("href")).join(" ");
  return { pages, css, host, gfLinks };
}

function findLogo(doc, base) {
  const imgs = [...doc.querySelectorAll("img")];
  const attr = (i) => `${i.getAttribute("src") || ""} ${i.getAttribute("data-src") || ""} ${i.className || ""} ${i.id || ""} ${i.getAttribute("alt") || ""} ${i.parentElement?.className || ""}`.toLowerCase();
  const src = (i) => i.getAttribute("data-src") || i.getAttribute("src") || (i.getAttribute("srcset") || "").split(/\s/)[0];
  const cand =
    imgs.find((i) => /logo/.test(attr(i)) && i.closest("header,nav,.header,#header,.site-header")) ||
    imgs.find((i) => /logo/.test(attr(i))) ||
    doc.querySelector(".custom-logo, .site-logo img, header img");
  let url = cand ? abs(src(cand), base) : "";
  if (url.startsWith("data:")) url = "";
  if (!url) {
    const ld = jsonLd(doc).map((o) => o.logo?.url || o.logo).find((l) => typeof l === "string");
    if (ld) url = abs(ld, base);
  }
  if (!url) {
    const icon = doc.querySelector('link[rel="apple-touch-icon"], link[rel="icon"][sizes="192x192"], link[rel="icon"]');
    if (icon) url = abs(icon.getAttribute("href"), base);
  }
  const inlineSvg = !url && doc.querySelector("header svg, .logo svg");
  return { url, inlineSvg: inlineSvg ? inlineSvg.outerHTML : null };
}

function jsonLd(doc) {
  const out = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const j = JSON.parse(s.textContent);
      const walk = (o) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) return o.forEach(walk); out.push(o); if (o["@graph"]) walk(o["@graph"]); };
      walk(j);
    } catch { /* JSON-LD inválido */ }
  });
  return out;
}

function siteName(doc, host) {
  const og = doc.querySelector('meta[property="og:site_name"]')?.content;
  const ld = jsonLd(doc).find((o) => /Organization|LocalBusiness|RealEstateAgent|Store|Restaurant/i.test([].concat(o["@type"]).join(" ")) && o.name)?.name;
  const title = clean(doc.querySelector("title")?.textContent);
  const parts = title.split(/\s+[|\-–—·:]\s+/).map(clean).filter(Boolean);
  const core = norm(host.replace(/^www\./, "").split(".")[0]);
  const fromTitle = parts.find((p) => { const n = norm(p); return n && (core.includes(n) || n.includes(core)); });
  const name = clean(og || ld || fromTitle || parts[parts.length > 1 ? parts.length - 1 : 0] || "");
  const descriptor = parts.find((p) => norm(p) !== norm(name) && p.length < 70 && !/^(inicio|home|portada)$/i.test(p)) || "";
  return { name, descriptor };
}

function findLocality(pages, text) {
  for (const p of pages) for (const o of jsonLd(p.doc)) {
    const a = o.address || o.location?.address;
    const loc = a && (a.addressLocality || (typeof a === "string" ? a : ""));
    if (loc) return clean(loc);
  }
  const m = text.match(/\b\d{5}\s*[,-]?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s(?:de\s)?[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/);
  if (m) return m[1];
  const m2 = text.match(/\b(?:en|de)\s+(Sevilla|Madrid|Barcelona|Valencia|Málaga|Córdoba|Granada|Cádiz|Huelva|Jaén|Almería|Badajoz|Cáceres|Mérida|Carmona|Zaragoza|Bilbao|Murcia|Alicante|Valladolid|Salamanca|Toledo|Don Benito|Jerez|Marbella)\b/);
  return m2 ? m2[1] : null;
}

function findYears(text) {
  let m = text.match(/(?:más de|mas de|con)\s+(\d{1,2})\s+años/i) || text.match(/(\d{1,2})\s+años\s+(?:de\s+)?(?:experiencia|trayectoria|en el sector)/i);
  if (m) return `${m[1]} años`;
  m = text.match(/(?:desde|fundad[ao] en|since)\s+(?:el\s+(?:año\s+)?)?((?:19|20)\d{2})/i);
  if (m) { const y = new Date().getFullYear() - +m[1]; if (y > 0 && y < 120) return `${y} años (desde ${m[1]})`; }
  return null;
}

/* ================= Servicios, argumentos, propuesta ================= */

const NAV_SKIP = /^(inicio|home|portada|contacto|contáctanos|contactar|blog|noticias|nosotros|quiénes somos|quienes somos|sobre nosotros|aviso legal|privacidad|política|cookies|faq|preguntas|login|acceder|mi cuenta|carrito|buscar|menú|menu|ver más|leer más|saber más|más información|español|english|es|en|ir al contenido|siguiente|anterior|cerrar|enviar|suscríbete)$/i;

function extractServices(pages) {
  const out = [];
  const add = (t) => {
    t = clean(t).replace(/[:.]$/, "");
    if (t.length < 3 || t.length > 70 || t.split(" ").length > 9 || NAV_SKIP.test(t) || /©|\d{3}\s?\d{2}|@|https?:|cookies/i.test(t)) return;
    out.push(cap(t));
  };
  for (const p of pages) {
    const d = p.doc;
    // Submenú "Servicios"
    d.querySelectorAll("nav li, .menu li, header li").forEach((li) => {
      const a = li.querySelector(":scope > a");
      if (a && /servici|productos|tratamientos|qué hacemos|que hacemos/i.test(textOf(a))) li.querySelectorAll("ul a").forEach((x) => add(textOf(x)));
    });
    // Secciones con título de servicios
    d.querySelectorAll("h1,h2,h3,h4").forEach((h) => {
      if (!/servici|ofrecemos|qué hacemos|que hacemos|productos|tratamientos|especialidades|te ayudamos/i.test(textOf(h))) return;
      const box = h.closest("section") || h.parentElement?.parentElement?.parentElement || h.parentElement;
      box?.querySelectorAll("li, h3, h4, h5, h6").forEach((x) => { if (x !== h) add(textOf(x)); });
    });
    if (/servici|tratamientos|productos/i.test(p.url)) d.querySelectorAll("main h2, main h3, main h4, article h2, article h3, h3, h4").forEach((x) => add(textOf(x)));
  }
  return uniqBy(out, norm).filter((s) => !/servicios?$|nuestros|ofrecemos/i.test(s)).slice(0, 12);
}

const ARG_KW = ["experiencia", "equipo", "personaliz", "profesional", "confianza", "calidad", "garantía", "cercan", "años", "compromiso", "transparen", "especializ", "asesor", "atención", "resultado", "segur", "rápid", "honest", "ético", "integral", "a medida", "sin compromiso", "gratis", "gratuita", "mejor precio", "local"];

function sentencesOf(paragraphs) {
  return paragraphs.flatMap((p) => p.split(/(?<=[.!?])\s+/)).map(clean).filter((s) => s.length > 25 && s.length < 180);
}

function extractArguments(headings, paragraphs, services = []) {
  const svc = new Set(services.map(norm));
  const cands = [...headings.filter((h) => h.split(" ").length >= 3 && h.split(" ").length <= 14).map((t) => ({ t, bonus: 1 })), ...sentencesOf(paragraphs).map((t) => ({ t, bonus: 0 }))];
  const scored = cands.filter(({ t }) => !svc.has(norm(t))).map(({ t, bonus }) => {
    const l = t.toLowerCase();
    const hits = ARG_KW.filter((k) => l.includes(k));
    return { t, hits, score: hits.length * 2 + bonus - (t.length > 140 ? 1 : 0) };
  }).filter((c) => c.hits.length).sort((a, b) => b.score - a.score);
  const used = new Set(); const out = [];
  for (const c of scored) {
    if (out.length === 3) break;
    if (c.hits.every((h) => used.has(h))) continue;
    c.hits.forEach((h) => used.add(h));
    out.push(cap(c.t.replace(/[.!?:;,]*$/, "")) + ".");
  }
  return out;
}

function extractProposal(name, meta, paragraphs, ocrText) {
  const re = /\b(somos|nuestr[oa]s?|nos (?:comprometemos|dedicamos|especializamos)|ofrecemos|te ayudamos|te acompañamos|misión|apostamos)\b/i;
  const ps = paragraphs.filter((p) => re.test(p) && p.length > 60 && p.length < 700)
    .sort((a, b) => (b.match(new RegExp(re, "gi")) || []).length - (a.match(new RegExp(re, "gi")) || []).length);
  const pieces = [];
  if (meta && meta.length > 40) pieces.push(endDot(meta));
  for (const p of ps) { if (pieces.join(" ").length > 500) break; if (!pieces.some((x) => norm(x).includes(norm(p).slice(0, 40)))) pieces.push(endDot(p)); }
  if (!pieces.length && ocrText) {
    const bio = ocrText.split("\n").map(clean).filter((l) => l.length > 25 && !/@|seguidores|publicaciones|seguidos|followers|\d{3}\s?\d{2}/i.test(l)).slice(0, 3).map(endDot).join(" ");
    if (bio) pieces.push(bio);
  }
  if (!pieces.length) return null;
  let txt = pieces.join(" ");
  if (name && !txt.toLowerCase().includes(name.toLowerCase().split(" ")[0])) txt = `En ${name}, ${txt.charAt(0).toLowerCase()}${txt.slice(1)}`;
  return txt;
}

/* ================= Tono y estilo ================= */

function analyzeTone(corpus) {
  const t = corpus.toLowerCase();
  const count = (re) => (t.match(re) || []).length;
  const tu = count(/\b(tú|tu|tus|te|contigo|ti|tuyo|tuya)\b/g);
  const usted = count(/\b(usted|ustedes|le ofrecemos|le ayudamos|su vivienda|sus necesidades|le atenderemos)\b/g);
  const sentences = corpus.split(/[.!?\n]+/).filter((s) => s.trim().split(" ").length > 2);
  const avg = sentences.length ? sentences.reduce((n, s) => n + s.trim().split(/\s+/).length, 0) / sentences.length : 15;
  const excl = count(/!/g) / Math.max(1, sentences.length);
  const emojis = (corpus.match(/\p{Extended_Pictographic}/gu) || []).length;
  const warm = count(/cercan|famil|ilusi|pasi[oó]n|cariño|disfrut|juntos|hogar|sueño|feliz|amig|equipo/g);
  const pro = count(/profesional|excelencia|calidad|soluci|garant|experiencia|rigor|eficac|especializ|seriedad|confianza/g);
  return { tuteo: tu >= usted, avg, excl, emojis, warm, pro };
}

function toneText(tone, hasText) {
  if (!hasText) return null;
  const adj = [];
  if (tone.warm >= tone.pro * 0.6) adj.push("cercana", "humana");
  if (tone.pro >= tone.warm * 0.6) adj.push("profesional");
  if (tone.excl > 0.15 || tone.emojis > 3) adj.push("enérgica"); else if (!adj.includes("profesional")) adj.push("serena");
  const lista = adj.length > 1 ? adj.slice(0, -1).join(", ") + " y " + adj[adj.length - 1] : adj[0];
  const parts = [];
  parts.push(`Hablamos de forma ${lista}, ${tone.tuteo ? "tuteando al cliente" : "tratando al cliente de usted"} y utilizando un lenguaje ${tone.avg < 17 ? "claro, directo y fácil de entender" : "cuidado, explicativo y detallado"}.`);
  const valores = [];
  if (tone.pro) valores.push("confianza", "rigor");
  if (tone.warm) valores.push("cercanía", "compromiso");
  if (!valores.length) valores.push("confianza", "compromiso");
  parts.push(`Nos comunicamos con transparencia y empatía, transmitiendo ${valores.slice(0, 3).join(", ").replace(/, ([^,]*)$/, " y $1")}.`);
  if (tone.excl > 0.15 || tone.emojis > 3) parts.push("Usamos exclamaciones y emojis para dar energía y cercanía, sin abusar de ellos.");
  else parts.push("Usamos exclamaciones y emojis con moderación para mantener un registro cuidado.");
  parts.push("Evitamos tecnicismos innecesarios, promesas exageradas y un lenguaje impersonal o agresivo.");
  return parts.join(" ");
}

function visualStyle(roles, fonts, darkShare) {
  const p = roles.principal;
  const serif = fonts && /serif/.test(fontDesc(fonts.heading.family, fonts.heading.fallback)) && !/sans/.test(fontDesc(fonts.heading.family, fonts.heading.fallback));
  const vibrant = p && p.s > 0.55 && p.l > 0.3 && p.l < 0.7;
  const dark = darkShare > 0.35 || (roles.secundario && isDark(roles.secundario));
  const a = [serif ? "Elegante" : "Moderno", serif ? "cuidado" : "profesional", vibrant ? "y con energía" : "y sobrio"].join(", ").replace(", y", " y");
  const pName = p ? colorName(p).toLowerCase() : "color";
  const fondo = dark ? `Combina fondos oscuros con acentos en ${pName}` : `Predominan los fondos claros con acentos en ${pName}`;
  const tipo = serif ? "tipografía serif de aire clásico" : "tipografía clara y legible";
  const trans = vibrant ? "dinamismo, cercanía y personalidad" : "solidez, confianza y profesionalidad";
  return `${a}. ${fondo} y ${tipo}, transmitiendo ${trans}.`;
}

/* ================= OCR ================= */

let tesseractLoaded = null;
function loadTesseract() {
  if (tesseractLoaded) return tesseractLoaded;
  tesseractLoaded = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => res(window.Tesseract);
    s.onerror = () => { tesseractLoaded = null; rej(new Error("No se pudo cargar el lector de texto (OCR).")); };
    document.head.append(s);
  });
  return tesseractLoaded;
}

async function ocrImages(images, onStatus) {
  const T = await loadTesseract();
  onStatus("Preparando el lector de texto (la primera vez tarda un poco)…");
  const worker = await T.createWorker("spa", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
    langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa@1.0.0/4.0.0_best_int",
  });
  const texts = [];
  try {
    for (let i = 0; i < images.length; i++) {
      onStatus(`Leyendo el texto de las capturas (${i + 1}/${images.length})…`);
      const { data } = await worker.recognize(images[i].dataUrl);
      texts.push(data.text || "");
    }
  } finally { await worker.terminate(); }
  return texts.join("\n");
}

function cleanOcr(t) {
  return t.split("\n").map((l) => l
    .replace(/[^\p{L}\p{N}\s@.,;:!?¡¿()'"%€&+\/-]/gu, " ") // ruido (emojis mal leídos, símbolos)
    .replace(/(^|\s)[^\p{L}\p{N}@\s]{1,3}(?=\s|$)/gu, " ")
    .replace(/(^|\s)(?:[A-Za-z]{1,2}|£\w)(?=\s|$)(?!\S)/g, (m, sp, i, str) => (/^(y|o|a|e|u|en|de|el|la|tu|te|al|mi|su|un|es|lo|se|si|no|ya)$/i.test(m.trim()) ? m : sp))
    .replace(/\s+/g, " ").trim()).join("\n");
}

/* ================= Notas del usuario ================= */

function parseNotes(notes) {
  const n = {};
  if (!notes) return n;
  const g = (re) => (notes.match(re) || [])[1]?.trim();
  n.email = (notes.match(EMAIL_RE) || [])[0];
  n.phone = (notes.match(PHONE_RE) || [])[0];
  n.years = g(/(\d{1,3})\s*años/i);
  n.person = g(/(?:agente principal|fundador[a]?|director[a]?|responsable|chef|propietari[oa])\s*(?:es|:)?\s*([A-ZÁÉÍÓÚÑ][^\n,.;]+)/i);
  n.zone = g(/(?:zona|trabajan|trabajamos|ubicad[oa]s?|estamos)\s*(?:de trabajo)?\s*(?:es|:|en)?\s*(?:en\s+)?([A-ZÁÉÍÓÚÑ][^\n,.;]+)/i);
  n.name = g(/(?:nombre|marca)\s*:\s*([^\n]+)/i);
  return n;
}

/* ================= Composición de la ficha ================= */

const C = "[completar]";

function colorLine(c, brand) { return c ? `${colorName(c)} ${brand} ${c.hex}` : C; }
function colorRef(c, brand) { return c ? `${colorName(c)} ${brand} (${c.hex})` : C; }

export async function extractLocal({ url, ig, notes, tpl, images, ocr, onStatus = () => {} }) {
  const warnings = [];
  let site = null;
  if (url) {
    try { site = await readSite(url, onStatus); }
    catch (e) { warnings.push("No se pudo leer la web (" + e.message + "). Prueba a abrir la app con el servidor local: node adn/server.js"); }
  }

  let ocrText = "";
  if (ocr && images.length) {
    try { ocrText = cleanOcr(await ocrImages(images, onStatus)); }
    catch (e) { warnings.push(e.message); }
  }
  const ocrLines = ocrText.split("\n").map(clean).filter((l) => l.length > 25 && !/seguidores|seguidos|publicaciones|followers|following|posts|mensaje|editar perfil/i.test(l));

  onStatus("Calculando la paleta de colores…");
  const home = site?.pages[0];
  const doc = home?.doc;
  const host = site?.host || "";
  const allHtml = site ? site.pages.map((p) => p.html).join("\n") : "";
  const texts = site ? site.pages.map((p) => pageText(p.doc)) : [];
  const fullText = [texts.join(" "), ocrText].join(" ");
  const headings = site ? uniqBy(site.pages.flatMap((p) => [...p.doc.querySelectorAll("h1,h2,h3,h4")].map(textOf)), norm) : [];
  const paragraphs = site ? uniqBy(site.pages.flatMap((p) => [...p.doc.querySelectorAll("p")].map(textOf)).filter((t) => t.length > 40), norm) : [];
  const meta = doc ? clean(doc.querySelector('meta[name="description"]')?.content || doc.querySelector('meta[property="og:description"]')?.content) : "";

  // Colores
  let colors = site ? cssColors(site.css, home.html) : [];
  const logo = doc ? findLogo(doc, url) : { url: "", inlineSvg: null };
  try {
    let logoColors = [];
    if (logo.inlineSvg) logoColors = svgColors(logo.inlineSvg);
    else if (logo.url) {
      if (/\.svg(\?|$)/i.test(logo.url)) logoColors = svgColors(await fetchResource(logo.url));
      else logoColors = await imagePalette(await fetchResource(logo.url, "blob"), 64);
    }
    const tot = colors.reduce((n, c) => n + c.score, 0) || 1;
    colors = colors.concat(logoColors.filter((c) => !isWhiteish(c)).map((c) => ({ ...c, score: c.score * tot * 0.6 })));
  } catch { /* logo no accesible: seguimos con CSS */ }

  let darkShare = 0;
  if (images.length) {
    const pals = await Promise.all(images.map((im) => imagePalette(im.dataUrl).catch(() => [])));
    const flat = pals.flat();
    const imgTot = flat.reduce((n, c) => n + c.score, 0) || 1;
    darkShare = flat.filter(isDark).reduce((n, c) => n + c.score, 0) / imgTot;
    const tot = colors.reduce((n, c) => n + c.score, 0);
    // Con web, las capturas pesan menos (los HEX del CSS son exactos); sin web, mandan.
    const factor = tot ? tot * 0.35 / imgTot : 100 / imgTot;
    colors = colors.concat(flat.filter((c) => !(c.s < 0.08 && c.l > 0.85)).map((c) => ({ ...c, score: c.score * factor })));
  }
  colors = mergeColors(colors);
  const roles = pickRoles(colors);

  // Tipografías
  const fonts = site ? collectFonts(home.html + " " + site.gfLinks, site.css) : null;

  // Identidad
  const n = parseNotes(notes);
  const sn = doc ? siteName(doc, host) : { name: "", descriptor: "" };
  const igHandle = ig ? (ig.startsWith("@") ? ig : "@" + ig) : (allHtml.match(/instagram\.com\/([\w.]{2,30})/i) || [])[1] ? "@" + allHtml.match(/instagram\.com\/([\w.]{2,30})/i)[1] : (ocrText.match(/@[\w.]{3,30}/) || [])[0] || "";
  const handleNorm = norm(igHandle);
  const ocrName = handleNorm ? ocrText.split("\n").map(clean).find((l) => l.length > 2 && l.length < 50 && /\s/.test(l) && norm(l) && (handleNorm.includes(norm(l)) || norm(l).includes(handleNorm))) : null;
  let name = n.name || sn.name || ocrName;
  if (!name && igHandle) name = igHandle.replace("@", "").replace(/[._]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const brand = (name || "Marca").split(/\s+/).find((w) => w.length > 2) || name || "Marca";
  const sector = detectSector(`${sn.descriptor} ${meta} ${headings.join(" ")} ${fullText}`.slice(0, 60000), tpl);
  const zone = n.zone || findLocality(site?.pages || [], fullText);
  let descriptor = sn.descriptor;
  if (!descriptor) descriptor = sector === GENERIC_SECTOR ? (zone ? `Negocio en ${zone}` : "") : `${cap(sector.key.toLowerCase())}${zone ? " en " + zone : ""}`;

  const telLink = doc ? [...doc.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute("href").slice(4))[0] : null;
  const phone = n.phone || telLink || (fullText.match(PHONE_RE) || [])[0];
  const mailLinks = site ? site.pages.flatMap((p) => [...p.doc.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute("href"))) : [];
  const email = n.email || pickEmail([...mailLinks, ...(fullText.match(EMAIL_RE) || [])], host);
  const ocrWeb = (ocrText.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:es|com|net|org|eu|shop|store|info)\b(?:\/\S*)?/i) || [])[0];
  const web = url || (ocrWeb ? (ocrWeb.startsWith("http") ? ocrWeb : "https://" + ocrWeb) : "");
  const years = n.years ? `${n.years} años` : findYears(fullText);
  const person = n.person || (sector.key === "INMOBILIARIA" && name ? `${name} (Equipo)` : null);

  // Contenidos
  const services = site ? extractServices(site.pages) : [];
  const args = extractArguments(headings, paragraphs.concat(ocrLines.map(endDot)), services);
  const proposal = extractProposal(name, meta, paragraphs, ocrText);
  const tone = analyzeTone([paragraphs.join(" "), ocrText].join(" "));
  const toneTxt = toneText(tone, paragraphs.length > 0 || ocrText.length > 80);
  const style = roles.principal ? visualStyle(roles, fonts, darkShare) : C;

  const fHead = fonts?.heading, fBody = fonts?.body;
  const headBold = fHead && (fHead.bold > 0 || fHead.heading > 0);
  const fontHeadLine = fHead ? `${fHead.family}, ${fontDesc(fHead.family, fHead.fallback)}${headBold ? ", con peso (bold)" : ""}` : C;
  const fontBodyLine = fBody ? `${fBody.family}, ${fontDesc(fBody.family, fBody.fallback)}` : C;

  const { principal: P, secundario: S, acento: A } = roles;
  const darkC = [P, S, A].filter(Boolean).sort((a, b) => a.l - b.l)[0];
  const lightC = [P, S, A].filter(Boolean).sort((a, b) => b.l - a.l)[0];
  const sober = !(P && P.s > 0.55 && P.l > 0.3 && P.l < 0.7);
  const serifHead = fHead && /serif/.test(fontDesc(fHead.family, fHead.fallback)) && !/sans/.test(fontDesc(fHead.family, fHead.fallback));
  const nunca = [
    sober ? "colores estridentes o pastel" : "tonos apagados o grises que resten energía a la marca",
    serifHead ? "tipografías informales o de palo seco sin carácter" : "tipografías ornamentales o ilegibles",
    "diseños recargados",
    "fotografías genéricas o de banco de imágenes",
    "lenguaje impersonal o agresivo",
  ];
  const adjStyle = style !== C ? style.split(".")[0].toLowerCase() : "profesional y coherente";

  const contact = [web ? `Web: ${web}` : `Web: ${C}`, `Email: ${email || C}`, `Teléfono: ${phone ? fmtPhone(phone) : C}`].join(" | ");
  const firma = [web ? `🌐 ${web}` : null, email ? `✉ ${email}` : null, phone ? `📞 ${fmtPhone(phone)}` : null].filter(Boolean);
  const firmaLine = firma.length ? [firma.find((x) => x.startsWith("📞")), firma.find((x) => x.startsWith("✉")), firma.find((x) => x.startsWith("🌐"))].filter(Boolean).join(" | ") : `📞 ${C} | ✉ ${C} | 🌐 ${C}`;

  const L = [];
  L.push(`=== ADN ${sector.key} ===`, "", "IDENTIDAD", "");
  L.push(`Nombre: ${name || C}${descriptor ? " - " + descriptor : ""}`);
  L.push(`${sector.person}: ${person || C}`);
  L.push(`Zona de trabajo: ${zone ? zone + " y alrededores" : C}`);
  L.push(`Años de experiencia: ${years || C}`);
  L.push(contact);
  if (igHandle) L.push(`Instagram: ${igHandle}`);
  L.push("", "IDENTIDAD VISUAL", "");
  L.push(`Logo URL: ${logo.url || C}`);
  L.push(`Color principal: ${colorLine(P, brand)}`);
  L.push(`Color secundario: ${colorLine(S, brand)}`);
  L.push(`Color de acento: ${colorLine(A, brand)}`);
  L.push(`Tipografía títulos: ${fontHeadLine}`);
  L.push(`Tipografía cuerpo: ${fontBodyLine}`);
  L.push(`Estilo visual: ${style}`);
  L.push("", "PROPUESTA DE VALOR", "", proposal || C);
  L.push("", "TONO DE COMUNICACIÓN", "", toneTxt || C);
  L.push("", "ARGUMENTOS CLAVE", "");
  (args.length ? args : [C, C, C]).forEach((a, i) => { if (i) L.push(""); L.push(a); });
  while (args.length && args.length < 3) { L.push("", C); args.push(C); }
  L.push("", sector.services, "", ...(services.length ? services : [C]));
  L.push("", "INSTRUCCIONES DE DISEÑO PARA IA", "");
  L.push(`Cuando generes cualquier documento, informe o contenido para ${sector.art} aplica siempre:`, "");
  L.push(`Fondo principal en ${colorRef(darkC, brand)} o ${colorRef(lightC && lightC !== darkC ? lightC : null, brand)} según el contexto y la legibilidad.`, "");
  L.push(`Textos en ${colorRef(lightC, brand)} sobre fondos oscuros, y en ${colorRef(darkC, brand)} sobre fondos claros.`, "");
  L.push(`Títulos en ${fHead ? fHead.family : C}${headBold ? ", bold" : ""}, con un estilo ${serifHead ? "elegante y cuidado" : "moderno y directo"}.`, "");
  L.push(`Cuerpo en ${fBody ? fBody.family : C}, tamaño legible y espaciado adecuado.`, "");
  L.push(`Acentos visuales, iconografía y separadores en ${colorRef(P, brand)}.`, "");
  L.push(`Logo siempre presente: ${logo.url || C}`, "");
  L.push(`Estilo general: ${adjStyle}, con énfasis en ${tone.warm > tone.pro ? "la cercanía y la confianza" : "la profesionalidad y la confianza"}.`, "");
  L.push(`Nunca uses: ${nunca.slice(0, -1).join(", ")} o ${nunca[nunca.length - 1]}.`);
  L.push("", "FIRMA CORPORATIVA", "", name || C, descriptor || C, firmaLine);
  L.push("", "=== FIN ADN ===");

  const corpus = [meta, headings.slice(0, 60).join(" · "), paragraphs.join("\n"), ocrText].filter(Boolean).join("\n\n").slice(0, 12000);
  return { text: L.join("\n"), warnings, corpus, palette: colors.slice(0, 8) };
}
