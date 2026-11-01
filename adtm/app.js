/* Generador de publicaciones · ADTM Don Benito
 * Todo se dibuja en un <canvas> de 1080 x 1350 (formato 4:5 de Instagram). */
(() => {
  'use strict';

  const W = 1080, H = 1350;
  const DARK = '#1e489e', LIGHT = '#4395df', MID = '#2961b6', WHITE = '#ffffff';

  const DIVS = {
    dh:  { file: 'DivisionHonor', title: ['DIVISIÓN DE', 'HONOR'], sub: 'DIVISIÓN DE HONOR', team: 'INSPRO DON BENITO', style: 'dh', fed: 'rfetm' },
    n1:  { file: '1aNacional', title: ['1ª NACIONAL'], sub: '1ª NACIONAL', team: 'GRUPO ÁREA DON BENITO', style: 'n1', fed: 'rfetm' },
    d3:  { file: '3aDivision', title: ['3ª DIVISIÓN'], sub: '3ª DIVISIÓN', team: 'GRUPO POLO OPUESTO', style: 'reg', fed: 'fextm' },
    reg: { file: 'Regional', title: ['REGIONAL'], sub: 'REGIONAL', team: 'DON BENITO D', style: 'reg', fed: 'fextm' },
  };

  // Colores de cada división (3ª y Regional comparten estilo).
  const STYLES = {
    dh: {
      bg: WHITE, header: DARK, title: DARK, shadow: 'rgba(30,72,158,.22)', jornada: LIGHT, brush: LIGHT,
      pillBg: DARK, pillInk: WHITE, vs: DARK, boxBg: DARK, boxInk: WHITE, divider: DARK,
      info: DARK, panel: LIGHT, photoPh: '#e3edfa', photoPhInk: DARK, sub: DARK,
    },
    n1: {
      bg: DARK, header: WHITE, title: WHITE, shadow: 'rgba(0,0,0,.30)', jornada: WHITE, brush: '#5ea8f0',
      pillBg: WHITE, pillInk: DARK, vs: WHITE, boxBg: WHITE, boxInk: DARK, divider: WHITE,
      info: WHITE, panel: LIGHT, photoPh: '#2a57b0', photoPhInk: WHITE, sub: WHITE,
    },
    reg: {
      bg: LIGHT, header: WHITE, title: WHITE, shadow: 'rgba(20,55,130,.35)', jornada: WHITE, brush: '#2f74cc',
      pillBg: WHITE, pillInk: DARK, vs: WHITE, boxBg: WHITE, boxInk: DARK, divider: WHITE,
      info: WHITE, panel: MID, photoPh: '#5aa3e6', photoPhInk: WHITE, sub: WHITE,
    },
  };

  const FONT_T = 'Montserrat', FONT_C = 'Oswald';

  /* ---------- Estado ---------- */
  const S = {
    div: 'dh', type: 'cartel', jornada: 1, side: 'home',
    dbName: DIVS.dh.team, rivalName: '',
    shieldSrc: null, shield: null, tolerance: 60, globalKey: false, noRemove: false, shieldScale: 1,
    date: '', time: '11:00', place: '',
    scoreDB: 4, scoreRival: 2,
    photo: null, photoZoom: 1, photoX: .5, photoY: .5,
  };

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const form = document.getElementById('form');
  const $ = (id) => document.getElementById(id);

  /* ---------- Recursos ---------- */
  const ASSETS = {};
  const assetNames = ['rfetm', 'fextm', 'extremadura', 'ayuntamiento', 'donbenito', 'sponsors'];
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  /* ---------- Utilidades de dibujo ---------- */
  function contain(img, cx, cy, maxW, maxH) {
    if (!img) return;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.min(maxW / iw, maxH / ih);
    const w = iw * s, h = ih * s;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  function setFont(weight, size, family) { ctx.font = `${weight} ${size}px ${family}`; }

  function spaced(text, cx, y, spacing) {
    const chars = [...text];
    const ws = chars.map((c) => ctx.measureText(c).width);
    const total = ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let x = cx - total / 2;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => { ctx.fillText(c, x, y); x += ws[i] + spacing; });
    ctx.textAlign = 'center';
    return total;
  }

  function wrap(text, maxW) {
    const lines = [];
    String(text).split('\n').forEach((p) => {
      const words = p.split(/\s+/).filter(Boolean);
      let cur = '';
      words.forEach((w) => {
        const t = cur ? cur + ' ' + w : w;
        if (!cur || ctx.measureText(t).width <= maxW) cur = t;
        else { lines.push(cur); cur = w; }
      });
      if (cur) lines.push(cur);
    });
    return lines;
  }

  function fit(text, weight, family, maxSize, minSize, maxW, maxH, lh, maxLines) {
    for (let size = maxSize; size >= minSize; size -= 1) {
      setFont(weight, size, family);
      const lines = wrap(text, maxW);
      if (lines.length <= maxLines && lines.length * size * lh <= maxH &&
          lines.every((l) => ctx.measureText(l).width <= maxW)) return { size, lines };
    }
    setFont(weight, minSize, family);
    return { size: minSize, lines: wrap(text, maxW) };
  }

  function drawLines(lines, cx, cy, size, lh) {
    const total = lines.length * size * lh;
    let y = cy - total / 2 + (size * lh) / 2;
    ctx.textBaseline = 'middle';
    lines.forEach((l) => { ctx.fillText(l, cx, y); y += size * lh; });
    ctx.textBaseline = 'alphabetic';
  }

  function roundPoly(pts, r) {
    const n = pts.length;
    ctx.beginPath();
    const a = pts[n - 1], b = pts[0];
    ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.arcTo(p[0], p[1], q[0], q[1], r);
    }
    ctx.closePath();
  }

  function roundRect(x, y, w, h, r) {
    roundPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r);
  }

  function pill(x, y, w, h, skew, r) {
    roundPoly([[x + skew, y], [x + w, y], [x + w - skew, y + h], [x, y + h]], r);
  }

  // Generador pseudoaleatorio con semilla: la pincelada siempre sale igual.
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function brush(cx, y, w, color) {
    const r = rng(7);
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y + 4);
    ctx.quadraticCurveTo(cx - w * 0.1, y - 8, cx + w / 2, y - 3);
    ctx.quadraticCurveTo(cx + w * 0.1, y + 6, cx - w / 2, y + 4);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const yy = y + (r() - 0.5) * 14;
      const x0 = cx - w / 2 + r() * w * 0.3;
      const x1 = cx + w / 2 - r() * w * 0.2;
      ctx.globalAlpha = 0.12 + r() * 0.35;
      ctx.lineWidth = 0.8 + r() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x0, yy + (r() - 0.5) * 3);
      ctx.quadraticCurveTo(cx, yy - 4, x1, yy + (r() - 0.5) * 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function shadowText(text, x, y, color, shadow, off) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + off, y + off);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /* ---------- Iconos ---------- */
  function iconCalendar(cx, cy, s, c) {
    ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const x = cx - s / 2, y = cy - s / 2 + 5, w = s, h = s - 8;
    roundRect(x, y, w, h, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.lineTo(x + w, y + 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w * 0.28, y - 6); ctx.lineTo(x + w * 0.28, y + 4);
    ctx.moveTo(x + w * 0.72, y - 6); ctx.lineTo(x + w * 0.72, y + 4); ctx.stroke();
    const d = 6.5;
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
      ctx.fillRect(x + 8 + k * ((w - 16 - d) / 3), y + 21 + r * 11, d, d);
    }
    ctx.restore();
  }

  function iconClock(cx, cy, s, c) {
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 3, cy - s * 0.28); ctx.lineTo(cx - 3, cy + 4); ctx.lineTo(cx + s * 0.2, cy + 4); ctx.stroke();
    ctx.restore();
  }

  function iconPin(cx, cy, s, c) {
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    const r = s * 0.36, top = cy - s * 0.12;
    ctx.beginPath();
    ctx.arc(cx, top, r, Math.PI * 0.82, Math.PI * 2.18);
    ctx.lineTo(cx, cy + s / 2);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, top, r * 0.38, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* ---------- Bloques comunes ---------- */
  function drawHeader(st, div) {
    ctx.fillStyle = st.header;
    ctx.fillRect(0, 0, W, 172);
    if (div.fed === 'rfetm') contain(ASSETS.rfetm, 300, 86, 200, 98);
    else contain(ASSETS.fextm, 290, 84, 250, 86);
    contain(ASSETS.extremadura, 540, 86, 150, 146);
    contain(ASSETS.ayuntamiento, 765, 86, 140, 150);
  }

  function drawJornada(st, y) {
    ctx.fillStyle = st.jornada;
    ctx.textAlign = 'center';
    setFont(400, 46, FONT_T);
    spaced(`JORNADA ${S.jornada || ''}`.trim(), W / 2, y, 3);
    brush(W / 2, y + 42, 420, st.brush);
  }

  function drawSponsors(st) {
    const x = 14, y = 1078, w = W - 28, h = 258;
    ctx.fillStyle = st.panel;
    roundRect(x, y, w, h, 42); ctx.fill();
    ctx.fillStyle = WHITE; ctx.strokeStyle = WHITE; ctx.lineWidth = 3;
    setFont(600, 19, FONT_T);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = spaced('PATROCINADORES', W / 2, y + 22, 5);
    ctx.textBaseline = 'alphabetic';
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 21); ctx.lineTo(W / 2 - tw / 2 - 16, y + 21);
    ctx.moveTo(W / 2 + tw / 2 + 16, y + 21); ctx.lineTo(x + w - 24, y + 21);
    ctx.stroke();
    contain(ASSETS.sponsors, W / 2, y + 140, w - 60, 196);
  }

  function shieldPlaceholder(cx, cy, size, st) {
    ctx.save();
    ctx.strokeStyle = st.vs; ctx.globalAlpha = 0.45; ctx.lineWidth = 4; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = st.vs; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    setFont(700, Math.round(size * 0.13), FONT_T);
    ctx.fillText('ESCUDO', cx, cy - size * 0.07); ctx.fillText('RIVAL', cx, cy + size * 0.09);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }

  function teams() {
    const db = { name: S.dbName || DIVS[S.div].team, logo: ASSETS.donbenito, isDB: true };
    const rv = { name: S.rivalName || 'RIVAL', logo: S.shield, isDB: false };
    return S.side === 'home' ? [db, rv] : [rv, db];
  }

  function drawPillName(name, x, y, w, h, skew, st, maxSize) {
    ctx.fillStyle = st.pillBg;
    pill(x, y, w, h, skew, Math.min(28, h / 2.6)); ctx.fill();
    ctx.fillStyle = st.pillInk; ctx.textAlign = 'center';
    const pad = skew + 18;
    const f = fit(name.toUpperCase(), 700, FONT_C, maxSize, 16, w - pad * 2, h - 18, 1.05, 3);
    drawLines(f.lines, x + w / 2, y + h / 2 + 1, f.size, 1.05);
  }

  function drawLogo(team, cx, cy, maxW, maxH, st, scale) {
    if (team.logo) contain(team.logo, cx, cy, maxW * scale, maxH * scale);
    else shieldPlaceholder(cx, cy, Math.min(maxW, maxH) * 0.85, st);
  }

  /* ---------- Cartel del partido ---------- */
  function drawCartel(st, div) {
    // Título
    ctx.textAlign = 'center';
    if (div.title.length === 1) {
      const f = fit(div.title[0], 900, FONT_T, 134, 60, 960, 200, 1, 1);
      setFont(900, f.size, FONT_T);
      shadowText(div.title[0], W / 2, 450, st.title, st.shadow, 6);
    } else {
      setFont(900, 98, FONT_T);
      shadowText(div.title[0], W / 2, 372, st.title, st.shadow, 5);
      shadowText(div.title[1], W / 2, 466, st.title, st.shadow, 5);
    }

    // Escudos
    const [L, R] = teams();
    const cy = 638;
    drawLogo(L, 262, cy, L.isDB ? 390 : 290, L.isDB ? 270 : 250, st, L.isDB ? 1 : S.shieldScale);
    drawLogo(R, 818, cy, R.isDB ? 390 : 290, R.isDB ? 270 : 250, st, R.isDB ? 1 : S.shieldScale);

    // Nombres
    const py = 786, ph = 122, pw = 434, skew = 40;
    drawPillName(L.name, 42, py, pw, ph, skew, st, 46);
    drawPillName(R.name, W - 42 - pw, py, pw, ph, skew, st, 46);

    // VS con barra diagonal
    ctx.save();
    ctx.strokeStyle = st.vs; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(582, 762); ctx.lineTo(558, 812);
    ctx.moveTo(522, 884); ctx.lineTo(498, 934);
    ctx.stroke();
    ctx.fillStyle = st.vs; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.setTransform(1, 0, -0.22, 1, 0, 0);
    setFont(700, 56, FONT_C);
    ctx.fillText('VS', 540 + 0.22 * 848, 848);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';

    // Fecha, hora y lugar
    const items = [];
    if (S.date) {
      const [y, m, d] = S.date.split('-');
      items.push({ icon: iconCalendar, label: 'FECHA', value: `${d} / ${m} / ${y}` });
    }
    if (S.time) items.push({ icon: iconClock, label: 'HORA', value: `${S.time} H` });
    if (S.place.trim()) items.push({ icon: iconPin, label: 'LUGAR', value: S.place.trim().toUpperCase() });
    drawInfo(items, st);
  }

  function drawInfo(items, st) {
    if (!items.length) return;
    const iconW = 56, gapIcon = 18, y = 1000;
    const maxValW = items.length === 3 ? 280 : 360;
    items.forEach((it) => {
      setFont(600, 21, FONT_T);
      it.lines = wrap(it.value, maxValW).slice(0, 2);
      it.valW = Math.max(...it.lines.map((l) => ctx.measureText(l).width));
      setFont(700, 26, FONT_T);
      it.labW = ctx.measureText(it.label).width;
      it.w = iconW + gapIcon + Math.max(it.valW, it.labW);
    });
    const total = items.reduce((a, b) => a + b.w, 0);
    const gap = Math.max(30, (W - 140 - total) / (items.length + 1));
    let x = (W - (total + gap * (items.length - 1))) / 2;
    ctx.textAlign = 'left';
    items.forEach((it) => {
      it.icon(x + iconW / 2, y, iconW, st.info);
      const tx = x + iconW + gapIcon;
      ctx.fillStyle = st.info;
      setFont(700, 26, FONT_T);
      ctx.fillText(it.label, tx, y - 6);
      ctx.fillRect(tx, y - 1, it.labW, 2.5);
      setFont(600, 21, FONT_T);
      it.lines.forEach((l, i) => ctx.fillText(l, tx, y + 28 + i * 24));
      x += it.w + gap;
    });
    ctx.textAlign = 'center';
  }

  /* ---------- Resultado ---------- */
  const PHOTO = { x: 192, y: 616, w: 696, h: 442, r: 28 };

  function drawResultado(st, div) {
    ctx.textAlign = 'center';
    const f = fit('RESULTADO', 900, FONT_T, 90, 50, 640, 120, 1, 1);
    setFont(900, f.size, FONT_T);
    shadowText('RESULTADO', W / 2, 334, st.title, st.shadow, 5);
    ctx.fillStyle = st.sub;
    setFont(500, 31, FONT_T);
    spaced(div.sub, W / 2, 382, 1.5);

    const [L, R] = teams();
    const sL = S.side === 'home' ? S.scoreDB : S.scoreRival;
    const sR = S.side === 'home' ? S.scoreRival : S.scoreDB;

    drawLogo(L, 246, 446, L.isDB ? 230 : 170, L.isDB ? 124 : 118, st, L.isDB ? 1 : S.shieldScale);
    drawLogo(R, 834, 446, R.isDB ? 230 : 170, R.isDB ? 124 : 118, st, R.isDB ? 1 : S.shieldScale);

    drawPillName(L.name, 116, 516, 262, 70, 24, st, 30);
    drawPillName(R.name, W - 116 - 262, 516, 262, 70, 24, st, 30);

    // Marcador
    const bw = 112, bh = 120, by = 450;
    [[540 - 40 - bw, sL], [540 + 40, sR]].forEach(([bx, v]) => {
      ctx.fillStyle = st.boxBg;
      roundRect(bx, by, bw, bh, 22); ctx.fill();
      ctx.fillStyle = st.boxInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const txt = String(v ?? '');
      setFont(700, txt.length > 1 ? 74 : 92, FONT_C);
      ctx.fillText(txt, bx + bw / 2, by + bh / 2 + 4);
      ctx.textBaseline = 'alphabetic';
    });
    ctx.fillStyle = st.divider;
    ctx.fillRect(538, by + 6, 4, bh - 12);

    drawPhoto(st);
  }

  function photoGeom() {
    const img = S.photo;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(PHOTO.w / iw, PHOTO.h / ih) * S.photoZoom;
    const dw = iw * s, dh = ih * s;
    return { dw, dh, ox: dw - PHOTO.w, oy: dh - PHOTO.h };
  }

  function drawPhoto(st) {
    const { x, y, w, h, r } = PHOTO;
    ctx.save();
    roundRect(x, y, w, h, r); ctx.clip();
    if (S.photo) {
      const g = photoGeom();
      ctx.drawImage(S.photo, x - g.ox * S.photoX, y - g.oy * S.photoY, g.dw, g.dh);
    } else {
      ctx.fillStyle = st.photoPh; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = st.photoPhInk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      setFont(600, 30, FONT_T);
      ctx.fillText('Añade la foto de los equipos', x + w / 2, y + h / 2);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }

  /* ---------- Render ---------- */
  let queued = false;
  function render() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const div = DIVS[S.div], st = STYLES[div.style];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = st.bg; ctx.fillRect(0, 0, W, H);
      drawHeader(st, div);
      if (S.type === 'cartel') {
        drawJornada(st, 238);
        drawCartel(st, div);
      } else {
        drawJornada(st, 214);
        drawResultado(st, div);
      }
      drawSponsors(st);
    });
  }

  /* ---------- Quitar fondo de escudos ---------- */
  function removeBackground(img, tol, global, skip) {
    const max = 900;
    let w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const data = g.getImageData(0, 0, w, h);
    const p = data.data;

    // Píxeles del borde
    const border = [];
    for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
    const transparentBorder = border.filter((i) => p[i * 4 + 3] < 20).length / border.length;

    if (!skip && transparentBorder < 0.3) {
      // Color de fondo: mediana de los píxeles del borde
      const med = (ch) => { const v = border.map((i) => p[i * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
      const bg = [med(0), med(1), med(2)];
      const t1 = tol, t0 = tol * 0.45;
      const n = w * h;
      const dist = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const dr = p[i * 4] - bg[0], dg = p[i * 4 + 1] - bg[1], db = p[i * 4 + 2] - bg[2];
        dist[i] = Math.sqrt(dr * dr + dg * dg + db * db);
      }
      let isBg;
      if (global) {
        isBg = null;
      } else {
        // Relleno desde los bordes: sólo se borra el fondo conectado con el exterior
        isBg = new Uint8Array(n);
        const stack = [];
        border.forEach((i) => { if (dist[i] <= t1) { isBg[i] = 1; stack.push(i); } });
        while (stack.length) {
          const i = stack.pop();
          const x = i % w, y = (i / w) | 0;
          const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
          for (const j of nb) if (j >= 0 && !isBg[j] && dist[j] <= t1) { isBg[j] = 1; stack.push(j); }
        }
      }
      for (let i = 0; i < n; i++) {
        if (isBg && !isBg[i]) continue;
        const a = Math.min(1, Math.max(0, (dist[i] - t0) / (t1 - t0)));
        const o = i * 4;
        if (a <= 0) { p[o + 3] = 0; continue; }
        // Elimina el halo del color de fondo en los bordes suaves
        for (let ch = 0; ch < 3; ch++) p[o + ch] = Math.min(255, Math.max(0, (p[o + ch] - bg[ch] * (1 - a)) / a));
        p[o + 3] = Math.round(p[o + 3] * a);
      }
      g.putImageData(data, 0, 0);
    }

    // Recorta los márgenes transparentes
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (p[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return c;
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function processShield() {
    if (!S.shieldSrc) { S.shield = null; $('shieldBox').hidden = true; render(); return; }
    S.shield = removeBackground(S.shieldSrc, S.tolerance, S.globalKey, S.noRemove);
    const url = S.shield.toDataURL('image/png');
    $('shieldPreview').src = url;
    $('shieldDownload').href = url;
    $('shieldDownload').download = `escudo-${slug(S.rivalName || 'rival')}.png`;
    $('shieldBox').hidden = false;
    render();
  }

  function slug(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'rival';
  }

  function readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => loadImg(r.result).then(res, rej);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  /* ---------- Rivales guardados (en este navegador) ---------- */
  const KEY = 'adtm-rivales-v1';
  const getRivals = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const setRivals = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } };

  function refreshRivals(selected) {
    const sel = $('rivalSelect');
    const list = getRivals().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    sel.innerHTML = '<option value="">— Elegir —</option>' +
      list.map((r) => `<option value="${encodeURIComponent(r.name)}">${r.name.replace(/</g, '&lt;')}</option>`).join('');
    if (selected) sel.value = encodeURIComponent(selected);
  }

  function shieldForStorage() {
    if (!S.shield) return null;
    const max = 500, c = S.shield, k = Math.min(1, max / Math.max(c.width, c.height));
    const o = document.createElement('canvas');
    o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
    o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }

  $('saveRival').addEventListener('click', () => {
    const name = S.rivalName.trim().toUpperCase();
    if (!name) { alert('Escribe el nombre del rival antes de guardarlo.'); return; }
    const list = getRivals().filter((r) => r.name !== name);
    list.push({ name, shield: shieldForStorage() });
    if (!setRivals(list)) { alert('No se ha podido guardar (almacenamiento del navegador no disponible).'); return; }
    refreshRivals(name);
  });

  $('deleteRival').addEventListener('click', () => {
    const v = decodeURIComponent($('rivalSelect').value || '');
    if (!v) return;
    if (!confirm(`¿Borrar «${v}» de los rivales guardados?`)) return;
    setRivals(getRivals().filter((r) => r.name !== v));
    refreshRivals();
  });

  $('rivalSelect').addEventListener('change', async (e) => {
    const name = decodeURIComponent(e.target.value || '');
    const r = getRivals().find((x) => x.name === name);
    if (!r) return;
    S.rivalName = r.name;
    form.rivalName.value = r.name;
    if (r.shield) {
      S.shieldSrc = await loadImg(r.shield);
      form.noRemove.checked = S.noRemove = true; // ya está sin fondo
      processShield();
    } else {
      S.shieldSrc = null; processShield();
    }
  });

  /* ---------- Formulario ---------- */
  function syncVisibility() {
    document.querySelectorAll('.only-cartel').forEach((el) => { el.hidden = S.type !== 'cartel'; });
    document.querySelectorAll('.only-resultado').forEach((el) => { el.hidden = S.type !== 'resultado'; });
    $('dragHint').hidden = !(S.type === 'resultado' && S.photo);
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.name) return;
    const v = t.type === 'checkbox' ? t.checked : t.value;
    switch (t.name) {
      case 'div':
        S.div = v; S.dbName = DIVS[v].team; form.dbName.value = S.dbName; break;
      case 'jornada': case 'scoreDB': case 'scoreRival':
        S[t.name] = v === '' ? '' : parseInt(v, 10); break;
      case 'tolerance':
        S.tolerance = +v; $('tolOut').textContent = v; break;
      case 'shieldScale': case 'photoZoom': case 'photoX': case 'photoY':
        S[t.name] = +v; break;
      default:
        S[t.name] = v;
    }
    if (t.name === 'dbName' || t.name === 'rivalName') S[t.name] = String(v).toUpperCase();
    if (['tolerance', 'globalKey', 'noRemove'].includes(t.name)) processShield();
    syncVisibility();
    render();
  });

  $('shieldFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      S.shieldSrc = await readFile(f);
      S.noRemove = false; form.noRemove.checked = false;
      processShield();
    } catch { alert('No se ha podido leer la imagen del escudo.'); }
    e.target.value = '';
  });

  $('photoFile').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      S.photo = await readFile(f);
      S.photoZoom = 1; S.photoX = 0.5; S.photoY = 0.5;
      form.photoZoom.value = 1; form.photoX.value = 0.5; form.photoY.value = 0.5;
      syncVisibility(); render();
    } catch { alert('No se ha podido leer la foto.'); }
    e.target.value = '';
  });

  // Arrastrar la foto directamente sobre la vista previa
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (S.type !== 'resultado' || !S.photo) return;
    const p = toCanvas(e);
    if (p.x < PHOTO.x || p.x > PHOTO.x + PHOTO.w || p.y < PHOTO.y || p.y > PHOTO.y + PHOTO.h) return;
    drag = { p, x: S.photoX, y: S.photoY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e), g = photoGeom();
    if (g.ox > 0) S.photoX = Math.min(1, Math.max(0, drag.x - (p.x - drag.p.x) / g.ox));
    if (g.oy > 0) S.photoY = Math.min(1, Math.max(0, drag.y - (p.y - drag.p.y) / g.oy));
    form.photoX.value = S.photoX; form.photoY.value = S.photoY;
    render();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ---------- Exportar ---------- */
  function fileName() {
    const tipo = S.type === 'cartel' ? 'Cartel' : 'Resultado';
    return `J${S.jornada || ''}_${DIVS[S.div].file}_${tipo}.png`;
  }
  const toBlob = () => new Promise((res) => canvas.toBlob(res, 'image/png'));

  $('downloadBtn').addEventListener('click', async () => {
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });

  try {
    const test = new File([new Blob()], 'x.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [test] })) $('shareBtn').hidden = false;
  } catch { /* sin Web Share */ }

  $('shareBtn').addEventListener('click', async () => {
    const blob = await toBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    try { await navigator.share({ files: [file] }); } catch { /* cancelado */ }
  });

  /* ---------- Inicio ---------- */
  function initForm() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    S.date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    form.date.value = S.date;
    form.dbName.value = S.dbName;
    refreshRivals();
    syncVisibility();
  }

  async function init() {
    initForm();
    render();
    await Promise.all(assetNames.map((n) => loadImg(`assets/${n}.png`).then((i) => { ASSETS[n] = i; }).catch(() => {})));
    render();
    if (document.fonts) {
      const specs = ['400 46px Montserrat', '500 31px Montserrat', '600 21px Montserrat', '700 26px Montserrat', '900 100px Montserrat', '700 40px Oswald'];
      await Promise.all(specs.map((s) => document.fonts.load(s, 'ÁÉÍÓÚÑª0123456789AZ').catch(() => {})));
      render();
      document.fonts.ready.then(render);
    }
  }
  init();
})();
