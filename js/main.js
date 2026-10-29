/* =========================================================
   SET POINT · Interacciones
   ========================================================= */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- NAV ---------- */
  const nav = $('#nav');
  const burger = $('#burger');
  const links = $('#navLinks');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const closeMenu = () => {
    burger.setAttribute('aria-expanded', 'false');
    links.classList.remove('is-open');
    nav.classList.remove('menu-open');
  };
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    nav.classList.toggle('menu-open', open);
  });
  $$('a', links).forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- MARCADOR DE SCROLL ----------
     Cada sección visitada suma un punto; el "rival" va un poco por detrás.
     Al llegar a 10 puntos: ¡SET POINT! */
  const scoreYou = $('#scoreYou');
  const scoreRival = $('#scoreRival');
  const board = $('.scoreboard');
  const toast = $('#setpointToast');
  const seen = new Set();
  const sections = $$('[data-score]');
  const pad = n => String(n).padStart(2, '0');
  let toasted = false;

  const scoreIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const idx = sections.indexOf(e.target);
      if (idx > 0) seen.add(idx);
      const you = Math.min(seen.size, 10);
      scoreYou.textContent = pad(you);
      scoreRival.textContent = pad(Math.max(0, Math.floor(you * 0.7)));
      board.classList.remove('bump'); void board.offsetWidth; board.classList.add('bump');
      if (you >= 10 && !toasted) {
        toasted = true;
        $('.scoreboard__label').textContent = 'SET POINT';
        if (!reduceMotion) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1900); }
      }
      // enlace activo
      const id = e.target.id;
      $$('a', links).forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    });
  }, { threshold: 0.35 });
  sections.forEach(s => scoreIO.observe(s));

  /* ---------- REVEAL ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', `${Math.min(sib.indexOf(el), 5) * 0.08}s`);
    revealIO.observe(el);
  });

  /* ---------- CONTADORES ---------- */
  const fmt = new Intl.NumberFormat('es-ES');
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const end = +e.target.dataset.count;
      if (reduceMotion) { e.target.textContent = fmt.format(end); return; }
      const dur = 1600, t0 = performance.now();
      const step = t => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        e.target.textContent = fmt.format(Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- TILT EN TARJETAS ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', ev => {
        const r = card.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 10}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- BOTONES MAGNÉTICOS ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('.btn').forEach(btn => {
      btn.addEventListener('pointermove', ev => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * 0.15}px, ${(ev.clientY - r.top - r.height / 2) * 0.25}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- TABS DE SEGMENTOS ---------- */
  const tabs = $$('.segtab');
  const selectTab = (i, focus) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = $('#' + t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', ev => {
      const k = ev.key;
      if (['ArrowRight', 'ArrowDown'].includes(k)) { ev.preventDefault(); selectTab((i + 1) % tabs.length, true); }
      if (['ArrowLeft', 'ArrowUp'].includes(k)) { ev.preventDefault(); selectTab((i - 1 + tabs.length) % tabs.length, true); }
    });
  });

  /* ---------- CATÁLOGO (contenido de la tienda Set Point) ---------- */
  const IMG = 'assets/img/';
  const PRODUCTS = [
    { id: 'goma-tenergy64', cat: 'gomas', name: 'Goma Butterfly Tenergy 64', price: 54.99, img: 'goma-tenergy64.jpg', desc: 'La más rápida de la colección Tenergy. Diseñada para imprimir efecto.', specs: ['Rojo / Negro'] },
    { id: 'goma-rozena', cat: 'gomas', name: 'Goma Butterfly Rozena', price: 39.99, img: 'goma-rozena.jpg', desc: 'La más adecuada para jugadores de nivel intermedio, con un control y velocidad perfectos.', specs: ['Rojo / Negro'] },
    { id: 'goma-dignics09c', cat: 'gomas', name: 'Goma Butterfly Dignics 09c', price: 49.99, img: 'goma-dignics09c.jpg', desc: 'Diseñada para ofrecer una dureza y velocidad como nunca antes. Difícil de manejar pero con unas prestaciones extraordinarias.', specs: ['Rojo / Negro'], tag: 'Destacado' },
    { id: 'madera-timoboll-zlc', cat: 'maderas', name: 'Madera Butterfly Timo Boll ZLC', price: 184.90, img: 'madera-timoboll-zlc.jpg', desc: 'Ideal para jugadores muy ofensivos.', specs: ['≈ 90 g', 'Ofensiva'] },
    { id: 'madera-viscaria', cat: 'maderas', name: 'Madera Butterfly Viscaria', price: 164.90, img: 'madera-viscaria.jpg', desc: 'Combina velocidad y control, óptima para jugadores ofensivos.', specs: ['≈ 90 g', 'Ofensiva'] },
    { id: 'madera-innershield', cat: 'maderas', name: 'Madera Butterfly Innershield Layer', price: 174.90, img: 'madera-innershield.jpg', desc: 'Diseñada para jugadores defensivos, con gran control.', specs: ['≈ 95 g', 'Defensiva'] },
    { id: 'camiseta-hombre-seleccion', cat: 'textil', name: 'Camiseta Hombre Selección Española 25/26', price: 24.90, img: 'camiseta-hombre-seleccion.jpg', photo: true, desc: 'Luce los colores del equipo nacional.', specs: ['Rojo / Negro'], tag: 'Novedad' },
    { id: 'camiseta-mujer-seleccion', cat: 'textil', name: 'Camiseta Mujer Selección Española 25/26', price: 24.90, img: 'camiseta-mujer-seleccion.jpg', photo: true, desc: 'Luce los colores del equipo nacional.', specs: ['Rojo / Negro'], tag: 'Novedad' },
    { id: 'camiseta-circulo-mercantil', cat: 'textil', name: 'Camiseta Unisex Círculo Mercantil Sevilla 25/26', price: 29.90, img: 'camiseta-circulo-mercantil.jpg', photo: true, desc: 'La equipación del club sevillano.', specs: ['Negro / Azul'] },
    { id: 'zapatilla-vilata', cat: 'calzado', name: 'Zapatillas Butterfly Vilata', price: 89.90, img: 'zapatilla-vilata.jpg', desc: 'Agarre y estabilidad para moverte rápido junto a la mesa.', specs: ['Blanco / Azul'] },
    { id: 'zapatilla-lezoline-match2', cat: 'calzado', name: 'Zapatilla Butterfly Lezoline Match II', price: 99.90, img: 'zapatilla-lezoline-match2.jpg', desc: 'Para jugar a un ritmo diferente.', specs: ['Azul'] },
    { id: 'zapatilla-lezoline-rifones', cat: 'calzado', name: 'Zapatilla Butterfly Lezoline Rifones', price: 114.90, img: 'zapatilla-lezoline-rifones.jpg', desc: 'Para jugar a un ritmo diferente.', specs: ['Negro'] }
  ];
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const FREE_SHIP = 50;

  const CATS = {
    todo: { img: 'hero-home.jpg', t: 'Tu tienda especialista en tenis de mesa', p: 'Contamos con una amplia gama de maderas, gomas, camisetas y calzado. Nuestro objetivo es llevar tu juego al siguiente nivel.' },
    gomas: { img: 'cat-gomas.jpg', t: 'Tenemos las mejores gomas para ti', p: 'Contamos con gomas diseñadas para todo tipo de jugadores. No lo dudes y haz tu pedido para que tus golpes dejen huella.' },
    maderas: { img: 'cat-maderas.jpg', t: 'Hazte con la madera de tus sueños', p: 'Contamos con las mejores maderas del mercado. Rápidas y ligeras, perfectas para jugadores ofensivos, además de otras ideales para un estilo defensivo. ¡Elige tu madera y lánzate a la competición!' },
    textil: { img: 'cat-textil.jpg', t: 'Hazte con las mejores camisetas', p: 'Contamos con las equipaciones de una gran variedad de clubes y marcas. ¡Elige la tuya y salta a la pista para escribir tu nombre en la historia de nuestro deporte!' },
    calzado: { img: 'cat-calzado.jpg', t: 'Tenemos el mejor calzado para ti', p: 'Te ofrecemos el mejor calzado para todos aquellos jugadores que busquen jugar a un ritmo diferente, porque para nosotros sois diferentes al resto.' }
  };

  /* ---------- TIENDA ---------- */
  const grid = $('#shopGrid');
  const banner = $('#shopBanner');
  const chips = $$('.chip');
  let currentCat = 'todo';

  const itemHTML = (p, i) => `
    <article class="item${p.photo ? ' item--photo' : ''}" style="--i:${i * 0.05}s">
      <div class="item__media">
        <img src="${IMG + p.img}" alt="${p.name}" loading="lazy">
        ${p.tag ? `<span class="item__tag${p.tag === 'Destacado' ? ' item__tag--hot' : ''}">${p.tag}</span>` : ''}
      </div>
      <div class="item__body">
        <h3>${p.name}</h3>
        <p class="item__desc">${p.desc}</p>
        <div class="item__specs">${p.specs.map(s => `<span>${s}</span>`).join('')}</div>
        <div class="item__foot">
          <span class="item__price">${eur.format(p.price)}</span>
          <button class="addbtn" data-add="${p.id}" aria-label="Añadir ${p.name} al carrito">Añadir</button>
        </div>
      </div>
    </article>`;

  const setCat = cat => {
    currentCat = cat;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
    const list = cat === 'todo' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
    grid.innerHTML = list.map(itemHTML).join('');
    const c = CATS[cat];
    banner.classList.add('is-swapping');
    setTimeout(() => {
      $('#shopBannerImg').src = IMG + c.img;
      $('#shopBannerTitle').textContent = c.t;
      $('#shopBannerText').textContent = c.p;
      banner.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 250);
  };
  chips.forEach(c => c.addEventListener('click', () => setCat(c.dataset.cat)));
  $$('[data-goto-cat]').forEach(a => a.addEventListener('click', () => setCat(a.dataset.gotoCat)));
  grid.innerHTML = PRODUCTS.map(itemHTML).join('');

  /* ---------- CARRITO ---------- */
  const cartEl = $('#cart');
  const cartBtn = $('#cartBtn');
  const backdrop = $('#cartBackdrop');
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem('setpoint-cart')) || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(id => { if (!byId[id]) delete cart[id]; });
  const save = () => { try { localStorage.setItem('setpoint-cart', JSON.stringify(cart)); } catch (e) { /* sin almacenamiento */ } };

  const renderCart = () => {
    const ids = Object.keys(cart);
    const count = ids.reduce((a, id) => a + cart[id], 0);
    const total = ids.reduce((a, id) => a + cart[id] * byId[id].price, 0);
    $('#cartCount').textContent = count;
    cartBtn.classList.toggle('has-items', count > 0);
    cartBtn.setAttribute('aria-label', `Abrir carrito (${count} ${count === 1 ? 'producto' : 'productos'})`);
    $('#cartItems').innerHTML = ids.map(id => {
      const p = byId[id];
      return `<li>
        <img src="${IMG + p.img}" alt="">
        <div><b>${p.name}</b><small>${eur.format(p.price)}</small>
          <div class="qty"><button data-qty="${id}" data-d="-1" aria-label="Quitar una unidad">−</button><span>${cart[id]}</span><button data-qty="${id}" data-d="1" aria-label="Añadir una unidad">+</button></div>
        </div>
        <span class="cart__line">${eur.format(cart[id] * p.price)}</span>
      </li>`;
    }).join('');
    $('#cartEmpty').hidden = count > 0;
    $('#cartTotal').textContent = eur.format(total);
    const left = FREE_SHIP - total;
    cartEl.classList.toggle('is-free', left <= 0);
    $('#cartShipText').textContent = count === 0
      ? `Envío gratis a domicilio en compras superiores a ${eur.format(FREE_SHIP)}.`
      : left > 0 ? `Añade ${eur.format(left)} más y el envío es gratis.` : '¡Genial! Tu envío estándar es gratis.';
    $('#cartShipBar').style.width = `${Math.min(100, (total / FREE_SHIP) * 100)}%`;
    const checkout = $('#cartCheckout');
    checkout.setAttribute('aria-disabled', String(count === 0));
    const lines = ids.map(id => `- ${cart[id]} x ${byId[id].name} (${eur.format(byId[id].price)})`).join('\n');
    const body = `Hola, Set Point:\n\nMe gustaría hacer este pedido:\n\n${lines}\n\nSubtotal: ${eur.format(total)}\n\nNombre:\nDirección de envío:\nTeléfono:\n\nGracias.`;
    checkout.href = `mailto:setpoint.inf@gmail.com?subject=${encodeURIComponent('Pedido web Set Point')}&body=${encodeURIComponent(body)}`;
  };

  let lastFocus = null;
  const openCart = () => {
    lastFocus = document.activeElement;
    cartEl.classList.add('is-open');
    cartEl.setAttribute('aria-hidden', 'false');
    cartBtn.setAttribute('aria-expanded', 'true');
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#cartClose').focus(), 50);
  };
  const closeCart = () => {
    cartEl.classList.remove('is-open');
    cartEl.setAttribute('aria-hidden', 'true');
    cartBtn.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  cartBtn.addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cartEl.classList.contains('is-open')) closeCart(); });
  $('#cartItems').addEventListener('click', e => {
    const b = e.target.closest('[data-qty]');
    if (!b) return;
    const id = b.dataset.qty;
    cart[id] = (cart[id] || 0) + +b.dataset.d;
    if (cart[id] <= 0) delete cart[id];
    save(); renderCart();
  });

  // La bola vuela en parábola hasta el carrito
  const flyToCart = from => {
    const target = cartBtn.getBoundingClientRect();
    const r = from.getBoundingClientRect();
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const x1 = target.left + target.width / 2, y1 = target.top + target.height / 2;
    if (reduceMotion || !Element.prototype.animate) return Promise.resolve();
    const ball = document.createElement('div');
    ball.className = 'flyball';
    document.body.appendChild(ball);
    const peak = Math.min(y0, y1) - 140;
    const frames = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = x0 + (x1 - x0) * t;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * peak + t * t * y1;
      frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 - t * 0.4})`, offset: t });
    }
    ball.style.left = '0'; ball.style.top = '0';
    return ball.animate(frames, { duration: 750, easing: 'cubic-bezier(.3,.1,.5,1)' }).finished.then(() => ball.remove());
  };

  const addToCart = (id, btn) => {
    if (!byId[id]) return;
    cart[id] = (cart[id] || 0) + 1;
    save();
    flyToCart(btn).then(() => {
      renderCart();
      cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
    });
    if (btn.classList.contains('addbtn')) {
      btn.classList.add('is-added');
      btn.textContent = '✓ Añadido';
      setTimeout(() => { btn.classList.remove('is-added'); btn.textContent = 'Añadir'; }, 1400);
    }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (b) addToCart(b.dataset.add, b);
  });
  renderCart();

  /* ---------- BLOG ---------- */
  const dlg = $('#articleDialog');
  const dlgBody = $('#articleBody');
  $$('[data-post]').forEach(btn => btn.addEventListener('click', () => {
    dlgBody.replaceChildren($('#' + btn.dataset.post).content.cloneNode(true));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
  }));
  $('#articleClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ---------- NEWSLETTER ---------- */
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#newsEmail');
    const msg = $('#newsMsg');
    if (!input.checkValidity() || !input.value) { msg.textContent = 'Escribe un e-mail válido.'; input.focus(); return; }
    const body = `Hola, Set Point:\n\nQuiero suscribirme a la newsletter con este e-mail: ${input.value}\n\nGracias.`;
    window.location.href = `mailto:setpoint.inf@gmail.com?subject=${encodeURIComponent('Alta en la newsletter')}&body=${encodeURIComponent(body)}`;
    msg.textContent = 'Se abrirá tu correo para confirmar el alta. ¡Gracias!';
  });

  /* ---------- PARALLAX PROMO ---------- */
  const promoImg = $('.promo__img');
  if (promoImg && !reduceMotion) {
    const promo = promoImg.parentElement;
    const onPar = () => {
      const r = promo.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height) / (innerHeight + r.height);
      promoImg.style.transform = `translateY(${(p - 1) * 16}%)`;
    };
    window.addEventListener('scroll', onPar, { passive: true });
    onPar();
  }

  /* ---------- ASESOR DE MATERIAL ---------- */
  const form = $('#advisorForm');
  const steps = $$('.advisor__step', form);
  const bar = $('#advisorBar');
  const back = $('#advisorBack');
  const reset = $('#advisorReset');
  const result = $('#advisorResult');
  let current = 0;

  const showStep = i => {
    current = i;
    steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
    bar.style.width = `${(i / steps.length) * 100}%`;
    back.disabled = i === 0;
    back.hidden = false;
    reset.hidden = true;
    result.hidden = true;
  };

  // Orientación basada en la guía del blog «Cómo elegir la pala…»
  const RECO = {
    nivel: {
      inicio:     { pala: 'Control y comodidad', palaTxt: 'Gomas con esponja fina (1,5 mm o menos) y madera equilibrada entre velocidad y control. Mango anatómico o cóncavo.', vel: 30 },
      aficionado: { pala: 'Más efecto y potencia', palaTxt: 'Gomas de esponja media (1,7–2,0 mm) para equilibrar efecto y velocidad, sin pasarte de nivel.', vel: 50 },
      federado:   { pala: 'Velocidad y precisión máxima', palaTxt: 'Gomas de esponja gruesa (2,1–2,2 mm) y madera con carbono o ZLC para una respuesta rápida.', vel: 75 },
      club:       { pala: 'Pedidos para equipos y escuelas', palaTxt: 'Pedidos agrupados, relación estable y descuentos según el volumen de compra.', vel: 55 }
    },
    estilo: {
      defensivo: { madera: 'Madera defensiva', maderaTxt: 'Con gran control y sensibilidad para cortar y devolver lejos de la mesa.', v: -20 },
      allround:  { madera: 'Madera equilibrada', maderaTxt: 'El equilibrio entre control y velocidad para jugar un poco de todo.', v: 0 },
      ofensivo:  { madera: 'Madera ofensiva', maderaTxt: 'Más rígida, con carbono, para tomar la iniciativa con top-spin.', v: 20 },
      nose:      { madera: 'Madera equilibrada', maderaTxt: 'La mejor base para descubrir tu estilo. Después la ajustamos juntos.', v: 0 }
    },
    objetivo: {
      control:   { goma: 'Gomas de control', gomaTxt: 'Esponja más fina y superficie predecible para fallar menos.', e: 45 },
      efecto:    { goma: 'Gomas más blandas', gomaTxt: 'Si priorizas el efecto, mejor gomas blandas que agarren la bola.', e: 85 },
      velocidad: { goma: 'Gomas más duras', gomaTxt: 'Si priorizas la velocidad, mejor gomas duras con más salida de bola.', e: 60 },
      todo:      { goma: 'Gomas equilibradas', gomaTxt: 'Un poco de todo: control, efecto y velocidad sin extremos.', e: 60 }
    }
  };

  // Productos del catálogo que encajan con las respuestas
  const suggestFor = d => {
    const base = d.nivel === 'inicio' || d.nivel === 'aficionado';
    let madera = 'madera-viscaria';
    if (d.estilo === 'defensivo' || (base && d.estilo !== 'ofensivo')) madera = 'madera-innershield';
    else if (d.estilo === 'ofensivo' && d.nivel === 'federado') madera = 'madera-timoboll-zlc';
    let goma = 'goma-rozena';
    if (!base && d.nivel !== 'club') {
      goma = { control: 'goma-rozena', efecto: 'goma-tenergy64', velocidad: 'goma-dignics09c', todo: 'goma-tenergy64' }[d.objetivo];
    }
    return [madera, goma].map(id => byId[id]);
  };

  const renderResult = () => {
    const d = Object.fromEntries(new FormData(form));
    const n = RECO.nivel[d.nivel], s = RECO.estilo[d.estilo], o = RECO.objetivo[d.objetivo];
    const vel = Math.max(10, Math.min(95, n.vel + s.v + (d.objetivo === 'velocidad' ? 12 : 0)));
    const tip = d.nivel === 'club'
      ? 'Habla con nosotros para preparar el pedido del club: condiciones especiales y descuentos por volumen.'
      : 'Ven a probarlo en la mesa de competición de la tienda o escríbenos: te asesoramos gratis.';
    result.innerHTML = `
      <div class="result__head">
        <span class="result__badge" aria-hidden="true"></span>
        <div><h3>Tu punto de partida</h3><p>Una primera orientación según tus respuestas.</p></div>
      </div>
      <div class="result__grid">
        <div class="result__item"><small>Tu nivel</small><b>${n.pala}</b><p>${n.palaTxt}</p></div>
        <div class="result__item"><small>Madera</small><b>${s.madera}</b><p>${s.maderaTxt}</p>
          <div class="meter" title="Velocidad"><span style="--to:${vel}%"></span></div></div>
        <div class="result__item"><small>Gomas</small><b>${o.goma}</b><p>${o.gomaTxt}</p>
          <div class="meter" title="Efecto"><span style="--to:${o.e}%"></span></div></div>
      </div>
      <div class="result__products">
        ${suggestFor(d).map(p => `<div class="suggest"><img src="${IMG + p.img}" alt=""><div><b>${p.name}</b><small>${eur.format(p.price)}</small></div><button class="addbtn" data-add="${p.id}" aria-label="Añadir ${p.name} al carrito">Añadir</button></div>`).join('')}
      </div>
      <p class="result__tip">${tip}</p>`;
    result.hidden = false;
    steps.forEach(st => st.classList.remove('is-active'));
    bar.style.width = '100%';
    back.hidden = true;
    reset.hidden = false;
    result.focus({ preventScroll: true });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.meter span', result).forEach(m => { m.style.width = m.style.getPropertyValue('--to'); });
    }));
  };

  form.addEventListener('change', ev => {
    if (ev.target.type !== 'radio') return;
    setTimeout(() => {
      if (current < steps.length - 1) showStep(current + 1);
      else renderResult();
    }, reduceMotion ? 0 : 260);
  });
  back.addEventListener('click', () => { if (current > 0) showStep(current - 1); });
  reset.addEventListener('click', () => { form.reset(); showStep(0); });
  form.addEventListener('submit', ev => ev.preventDefault());

  /* ---------- EMBUDO ---------- */
  const FUNNEL = [
    { t: 'Atracción', p: 'Damos a conocer la marca con vídeos cortos, consejos, curiosidades, novedades, competición y publicaciones con jugadores patrocinados. Contenido útil antes que publicidad.', c: ['Instagram', 'TikTok', 'YouTube', 'Facebook'] },
    { t: 'Consideración', p: 'Te ayudamos a valorar la propuesta con comparativas, tutoriales, pruebas de material, recomendaciones según el nivel, contenido de embajadores y respuestas a tus dudas.', c: ['YouTube', 'Web', 'Instagram', 'Facebook', 'WhatsApp Business'] },
    { t: 'Conversión', p: 'El gancho principal es el asesoramiento personalizado y gratuito, junto con el envío en menos de 24 h y condiciones especiales para clubes. Puedes consultarnos directamente antes de comprar.', c: ['Web / tienda online', 'WhatsApp Business', 'Tienda física'] },
    { t: 'Fidelización', p: 'Atención posventa, contenido útil, comunidad, relación con clubes y jugadores, novedades y descuentos para clubes según su volumen de compra.', c: ['WhatsApp Business', 'E-mail', 'Redes sociales', 'Relación directa con clubes'] }
  ];
  const fBtns = $$('[data-funnel]');
  const fPanel = $('#funnelPanel');
  const setFunnel = (i, focus) => {
    const f = FUNNEL[i];
    fBtns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    fPanel.innerHTML = `<p class="kicker">Etapa ${i + 1} de 4</p><h3>${f.t}</h3><p>${f.p}</p><ul class="tags">${f.c.map(c => `<li>${c}</li>`).join('')}</ul>`;
    if (focus) fBtns[i].focus();
  };
  fBtns.forEach((b, i) => {
    b.addEventListener('click', () => setFunnel(i));
    b.addEventListener('keydown', ev => {
      if (['ArrowDown', 'ArrowRight'].includes(ev.key)) { ev.preventDefault(); setFunnel((i + 1) % 4, true); }
      if (['ArrowUp', 'ArrowLeft'].includes(ev.key)) { ev.preventDefault(); setFunnel((i + 3) % 4, true); }
    });
  });
  setFunnel(0);

  /* ---------- MAPA: resaltar pin al pasar por la lista ---------- */
  $$('[data-pin-target]').forEach(li => {
    const pin = $(`[data-pin="${li.dataset.pinTarget}"]`);
    const on = () => { pin.classList.add('is-hot'); li.classList.add('is-hot'); };
    const off = () => { pin.classList.remove('is-hot'); li.classList.remove('is-hot'); };
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
  });

  /* ---------- DAFO FLIP ---------- */
  $$('.flip').forEach(f => f.addEventListener('click', () => {
    f.setAttribute('aria-pressed', String(f.getAttribute('aria-pressed') !== 'true'));
  }));

  /* =========================================================
     HERO: peloteo en perspectiva sobre una mesa
     ========================================================= */
  const hero = $('#heroCanvas');
  if (hero) {
    const ctx = hero.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let mouseX = 0.5, mouseY = 0.5;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      hero.width = W * dpr; hero.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    hero.parentElement.addEventListener('pointermove', ev => {
      const r = hero.getBoundingClientRect();
      mouseX = (ev.clientX - r.left) / r.width;
      mouseY = (ev.clientY - r.top) / r.height;
    });

    // Geometría de la mesa en coordenadas de mundo: x ∈ [-1,1], z ∈ [0,1] (0 = cerca), y altura
    const geo = () => {
      const mobile = W < 900;
      const cx = mobile ? W * 0.5 : W * 0.76 + (mouseX - 0.5) * 30;
      const nearY = mobile ? H * 0.92 : H * 0.8;
      const farY = mobile ? H * 0.62 : H * 0.42 + (mouseY - 0.5) * 20;
      const nearHalf = mobile ? W * 0.55 : Math.min(W * 0.23, 400);
      const farHalf = nearHalf * 0.42;
      return { cx, nearY, farY, nearHalf, farHalf };
    };
    const project = (g, x, y, z) => {
      const half = g.nearHalf + (g.farHalf - g.nearHalf) * z;
      const sy = g.nearY + (g.farY - g.nearY) * z;
      const scale = half / g.nearHalf;
      return { x: g.cx + x * half, y: sy - y * g.nearHalf * 0.55 * scale, s: scale };
    };

    // Rally
    let shot = null;
    let dir = 1; // 1 = hacia el fondo
    const trail = [];
    const newShot = from => {
      const toX = (Math.random() * 1.4 - 0.7);
      const z0 = dir > 0 ? -0.08 : 1.08, z1 = dir > 0 ? 1.08 : -0.08;
      const bounceT = 0.62 + Math.random() * 0.1;
      shot = { x0: from, x1: toX, z0, z1, t: 0, bounceT, dur: 1.05 + Math.random() * 0.25, h1: 0.55 + Math.random() * 0.2, h2: 0.4 };
    };
    newShot(0);

    const ballPos = s => {
      const t = s.t;
      const x = s.x0 + (s.x1 - s.x0) * t;
      const z = s.z0 + (s.z1 - s.z0) * t;
      let y;
      if (t < s.bounceT) {
        const u = t / s.bounceT;
        y = 0.28 * (1 - u) + 4 * s.h1 * u * (1 - u);
      } else {
        const u = (t - s.bounceT) / (1 - s.bounceT);
        y = 4 * s.h2 * u * (1 - u) + 0.25 * u;
      }
      return { x, y: Math.max(0, y), z };
    };

    let last = performance.now();
    let running = true;
    let looping = false;
    const heroIO = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running && !looping) { looping = true; last = performance.now(); requestAnimationFrame(frame); }
    });
    heroIO.observe(hero);

    const drawTable = g => {
      const c = [project(g, -1, 0, 0), project(g, 1, 0, 0), project(g, 1, 0, 1), project(g, -1, 0, 1)];
      // sombra
      ctx.save();
      ctx.filter = 'blur(30px)';
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y + 40); ctx.lineTo(c[1].x, c[1].y + 40); ctx.lineTo(c[2].x, c[2].y + 30); ctx.lineTo(c[3].x, c[3].y + 30);
      ctx.fill();
      ctx.restore();
      // canto
      ctx.fillStyle = '#0F2546';
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y); ctx.lineTo(c[1].x, c[1].y); ctx.lineTo(c[1].x, c[1].y + 12); ctx.lineTo(c[0].x, c[0].y + 12);
      ctx.fill();
      // superficie
      const grd = ctx.createLinearGradient(0, c[3].y, 0, c[0].y);
      grd.addColorStop(0, '#163463'); grd.addColorStop(1, '#1F4A86');
      ctx.fillStyle = grd;
      ctx.beginPath();
      c.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath(); ctx.fill();
      // líneas
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = 3; ctx.stroke();
      const m0 = project(g, 0, 0, 0), m1 = project(g, 0, 0, 1);
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.stroke();
      // red
      const n0 = project(g, -1.08, 0, 0.5), n1 = project(g, 1.08, 0, 0.5);
      const nh = project(g, 0, 0.17, 0.5).y - project(g, 0, 0, 0.5).y;
      ctx.fillStyle = 'rgba(230,232,236,.18)';
      ctx.fillRect(n0.x, n0.y + nh, n1.x - n0.x, -nh);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 40; i++) {
        const x = n0.x + (n1.x - n0.x) * i / 40;
        ctx.beginPath(); ctx.moveTo(x, n0.y); ctx.lineTo(x, n0.y + nh); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(n0.x, n0.y + nh - 2, n1.x - n0.x, 3);
      ctx.fillStyle = '#C8CCD3';
      ctx.fillRect(n0.x - 3, n0.y + nh - 2, 4, -nh + 2);
      ctx.fillRect(n1.x - 1, n1.y + nh - 2, 4, -nh + 2);
      return c;
    };

    const drawBall = (g, b) => {
      const sh = project(g, b.x, 0, b.z);
      const p = project(g, b.x, b.y, b.z);
      const r = Math.max(3, 11 * p.s * (W < 900 ? 0.9 : 1));
      const onTable = b.z >= 0 && b.z <= 1 && Math.abs(b.x) <= 1;
      if (onTable) {
        ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(b.y, 0.6) * 0.4})`;
        ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.2, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      }
      // estela
      trail.push({ x: p.x, y: p.y, r });
      if (trail.length > 14) trail.shift();
      trail.forEach((t, i) => {
        ctx.fillStyle = `rgba(255,59,82,${(i / trail.length) * 0.25})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (i / trail.length), 0, Math.PI * 2); ctx.fill();
      });
      const grd = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, '#FBE9D7'); grd.addColorStop(1, '#E6B88A');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    };

    const drawPaddle = (g, x, z, swing) => {
      const p = project(g, x, 0.35, z);
      const s = p.s * (W < 900 ? 0.8 : 1);
      ctx.save();
      ctx.translate(p.x + (z < 0.5 ? 30 : 16) * s, p.y);
      ctx.rotate((z < 0.5 ? -0.5 : 0.4) + swing);
      ctx.fillStyle = '#C49A6C';
      ctx.fillRect(-6 * s, 26 * s, 12 * s, 34 * s);
      ctx.fillStyle = z < 0.5 ? '#D30B25' : '#1A1D23';
      ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, 30 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    };

    let nearX = 0, farX = 0, nearSwing = 0, farSwing = 0;
    const frame = now => {
      if (!running) { looping = false; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);
      const g = geo();
      drawTable(g);
      if (!reduceMotion) {
        shot.t += dt / shot.dur;
        if (shot.t >= 1) {
          const end = ballPos({ ...shot, t: 1 });
          dir *= -1;
          if (dir > 0) nearSwing = 0.9; else farSwing = -0.9;
          newShot(end.x);
        }
      }
      const b = ballPos(shot);
      // las palas siguen la bola
      const targetNear = dir < 0 ? shot.x1 : b.x;
      const targetFar = dir > 0 ? shot.x1 : b.x;
      nearX += (targetNear - nearX) * Math.min(1, dt * 4);
      farX += (targetFar - farX) * Math.min(1, dt * 4);
      nearSwing *= 0.9; farSwing *= 0.9;
      drawPaddle(g, farX, 1.12, farSwing);
      if (b.z > 0.5) { drawBall(g, b); drawPaddle(g, nearX, -0.1, nearSwing); }
      else { drawPaddle(g, nearX, -0.1, nearSwing); drawBall(g, b); }
      if (!reduceMotion) requestAnimationFrame(frame);
      else looping = false;
    };
  }

  /* =========================================================
     MINIJUEGO: torneo a 3 puntos
     ========================================================= */
  const cv = $('#pong');
  if (cv) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const overlay = $('#pongOverlay');
    const msg = $('#pongMsg');
    const startBtn = $('#pongStart');
    const elYou = $('#gYou'), elCpu = $('#gCpu');
    const PW = 90, PH = 14, BR = 9, WIN = 3;
    let you, cpu, ball, score, playing = false, serveTo = 1, keys = {}, rafId = 0, last = 0;
    const particles = [];

    const resetGame = () => {
      you = { x: W / 2 }; cpu = { x: W / 2 };
      score = { you: 0, cpu: 0 };
      elYou.textContent = '0'; elCpu.textContent = '0';
    };
    const serve = () => {
      const s = 360 + (score.you + score.cpu) * 18;
      const ang = (Math.random() * 0.6 - 0.3);
      ball = { x: W / 2, y: H / 2, vx: Math.sin(ang) * s, vy: Math.cos(ang) * s * serveTo, spin: 0 };
    };

    const toCanvasX = clientX => {
      const r = cv.getBoundingClientRect();
      return (clientX - r.left) / r.width * W;
    };
    cv.addEventListener('pointermove', e => { you.x = toCanvasX(e.clientX); });
    cv.addEventListener('pointerdown', e => { you.x = toCanvasX(e.clientX); });
    window.addEventListener('keydown', e => {
      if (!playing) return;
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { keys[e.key] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    const burst = (x, y, color) => {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 180;
        particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, color });
      }
    };

    const drawTable = () => {
      ctx.fillStyle = '#1B3F73'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
      ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.globalAlpha = 1;
      // red
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, H / 2 - 5, W, 10);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, H / 2 - 1.5, W, 3);
      // logo de fondo
      ctx.save();
      ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff';
      ctx.font = '900 64px Archivo, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SET POINT', W / 2, H * 0.28);
      ctx.restore();
    };
    const drawPaddle = (x, y, color) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.roundRect(x - PW / 2 + 3, y - PH / 2 + 5, PW, PH, 7); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(x - PW / 2, y - PH / 2, PW, PH, 7); ctx.fill();
    };
    const drawBall = () => {
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.arc(ball.x + 4, ball.y + 6, BR, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, BR);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#F0C79C');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fill();
    };

    const yY = H - 40, cY = 40;
    const point = who => {
      score[who]++;
      elYou.textContent = score.you; elCpu.textContent = score.cpu;
      burst(ball.x, who === 'you' ? cY : yY, who === 'you' ? '#FF3B52' : '#fff');
      serveTo = who === 'you' ? 1 : -1;
      if (score.you >= WIN || score.cpu >= WIN) {
        playing = false;
        const won = score.you > score.cpu;
        msg.textContent = won ? `¡Set para ti! ${score.you}–${score.cpu}` : `Set para Set Point ${score.cpu}–${score.you}. ¿Revancha?`;
        startBtn.textContent = won ? 'Jugar otra vez' : 'Revancha';
        overlay.classList.remove('is-hidden');
        return;
      }
      ball = null;
      setTimeout(() => { if (playing) serve(); }, 700);
    };

    const update = dt => {
      if (keys.ArrowLeft) you.x -= 520 * dt;
      if (keys.ArrowRight) you.x += 520 * dt;
      you.x = Math.max(PW / 2, Math.min(W - PW / 2, you.x));
      if (!ball) return;
      // IA: sigue la bola con retraso y velocidad limitada
      const target = ball.vy < 0 ? ball.x : W / 2;
      const maxV = 300 + (score.cpu + score.you) * 20;
      const d = target - cpu.x;
      cpu.x += Math.max(-maxV * dt, Math.min(maxV * dt, d * 0.9));
      cpu.x = Math.max(PW / 2, Math.min(W - PW / 2, cpu.x));

      ball.vx += ball.spin * dt;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < BR || ball.x > W - BR) { ball.vx *= -1; ball.x = Math.max(BR, Math.min(W - BR, ball.x)); }

      const hit = (px, py, sign) => {
        if (Math.abs(ball.y - py) < PH / 2 + BR && Math.abs(ball.x - px) < PW / 2 + BR && Math.sign(ball.vy) === sign) {
          const off = (ball.x - px) / (PW / 2);
          const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 900);
          const ang = off * 1.0;
          ball.vx = Math.sin(ang) * sp;
          ball.vy = -sign * Math.cos(ang) * sp;
          ball.spin = off * 120;
          ball.y = py - sign * (PH / 2 + BR + 1);
          burst(ball.x, ball.y, '#FBE9D7');
        }
      };
      hit(you.x, yY, 1);
      hit(cpu.x, cY, -1);
      if (ball.y > H + 20) point('cpu');
      else if (ball.y < -20) point('you');
    };

    const draw = () => {
      drawTable();
      drawPaddle(cpu.x, cY, '#14171D');
      drawPaddle(you.x, yY, '#D30B25');
      if (ball) drawBall();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }
    };
    const tickParticles = dt => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
    };

    const loop = now => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      if (playing) update(dt);
      tickParticles(dt);
      draw();
      if (playing || particles.length) rafId = requestAnimationFrame(loop);
    };

    startBtn.addEventListener('click', () => {
      resetGame();
      serveTo = 1;
      playing = true;
      overlay.classList.add('is-hidden');
      serve();
      cancelAnimationFrame(rafId);
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    });

    // Pausa si el juego sale de pantalla
    new IntersectionObserver(([e]) => {
      if (!e.isIntersecting && playing) {
        playing = false;
        msg.textContent = 'Partido en pausa';
        startBtn.textContent = 'Empezar de nuevo';
        overlay.classList.remove('is-hidden');
      }
    }, { threshold: 0.2 }).observe(cv);

    resetGame();
    ball = { x: W / 2, y: H / 2 };
    draw();
  }
})();
