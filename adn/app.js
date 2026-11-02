import Anthropic from "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm";

const MODEL = "claude-opus-5-5";
const MAX_IMAGES = 20;
const MAX_SIDE = 1568;
const LS_KEY = "adn.apiKey";
const LS_HISTORY = "adn.history";

const $ = (id) => document.getElementById(id);
const els = {
  form: $("form"), url: $("url"), ig: $("ig"), files: $("files"), drop: $("drop"),
  thumbs: $("thumbs"), notes: $("notes"), key: $("key"), remember: $("remember"),
  go: $("go"), error: $("error"), status: $("status"), statusText: $("statusText"),
  output: $("output"), editor: $("editor"), swatches: $("swatches"),
  copy: $("copy"), download: $("download"), edit: $("edit"), resultTitle: $("resultTitle"),
  history: $("history"), historyCard: $("historyCard"), clearHistory: $("clearHistory"),
};

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};
els.key.value = store.get(LS_KEY) || "";

/* ---------- Plantilla e instrucciones ---------- */
const TEMPLATE = `=== ADN {SECTOR} ===

IDENTIDAD

Nombre: {nombre comercial} - {descriptor corto}
{campo de responsable, p. ej. "Agente principal:" en inmobiliarias, "Fundador/a:", "Chef:", "Director/a:"}
Zona de trabajo: {ámbito geográfico}
Años de experiencia: {número o [completar]}
Web: {url} | Email: {email} | Teléfono: {teléfono}

IDENTIDAD VISUAL

Logo URL: {url absoluta del logo}
Color principal: {Nombre del color} {Marca} #HEX
Color secundario: {Nombre del color} {Marca} #HEX
Color de acento: {Nombre del color} {Marca} #HEX
Tipografía títulos: {familia}, {descripción y peso}
Tipografía cuerpo: {familia}, {descripción}
Estilo visual: {2-3 frases}

PROPUESTA DE VALOR

{párrafo en primera persona del plural, 3-5 frases}

TONO DE COMUNICACIÓN

{párrafo en primera persona del plural: cómo hablamos y qué evitamos}

ARGUMENTOS CLAVE

{argumento 1}

{argumento 2}

{argumento 3}

{SERVICIOS}

{un servicio por línea}

INSTRUCCIONES DE DISEÑO PARA IA

Cuando generes cualquier documento, informe o contenido para {esta marca} aplica siempre:

Fondo principal en {color} (#HEX) o {color} (#HEX) según el contexto y la legibilidad.

Textos en {color} (#HEX) sobre fondos oscuros, y en {color} (#HEX) sobre fondos claros.

Títulos en {tipografía}, {peso}, con un estilo {adjetivos}.

Cuerpo en {tipografía}, tamaño legible y espaciado adecuado.

Acentos visuales, iconografía y separadores en {color} (#HEX).

Logo siempre presente: {url del logo}

Estilo general: {adjetivos}, con énfasis en {idea central}.

Nunca uses: {lo que rompe la marca}.

FIRMA CORPORATIVA

{Nombre}
{Descriptor}
📞 {teléfono} | ✉ {email} | 🌐 {web}

=== FIN ADN ===`;

const EXAMPLE = `=== ADN INMOBILIARIA ===

IDENTIDAD

Nombre: Nexo Propiedades - Consultoría Inmobiliaria Carmona
Agente principal: Nexo Propiedades (Equipo)
Zona de trabajo: Carmona y alrededores
Años de experiencia: [completar]
Web: https://nexopropiedades.es/ | Email: nexo@nexopropiedades.es | Teléfono: 625 52 41 81

IDENTIDAD VISUAL

Logo URL: https://nexopropiedades.es/wp-content/uploads/2024/07/Logo-NEXO-blanco.png
Color principal: Ámbar Nexo #B7960C
Color secundario: Azul Marino Nexo #242430
Color de acento: Blanco Nexo #FFFFFF
Tipografía títulos: Raleway, sans-serif moderna y con peso (bold)
Tipografía cuerpo: Raleway, sans-serif moderna y legible
Estilo visual: Moderno, profesional y directo. Combina fondos oscuros con acentos de color vibrante y tipografía clara, transmitiendo solidez, confianza y una conexión humana.

PROPUESTA DE VALOR

En Nexo Propiedades, somos el nexo entre tú y tu próxima vivienda. Nos comprometemos a brindarte un servicio personalizado, centrado en tus necesidades y objetivos, acompañándote en cada paso de la operación de compraventa con un equipo profesional y dedicado. Nuestro enfoque se basa en un trato humano y ético inmejorable, asegurando que cada transacción sea una experiencia fluida, segura y exitosa, y creando relaciones de confianza a largo plazo.

TONO DE COMUNICACIÓN

Hablamos de forma cercana, humana y profesional, utilizando un lenguaje claro y comprensible. Nos comunicamos con transparencia y empatía, adaptándonos a las necesidades de cada cliente y transmitiendo confianza y compromiso. Evitamos tecnicismos innecesarios, promesas exageradas y un lenguaje impersonal o agresivo, priorizando siempre la escucha activa y el trato ético.

ARGUMENTOS CLAVE

Equipo altamente cualificado de profesionales del sector inmobiliario.

Servicio personalizado y centrado en las necesidades y objetivos del cliente.

Trato humano y ético inmejorable, con comunicación clara y escucha activa.

SERVICIOS AL PROPIETARIO

Valoración de vivienda
Venta de propiedades
Promoción y gestión de inmuebles
Plan de marketing para propiedades
Consultoría inmobiliaria
Asesoramiento jurídico y financiero
Liquidación de Impuesto de AJD
Liquidación de plusvalía
Gestión de cambio de suministros
Acceso a cartera de contactos (reformas, climatización, decoración)

INSTRUCCIONES DE DISEÑO PARA IA

Cuando generes cualquier documento, informe o contenido para esta inmobiliaria aplica siempre:

Fondo principal en Azul Marino Nexo (#242430) o Blanco Nexo (#FFFFFF) según el contexto y la legibilidad.

Textos en Blanco Nexo (#FFFFFF) sobre fondos oscuros, y en Azul Marino Nexo (#242430) sobre fondos claros.

Títulos en Raleway, bold, con un estilo moderno y directo.

Cuerpo en Raleway, tamaño legible y espaciado adecuado.

Acentos visuales, iconografía y separadores en Ámbar Nexo (#B7960C).

Logo siempre presente: https://nexopropiedades.es/wp-content/uploads/2024/07/Logo-NEXO-blanco.png

Estilo general: profesional, moderno, directo y humano, con énfasis en la conexión y la confianza.

Nunca uses: colores estridentes o pastel, tipografías ornamentales o ilegibles, diseños recargados, fotografías genéricas o lenguaje impersonal/agresivo.

FIRMA CORPORATIVA

Nexo Propiedades
Consultoría Inmobiliaria Carmona
📞 625 52 41 81 | ✉ nexo@nexopropiedades.es | 🌐 https://nexopropiedades.es/

=== FIN ADN ===`;

const SYSTEM = `Eres un estratega de marca y diseñador senior. Tu trabajo es extraer el "ADN de marca" de un negocio a partir de su web y/o capturas de pantalla (normalmente del feed de Instagram) y devolverlo en una ficha de texto que otra IA usará después como guía para generar documentos, posts e informes con la identidad de esa marca.

Formato de salida (obligatorio):
- Responde SOLO con la ficha, desde la línea "=== ADN ... ===" hasta "=== FIN ADN ===". Nada antes ni después, sin markdown (ni #, ni **, ni viñetas con guion).
- Respeta el orden, los títulos de sección en mayúsculas y las líneas en blanco de la plantilla y del ejemplo.
- Escribe en español de España.

Plantilla:
${TEMPLATE}

Ejemplo de ficha terminada (inmobiliaria):
${EXAMPLE}

Cómo rellenarla:
- Nombre: nombre comercial + " - " + descriptor corto (actividad + localidad si aplica).
- Colores: extrae el HEX real. En la web, búscalo en el CSS, en variables, en los estilos del tema o en el HTML; en capturas, estima el HEX a partir de los píxeles dominantes de logo, fondos, botones y textos. Dale a cada color un nombre evocador seguido del nombre corto de la marca ("Ámbar Nexo", "Azul Marino Nexo"). Principal = color más identitario (logo/acentos de marca); secundario = el que acompaña (fondos, textos); acento = el de contraste.
- Tipografías: identifícalas por las fuentes cargadas (Google Fonts, @font-face, font-family) o, si solo hay imágenes, di la familia más parecida y su estilo (p. ej. "Montserrat o similar, sans-serif geométrica en negrita").
- Logo URL: URL absoluta de la imagen del logo si aparece en la web (img del header, og:image, favicon de alta resolución…). Si no la tienes, escribe [completar].
- Propuesta de valor y tono: en primera persona del plural ("En X, somos…", "Hablamos de forma…"), basados en lo que la marca dice de verdad y en cómo escribe sus textos y captions.
- Argumentos clave: exactamente 3, una frase cada uno, separados por una línea en blanco.
- Sección de servicios: titúlala según el sector (en inmobiliarias, "SERVICIOS AL PROPIETARIO"; en otros casos "SERVICIOS", "PRODUCTOS", "CARTA Y SERVICIOS", "CATÁLOGO"…). Un elemento por línea, sin viñetas.
- Instrucciones de diseño para IA: concretas y coherentes con los colores y tipografías anteriores, siempre con nombre + HEX entre paréntesis. "Nunca uses" debe derivarse de lo que contradice la marca.
- Firma corporativa: nombre, descriptor y línea de contacto con 📞, ✉ y 🌐 (omite el elemento si no existe; no inventes).
- No inventes datos verificables (teléfonos, emails, años, nombres de personas, URLs). Si no aparecen en las fuentes, escribe [completar]. Los campos interpretativos (estilo, tono, propuesta, argumentos) sí debes redactarlos tú a partir de las fuentes.
- Si las notas del usuario aportan datos, priorízalos.

Investigación:
- Si tienes una URL, usa web_fetch para leer la página de inicio y, cuando ayude, las páginas de servicios, "quiénes somos" y contacto, así como la hoja de estilos principal o la URL de Google Fonts para sacar colores y fuentes exactos. Haz como máximo unas pocas lecturas bien elegidas.
- Puedes usar web_search para confirmar datos de contacto o la cuenta de Instagram si hace falta.
- Instagram suele bloquear la lectura directa: apóyate en las capturas para lo visual y el tono.`;

const SECTOR_HINT = {
  auto: "Detecta el sector del negocio y úsalo en la cabecera (=== ADN INMOBILIARIA ===, === ADN RESTAURANTE ===, === ADN CLÍNICA DENTAL ===, === ADN TIENDA ===…). Si es inmobiliaria, sigue el ejemplo al pie de la letra.",
  inmobiliaria: "Es una inmobiliaria: cabecera === ADN INMOBILIARIA ===, campo «Agente principal:» y sección «SERVICIOS AL PROPIETARIO», igual que el ejemplo.",
  generica: "Usa la cabecera === ADN MARCA === y adapta el campo de responsable y la sección de servicios al tipo de negocio.",
};

/* ---------- Imágenes ---------- */
let images = []; // { id, dataUrl, base64, mediaType }

async function addFiles(fileList) {
  const list = [...fileList].filter((f) => f.type.startsWith("image/"));
  for (const file of list) {
    if (images.length >= MAX_IMAGES) { showError(`Máximo ${MAX_IMAGES} imágenes.`); break; }
    try {
      images.push(await prepareImage(file));
    } catch {
      showError(`No se pudo leer «${file.name}».`);
    }
  }
  renderThumbs();
}

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.88);
      resolve({ id: crypto.randomUUID(), dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen")); };
    img.src = url;
  });
}

function renderThumbs() {
  els.thumbs.replaceChildren(...images.map((im, i) => {
    const d = document.createElement("div");
    d.className = "thumb";
    const img = document.createElement("img");
    img.src = im.dataUrl; img.alt = `Captura ${i + 1}`;
    const b = document.createElement("button");
    b.type = "button"; b.textContent = "×"; b.setAttribute("aria-label", "Quitar");
    b.onclick = () => { images = images.filter((x) => x.id !== im.id); renderThumbs(); };
    d.append(img, b);
    return d;
  }));
}

els.files.addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
["dragenter", "dragover"].forEach((t) => els.drop.addEventListener(t, (e) => { e.preventDefault(); els.drop.classList.add("is-over"); }));
["dragleave", "drop"].forEach((t) => els.drop.addEventListener(t, () => els.drop.classList.remove("is-over")));
els.drop.addEventListener("drop", (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
document.addEventListener("paste", (e) => {
  const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter(Boolean);
  if (files.length) { e.preventDefault(); addFiles(files); }
});

/* ---------- UI helpers ---------- */
function showError(msg) { els.error.textContent = msg; els.error.hidden = !msg; }
function setStatus(msg) { els.status.hidden = !msg; if (msg) els.statusText.textContent = msg; }
function setOutput(text) {
  els.output.textContent = text;
  els.output.scrollTop = els.output.scrollHeight;
}
let currentText = "";

function cleanResult(raw) {
  const start = raw.search(/===\s*ADN/i);
  const endMatch = raw.match(/===\s*FIN ADN\s*===/i);
  let text = raw;
  if (start >= 0) text = raw.slice(start, endMatch ? raw.indexOf(endMatch[0]) + endMatch[0].length : undefined);
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function renderSwatches(text) {
  const seen = new Set();
  const items = [];
  const re = /(?:^|\n)\s*Color[^:\n]*:\s*([^\n#]*?)\s*#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const hex = "#" + m[2].toUpperCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    items.push({ name: m[1].trim(), hex });
  }
  els.swatches.replaceChildren(...items.map(({ name, hex }) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "swatch"; b.title = "Copiar HEX";
    const i = document.createElement("i"); i.style.background = hex;
    b.append(i, `${name ? name + " · " : ""}${hex}`);
    b.onclick = () => copyText(hex, b);
    return b;
  }));
}

function setResult(text) {
  currentText = text;
  setOutput(text);
  renderSwatches(text);
  const ok = Boolean(text);
  els.copy.disabled = els.download.disabled = els.edit.disabled = !ok;
  const m = text.match(/^Nombre:\s*(.+)$/m);
  els.resultTitle.textContent = m ? m[1].split(" - ")[0].trim() : "ADN de la marca";
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text; document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
  }
  const prev = btn.textContent;
  if (btn.classList.contains("swatch")) return;
  btn.textContent = "¡Copiado!";
  setTimeout(() => { btn.textContent = prev; }, 1400);
}

els.copy.onclick = () => copyText(currentText, els.copy);
els.download.onclick = () => {
  const name = (els.resultTitle.textContent || "marca").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `adn-${name || "marca"}.txt`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
els.edit.onclick = () => {
  const editing = !els.editor.hidden;
  if (editing) {
    setResult(els.editor.value);
    updateHistoryEntry(currentText);
    els.editor.hidden = true; els.output.hidden = false; els.edit.textContent = "Editar";
  } else {
    els.editor.value = currentText;
    els.editor.style.height = Math.max(320, els.output.offsetHeight) + "px";
    els.editor.hidden = false; els.output.hidden = true; els.edit.textContent = "Guardar";
  }
};

/* ---------- Historial ---------- */
let activeHistoryId = null;
function loadHistory() { try { return JSON.parse(store.get(LS_HISTORY) || "[]"); } catch { return []; } }
function saveHistory(h) { store.set(LS_HISTORY, JSON.stringify(h.slice(0, 30))); renderHistory(); }
function addHistory(text, source) {
  const h = loadHistory();
  const m = text.match(/^Nombre:\s*(.+)$/m);
  activeHistoryId = crypto.randomUUID();
  h.unshift({ id: activeHistoryId, title: m ? m[1].trim() : source || "Marca", date: Date.now(), text });
  saveHistory(h);
}
function updateHistoryEntry(text) {
  if (!activeHistoryId) return;
  saveHistory(loadHistory().map((e) => (e.id === activeHistoryId ? { ...e, text } : e)));
}
function renderHistory() {
  const h = loadHistory();
  els.historyCard.hidden = !h.length;
  els.history.replaceChildren(...h.map((e) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    const s = document.createElement("span"); s.textContent = e.title;
    const d = document.createElement("small"); d.textContent = new Date(e.date).toLocaleDateString("es-ES");
    b.append(s, d);
    b.onclick = () => { activeHistoryId = e.id; setResult(e.text); window.scrollTo({ top: 0, behavior: "smooth" }); };
    li.append(b);
    return li;
  }));
}
els.clearHistory.onclick = () => { if (confirm("¿Borrar todo el historial?")) { store.del(LS_HISTORY); renderHistory(); } };
renderHistory();

/* ---------- Llamada a Claude ---------- */
function normalizeUrl(u) {
  u = u.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).href; } catch { return ""; }
}

function buildUserContent({ url, ig, notes, tpl }) {
  const content = images.map((im) => ({
    type: "image",
    source: { type: "base64", media_type: im.mediaType, data: im.base64 },
  }));
  const lines = ["Extrae el ADN de esta marca."];
  if (url) lines.push(`Web: ${url}`);
  if (ig) lines.push(`Instagram: ${ig.startsWith("@") ? ig : "@" + ig}`);
  if (images.length) lines.push(`Te adjunto ${images.length} captura(s) de pantalla (feed de Instagram u otros materiales de la marca). Analiza colores, tipografías, estilo fotográfico, composición y el tono de los textos.`);
  if (notes) lines.push(`Notas del usuario (datos fiables):\n${notes}`);
  lines.push(SECTOR_HINT[tpl] || SECTOR_HINT.auto);
  content.push({ type: "text", text: lines.join("\n\n") });
  return content;
}

let running = false;

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (running) return;
  showError("");

  const key = els.key.value.trim();
  const url = normalizeUrl(els.url.value);
  const ig = els.ig.value.trim();
  const notes = els.notes.value.trim();
  const tpl = els.form.elements.tpl.value;

  if (els.url.value.trim() && !url) return showError("El enlace no parece válido.");
  if (!url && !images.length && !ig) return showError("Añade el enlace de la web o al menos una captura de pantalla.");
  if (!key) return showError("Introduce tu API key de Claude.");
  if (els.remember.checked) store.set(LS_KEY, key); else store.del(LS_KEY);

  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const tools = [];
  if (url || ig) {
    tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 });
    tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 4 });
  }

  const messages = [{ role: "user", content: buildUserContent({ url, ig, notes, tpl }) }];

  running = true;
  els.go.disabled = true;
  els.editor.hidden = true; els.output.hidden = false; els.edit.textContent = "Editar";
  setResult("");
  setOutput("");
  setStatus(url ? "Leyendo la web…" : "Analizando las capturas…");

  let raw = "";
  try {
    for (let turn = 0; turn < 6; turn++) {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: SYSTEM,
        tools: tools.length ? tools : undefined,
        messages,
      });

      stream.on("streamEvent", (ev) => {
        if (ev.type !== "content_block_start") return;
        const b = ev.content_block;
        if (b.type === "server_tool_use") setStatus(b.name === "web_search" ? "Buscando información…" : "Leyendo la web…");
        else if (b.type === "thinking") setStatus("Analizando la marca…");
        else if (b.type === "text") setStatus("Redactando el ADN…");
      });
      stream.on("text", (delta) => { raw += delta; setOutput(cleanResult(raw)); });

      const msg = await stream.finalMessage();

      if (msg.stop_reason === "refusal") {
        throw new Error("El modelo no ha podido procesar esta petición. Prueba con otras capturas o con otra web.");
      }
      if (msg.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: msg.content });
        continue;
      }
      break;
    }

    const text = cleanResult(raw);
    if (!text) throw new Error("No se ha recibido ninguna ficha. Vuelve a intentarlo.");
    setResult(text);
    addHistory(text, url || ig);
  } catch (err) {
    showError(describeError(err));
    if (raw) setResult(cleanResult(raw));
  } finally {
    running = false;
    els.go.disabled = false;
    setStatus("");
  }
});

function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "La API key no es válida.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Tu API key no tiene permiso para este modelo.";
  if (err instanceof Anthropic.RateLimitError) return "Demasiadas peticiones o saldo agotado. Espera un momento y reintenta.";
  if (err instanceof Anthropic.BadRequestError) return "Petición no válida: " + (err.error?.error?.message || err.message);
  if (err instanceof Anthropic.APIConnectionError) return "No hay conexión con la API de Claude. Revisa tu conexión.";
  if (err instanceof Anthropic.APIError) return `Error de la API (${err.status ?? "?"}): ${err.message}`;
  return err?.message || String(err);
}
