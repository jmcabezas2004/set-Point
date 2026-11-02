import { SYSTEM, SECTOR_HINT } from "./prompt.js";
import { extractLocal } from "./local.js";

const MODEL = "claude-opus-5-5";
const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.135.0/+esm";
const MAX_IMAGES = 20;
const MAX_SIDE = 1568;
const LS_KEY = "adn.apiKey";
const LS_HISTORY = "adn.history";
const LS_MODE = "adn.mode";

const $ = (id) => document.getElementById(id);
const els = {
  form: $("form"), url: $("url"), ig: $("ig"), files: $("files"), drop: $("drop"),
  thumbs: $("thumbs"), notes: $("notes"), key: $("key"), remember: $("remember"), ocr: $("ocr"),
  go: $("go"), error: $("error"), warn: $("warn"), status: $("status"), statusText: $("statusText"),
  output: $("output"), editor: $("editor"), swatches: $("swatches"),
  copy: $("copy"), download: $("download"), edit: $("edit"), openClaude: $("openClaude"), resultTitle: $("resultTitle"),
  history: $("history"), historyCard: $("historyCard"), clearHistory: $("clearHistory"),
};

/* ---------- Almacenamiento seguro ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};
els.key.value = store.get(LS_KEY) || "";

/* ---------- Modo ---------- */
const BTN_LABEL = { local: "Extraer ADN gratis", prompt: "Generar prompt para Claude.ai", api: "Extraer ADN con la API" };
function currentMode() { return els.form.elements.mode.value; }
function applyMode() {
  const m = currentMode();
  document.querySelectorAll("[data-mode]").forEach((n) => { n.hidden = n.dataset.mode !== m; });
  els.go.textContent = BTN_LABEL[m];
  store.set(LS_MODE, m);
}
const savedMode = store.get(LS_MODE);
if (savedMode && BTN_LABEL[savedMode]) els.form.elements.mode.value = savedMode;
els.form.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", applyMode));
applyMode();

/* ---------- Imágenes ---------- */
let images = []; // { id, dataUrl, base64, mediaType }

async function addFiles(fileList) {
  const list = [...fileList].filter((f) => f.type.startsWith("image/"));
  for (const file of list) {
    if (images.length >= MAX_IMAGES) { showError(`Máximo ${MAX_IMAGES} imágenes.`); break; }
    try { images.push(await prepareImage(file)); } catch { showError(`No se pudo leer «${file.name}».`); }
  }
  renderThumbs();
}

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.9);
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
  if (e.target === els.editor || e.target === els.notes) return;
  const files = [...(e.clipboardData?.items || [])].filter((i) => i.kind === "file").map((i) => i.getAsFile()).filter(Boolean);
  if (files.length) { e.preventDefault(); addFiles(files); }
});

/* ---------- UI helpers ---------- */
function showError(msg) { els.error.textContent = msg; els.error.hidden = !msg; }
function showWarn(msg) { els.warn.textContent = msg; els.warn.hidden = !msg; }
function setStatus(msg) { els.status.hidden = !msg; if (msg) els.statusText.textContent = msg; }
function setOutput(text) { els.output.textContent = text; els.output.scrollTop = els.output.scrollHeight; }
let currentText = "";
let currentKind = "adn"; // "adn" | "prompt"

function cleanResult(raw) {
  const start = raw.search(/===\s*ADN/i);
  const endMatch = raw.match(/===\s*FIN ADN\s*===/i);
  let text = raw;
  if (start >= 0) text = raw.slice(start, endMatch ? raw.indexOf(endMatch[0]) + endMatch[0].length : undefined);
  return text.replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

function renderSwatches(text) {
  const seen = new Set(); const items = [];
  const re = /(?:^|\n)\s*Color[^:\n]*:\s*([^\n#]*?)\s*#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const hex = "#" + m[2].toUpperCase();
    if (seen.has(hex)) continue;
    seen.add(hex); items.push({ name: m[1].trim(), hex });
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

function setResult(text, kind = "adn") {
  currentText = text; currentKind = kind;
  setOutput(text);
  renderSwatches(kind === "adn" ? text : "");
  els.copy.disabled = els.download.disabled = !text;
  els.copy.textContent = kind === "prompt" ? "Copiar prompt" : "Copiar";
  els.openClaude.hidden = kind !== "prompt";
  els.edit.textContent = kind === "prompt" ? "Pegar resultado de Claude" : "Editar";
  const m = text.match(/^Nombre:\s*(.+)$/m);
  els.resultTitle.textContent = kind === "prompt" ? "Prompt para Claude.ai" : m && !m[1].startsWith("[") ? m[1].split(" - ")[0].trim() : "ADN de la marca";
}

async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = document.createElement("textarea");
    t.value = text; document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
  }
  if (btn.classList.contains("swatch")) return;
  const prev = btn.textContent;
  btn.textContent = "¡Copiado!";
  setTimeout(() => { btn.textContent = prev; }, 1400);
}

els.copy.onclick = () => copyText(currentText, els.copy);
els.download.onclick = () => {
  const name = (els.resultTitle.textContent || "marca").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${currentKind === "prompt" ? "prompt" : "adn"}-${name || "marca"}.txt`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
els.edit.onclick = () => {
  const editing = !els.editor.hidden;
  if (editing) {
    const text = cleanResult(els.editor.value);
    els.editor.hidden = true; els.output.hidden = false;
    setResult(text, "adn");
    if (activeHistoryId && !pastingFromPrompt) updateHistoryEntry(text); else if (text) addHistory(text);
    pastingFromPrompt = false;
  } else {
    pastingFromPrompt = currentKind === "prompt" || !currentText;
    els.editor.value = pastingFromPrompt ? "" : currentText;
    els.editor.placeholder = "Pega aquí la ficha que te ha devuelto Claude.ai (desde === ADN … === hasta === FIN ADN ===).";
    els.editor.style.height = Math.max(320, els.output.offsetHeight) + "px";
    els.editor.hidden = false; els.output.hidden = true; els.edit.textContent = "Guardar";
    els.editor.focus();
  }
};
let pastingFromPrompt = false;

/* ---------- Historial ---------- */
let activeHistoryId = null;
function loadHistory() { try { return JSON.parse(store.get(LS_HISTORY) || "[]"); } catch { return []; } }
function saveHistory(h) { store.set(LS_HISTORY, JSON.stringify(h.slice(0, 30))); renderHistory(); }
function addHistory(text) {
  const h = loadHistory();
  const m = text.match(/^Nombre:\s*(.+)$/m);
  activeHistoryId = crypto.randomUUID();
  h.unshift({ id: activeHistoryId, title: m ? m[1].trim() : "Marca", date: Date.now(), text });
  saveHistory(h);
}
function updateHistoryEntry(text) {
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
    b.onclick = () => { activeHistoryId = e.id; els.editor.hidden = true; els.output.hidden = false; setResult(e.text); window.scrollTo({ top: 0, behavior: "smooth" }); };
    li.append(b);
    return li;
  }));
}
els.clearHistory.onclick = () => { if (confirm("¿Borrar todo el historial?")) { store.del(LS_HISTORY); renderHistory(); } };
renderHistory();

/* ---------- Envío ---------- */
function normalizeUrl(u) {
  u = u.trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).href; } catch { return ""; }
}

let running = false;

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (running) return;
  showError(""); showWarn("");

  const mode = currentMode();
  const input = {
    url: normalizeUrl(els.url.value),
    ig: els.ig.value.trim(),
    notes: els.notes.value.trim(),
    tpl: els.form.elements.tpl.value,
  };
  if (els.url.value.trim() && !input.url) return showError("El enlace no parece válido.");
  if (!input.url && !images.length && !input.ig) return showError("Añade el enlace de la web o al menos una captura de pantalla.");

  running = true;
  els.go.disabled = true;
  els.editor.hidden = true; els.output.hidden = false;
  activeHistoryId = null;
  setResult("");
  try {
    if (mode === "api") await runApi(input);
    else await runLocal(input, mode === "prompt");
  } catch (err) {
    showError(err.userMessage || err?.message || String(err));
  } finally {
    running = false;
    els.go.disabled = false;
    setStatus("");
  }
});

/* ---------- Modo local / prompt ---------- */
async function runLocal(input, asPrompt) {
  setStatus("Analizando…");
  const res = await extractLocal({ ...input, images, ocr: els.ocr.checked, onStatus: setStatus });
  if (res.warnings.length) showWarn(res.warnings.join("\n"));
  if (!asPrompt) {
    setResult(res.text, "adn");
    addHistory(res.text);
    const missing = (res.text.match(/\[completar\]/g) || []).length;
    if (missing) showWarn([...res.warnings, `Quedan ${missing} campos marcados como [completar]. Pulsa «Editar» para rellenarlos, o usa el modo «Prompt para Claude.ai» para que los redacte Claude.`].join("\n"));
    return;
  }
  setResult(buildPrompt(input, res), "prompt");
}

function buildPrompt(input, res) {
  const rules = SYSTEM.split("\nInvestigación:")[0];
  const parts = [
    rules,
    "",
    "---",
    "",
    "Extrae el ADN de esta marca.",
    input.url ? `Web: ${input.url}` : "",
    input.ig ? `Instagram: ${input.ig.startsWith("@") ? input.ig : "@" + input.ig}` : "",
    images.length ? `Te adjunto ${images.length} captura(s) de pantalla (feed de Instagram u otros materiales). Analiza colores, tipografías, estilo fotográfico y el tono de los textos.` : "",
    input.notes ? `Notas (datos fiables):\n${input.notes}` : "",
    SECTOR_HINT[input.tpl] || SECTOR_HINT.auto,
    "",
    "Borrador generado automáticamente a partir de la web (los HEX, tipografías, logo y contactos vienen del código de la web y son fiables; mejora la redacción de propuesta de valor, tono, argumentos y servicios, y completa lo que falte si lo puedes deducir de las fuentes):",
    "",
    res.text,
    res.corpus ? "\nTextos extraídos de la web y de las capturas:\n\n" + res.corpus : "",
  ];
  return parts.filter((p) => p !== "").join("\n");
}

/* ---------- Modo API (de pago) ---------- */
let AnthropicSDK = null;
async function loadSdk() {
  if (!AnthropicSDK) AnthropicSDK = (await import(SDK_URL)).default;
  return AnthropicSDK;
}

async function runApi({ url, ig, notes, tpl }) {
  const key = els.key.value.trim();
  if (!key) throw Object.assign(new Error(), { userMessage: "Introduce tu API key de Claude." });
  if (els.remember.checked) store.set(LS_KEY, key); else store.del(LS_KEY);

  setStatus("Conectando con Claude…");
  let Anthropic;
  try { Anthropic = await loadSdk(); } catch { throw Object.assign(new Error(), { userMessage: "No se pudo cargar la librería de Claude. Revisa tu conexión." }); }
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const tools = [];
  if (url || ig) {
    tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: 8 });
    tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 4 });
  }
  const content = images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mediaType, data: im.base64 } }));
  const lines = ["Extrae el ADN de esta marca."];
  if (url) lines.push(`Web: ${url}`);
  if (ig) lines.push(`Instagram: ${ig.startsWith("@") ? ig : "@" + ig}`);
  if (images.length) lines.push(`Te adjunto ${images.length} captura(s) de pantalla (feed de Instagram u otros materiales de la marca). Analiza colores, tipografías, estilo fotográfico, composición y el tono de los textos.`);
  if (notes) lines.push(`Notas del usuario (datos fiables):\n${notes}`);
  lines.push(SECTOR_HINT[tpl] || SECTOR_HINT.auto);
  content.push({ type: "text", text: lines.join("\n\n") });
  const messages = [{ role: "user", content }];

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
      if (msg.stop_reason === "refusal") throw new Error("El modelo no ha podido procesar esta petición. Prueba con otras capturas o con otra web.");
      if (msg.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: msg.content }); continue; }
      break;
    }
    const text = cleanResult(raw);
    if (!text) throw new Error("No se ha recibido ninguna ficha. Vuelve a intentarlo.");
    setResult(text);
    addHistory(text);
  } catch (err) {
    if (raw) setResult(cleanResult(raw));
    throw Object.assign(err, { userMessage: describeError(Anthropic, err) });
  }
}

function describeError(Anthropic, err) {
  if (err instanceof Anthropic.AuthenticationError) return "La API key no es válida.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Tu API key no tiene permiso para este modelo.";
  if (err instanceof Anthropic.RateLimitError) return "Demasiadas peticiones o saldo agotado. Espera un momento y reintenta.";
  if (err instanceof Anthropic.BadRequestError) return "Petición no válida: " + (err.error?.error?.message || err.message);
  if (err instanceof Anthropic.APIConnectionError) return "No hay conexión con la API de Claude. Revisa tu conexión.";
  if (err instanceof Anthropic.APIError) return `Error de la API (${err.status ?? "?"}): ${err.message}`;
  return err?.message || String(err);
}

