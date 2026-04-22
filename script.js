/**
 * ARIK DJ — script.js
 * Diseño: "Underground Luxury"
 *
 * Módulos:
 *  00. Configuración y utilidades
 *  01. Loader
 *  02. Cursor personalizado
 *  03. Canvas hero (visualización generativa)
 *  04. Navegación (scroll + burger + active links)
 *  05. Entrada del hero (GSAP timeline)
 *  06. Reveals con scroll (GSAP ScrollTrigger)
 *  07. Contadores animados (stats)
 *  08. Music tabs
 *  09. Form tabs + lógica del formulario
 *  10. Portfolio / hover de tarjetas
 *  11. Efecto "magnetic" en botones
 *  12. BACKEND — cómo conectar (Supabase / Firebase / API propia)
 */

'use strict';

/* ════════════════════════════════════════════════
   00. CONFIGURACIÓN Y UTILIDADES
   ════════════════════════════════════════════════ */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ¿El usuario prefiere reducción de movimiento?
const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ¿Dispositivo táctil?
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Registrar GSAP + ScrollTrigger (cargados desde CDN en el HTML)
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}


/* ════════════════════════════════════════════════
   01. LOADER
   Animación de entrada: barra de progreso + fade out
   ════════════════════════════════════════════════ */

function initLoader() {
  const loader = $('#loader');
  if (!loader) return;

  // Bloquear scroll mientras carga
  document.body.style.overflow = 'hidden';

  // Esperar a que las fuentes estén listas + tiempo mínimo de branding
  const minDelay = 1200; // ms mínimos mostrando la pantalla de carga
  const start = Date.now();

  function hideLoader() {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, minDelay - elapsed);

    setTimeout(() => {
      loader.classList.add('done');
      document.body.style.overflow = '';
      initHeroEntrance(); // lanzar la animación de entrada del hero
    }, remaining);
  }

  // Intentar document.fonts.ready, con fallback
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(hideLoader);
  } else {
    setTimeout(hideLoader, minDelay);
  }
}


/* ════════════════════════════════════════════════
   02. CURSOR PERSONALIZADO
   Solo activo en desktop (no touch).
   Cursor grande: lerp suavizado.
   Punto: sigue directo.
   ════════════════════════════════════════════════ */

function initCursor() {
  if (isTouch) return;

  const cursor = $('#cursor');
  const trail  = $('#cursorTrail');
  if (!cursor || !trail) return;

  let mx = 0, my = 0;   // posición real del ratón
  let cx = 0, cy = 0;   // posición suavizada del cursor grande

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;

    // El punto sigue inmediatamente
    if (window.gsap) {
      gsap.set(trail, { x: mx, y: my });
    } else {
      trail.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    }

    document.body.classList.add('c-ready');
  });

  // El cursor grande usa lerp via GSAP ticker
  if (window.gsap) {
    gsap.ticker.add(() => {
      cx += (mx - cx) * 0.1;
      cy += (my - cy) * 0.1;
      gsap.set(cursor, { x: cx, y: cy });
    });
  }

  // Hover en interactivos
  $$('a, button, [data-hover], .pf-card, .set-thumb, .tl-item, .service-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
  });

  // Click feedback
  document.addEventListener('mousedown', () => document.body.classList.add('c-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('c-click'));
}


/* ════════════════════════════════════════════════
   03. CANVAS HERO — visualización generativa
   Partículas que reaccionan a movimiento del ratón.
   Se muestra como fondo del hero hasta que haya vídeo.
   ════════════════════════════════════════════════ */

function initHeroCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const COLS = ['#7B2FFF', '#00D4FF', '#FF2D55', '#4a1d96'];
  let W, H, particles, mouseX = -1000, mouseY = -1000;
  const COUNT = 90;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor() { this.reset(true); }

    reset(random = false) {
      this.x    = random ? Math.random() * W : W * Math.random();
      this.y    = random ? Math.random() * H : H + 10;
      this.ox   = this.x; // posición original para spring
      this.oy   = this.y;
      this.vx   = (Math.random() - .5) * .4;
      this.vy   = -(Math.random() * .5 + .2);
      this.size = Math.random() * 2.5 + .5;
      this.col  = COLS[Math.floor(Math.random() * COLS.length)];
      this.alpha= Math.random() * .5 + .15;
      this.life = Math.random();
    }

    update() {
      // Repulsión del ratón
      const dx  = this.x - mouseX;
      const dy  = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const force = (80 - dist) / 80;
        this.x += (dx / dist) * force * 2;
        this.y += (dy / dist) * force * 2;
      }

      this.x += this.vx;
      this.y += this.vy;
      this.life -= .003;

      if (this.life <= 0 || this.y < -10) {
        this.x    = Math.random() * W;
        this.y    = H + 10;
        this.life = 1;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha * Math.min(this.life * 3, 1);
      ctx.fillStyle = this.col;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, () => new Particle());
  }

  let animId;
  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    animId = requestAnimationFrame(animate);
  }

  // Seguir el ratón sobre el hero
  $('#inicio')?.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  $('#inicio')?.addEventListener('mouseleave', () => {
    mouseX = -1000; mouseY = -1000;
  });

  window.addEventListener('resize', () => { resize(); });

  init();
  animate();

  // Parar animación si la sección sale del viewport (performance)
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      trigger: '#inicio',
      start: 'top top',
      end: 'bottom top',
      onLeave: () => { cancelAnimationFrame(animId); },
      onEnterBack: () => { animate(); },
    });
  }
}


/* ════════════════════════════════════════════════
   04. NAVEGACIÓN
   - Fondo al hacer scroll
   - Link activo según sección visible
   - Burger / menú móvil
   ════════════════════════════════════════════════ */

function initNav() {
  const navWrap = $('#navWrap');
  const burger  = $('#navBurger');
  const mobileM = $('#mobileMenu');

  // ── Scroll: añadir clase "scrolled" ──
  if (navWrap && window.ScrollTrigger) {
    ScrollTrigger.create({
      start: '80px top',
      onEnter:     () => navWrap.classList.add('scrolled'),
      onLeaveBack: () => navWrap.classList.remove('scrolled'),
    });
  }

  // ── Active link por sección visible ──
  const sections = $$('main section[id]');
  const navLinks  = $$('.nav-link');

  if (window.ScrollTrigger) {
    sections.forEach(section => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end:   'bottom 55%',
        onEnter:      () => setActiveLink(section.id),
        onEnterBack:  () => setActiveLink(section.id),
      });
    });
  }

  function setActiveLink(id) {
    navLinks.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
    });
  }

  // ── Burger / menú móvil ──
  let menuOpen = false;

  function toggleMenu(open) {
    menuOpen = open ?? !menuOpen;
    burger?.setAttribute('aria-expanded', String(menuOpen));
    mobileM?.setAttribute('aria-hidden',   String(!menuOpen));
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }

  burger?.addEventListener('click', () => toggleMenu());
  $$('.mm-link', mobileM).forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // ── Smooth scroll para links internos ──
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = $(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 70;
      const top = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}


/* ════════════════════════════════════════════════
   05. ENTRADA DEL HERO — GSAP timeline
   Se llama desde initLoader() cuando el loader termina.
   ════════════════════════════════════════════════ */

function initHeroEntrance() {
  if (!window.gsap) {
    // Fallback sin GSAP: mostrar todo de golpe
    $$('.hero-eyebrow, .ht-word, .ht-accent, .hero-sub, .hero-ctas, .hero-stats, .scroll-hint')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  if (noMotion) {
    gsap.set(['.hero-eyebrow','.ht-word','.ht-accent','.hero-sub','.hero-ctas','.hero-stats','.scroll-hint'],
      { opacity: 1, y: 0, x: 0 });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl
    // 1. Eyebrow
    .fromTo('.hero-eyebrow',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: .65 }
    )
    // 2. Título — cada palabra sube desde dentro del overflow:hidden
    .fromTo('.ht-word',
      { y: '110%', opacity: 0 },
      { y: '0%', opacity: 1, duration: .9, stagger: .08 },
      '-=.35'
    )
    .fromTo('.ht-accent',
      { y: '110%', opacity: 0 },
      { y: '0%', opacity: 1, duration: .7 },
      '<.3'
    )
    // 3. Subtítulo
    .fromTo('.hero-sub',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: .65 },
      '-=.4'
    )
    // 4. CTAs
    .fromTo('.hero-ctas',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: .6 },
      '-=.4'
    )
    // 5. Stats
    .fromTo('.hero-stats',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: .55, onStart: () => window._runCounters && window._runCounters() },
      '-=.35'
    )
    // 6. Scroll hint
    .fromTo('.scroll-hint',
      { opacity: 0 },
      { opacity: 1, duration: .5 },
      '-=.2'
    );
}


/* ════════════════════════════════════════════════
   06. REVEALS CON SCROLL — GSAP ScrollTrigger
   Clases: .js-reveal, .js-reveal-left, .js-reveal-right
   Atributo: data-delay="0.1" (segundos de delay)
   ════════════════════════════════════════════════ */

function initScrollReveals() {
  if (!window.gsap || !window.ScrollTrigger) return;

  if (noMotion) {
    $$('.js-reveal, .js-reveal-left, .js-reveal-right').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  $$('.js-reveal, .js-reveal-left, .js-reveal-right').forEach(el => {
    const delay = parseFloat(el.dataset.delay || 0);
    const dir   = el.classList.contains('js-reveal-left')  ? 'left'
                : el.classList.contains('js-reveal-right') ? 'right'
                : 'up';

    gsap.fromTo(el,
      {
        opacity: 0,
        x: dir === 'left' ? -32 : dir === 'right' ? 32 : 0,
        y: dir === 'up' ? 28 : 0,
      },
      {
        opacity: 1, x: 0, y: 0,
        duration: .75,
        delay,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        }
      }
    );
  });

  // Parallax leve en el hero placeholder (si no hay vídeo)
  gsap.to('.hero-placeholder', {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: {
      trigger: '#inicio',
      start: 'top top',
      end:   'bottom top',
      scrub: true,
    }
  });
}


/* ════════════════════════════════════════════════
   07. CONTADORES ANIMADOS
   Elementos: .hstat con data-count="N"
   El número hijo .hstat-num se anima de 0 a N.
   ════════════════════════════════════════════════ */

function initCounters() {
  // Expuesto globalmente para que initHeroEntrance() lo dispare en el momento exacto
  window._runCounters = function () {
    $$('.hstat-num[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';

      if (noMotion || !window.gsap) {
        el.textContent = prefix + target + suffix;
        return;
      }

      gsap.to({ v: 0 }, {
        v: target,
        duration: 2,
        ease: 'power2.out',
        onUpdate: function () {
          el.textContent = prefix + Math.round(this.targets()[0].v) + suffix;
        },
        onComplete: function () {
          el.textContent = prefix + target + suffix;
        }
      });
    });
  };
}


/* ════════════════════════════════════════════════
   08. MUSIC TABS
   Tabs de Tracks / Sets DJ / Releases
   ════════════════════════════════════════════════ */

function initMusicTabs() {
  const tabs   = $$('.mtab');
  const panels = $$('.music-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Actualizar tabs
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Mostrar panel correspondiente
      panels.forEach(p => p.classList.remove('active'));
      $(`#panel-${target}`)?.classList.add('active');

      // Re-disparar reveals en el nuevo panel
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
}


/* ════════════════════════════════════════════════
   09b. REPRODUCTOR DE AUDIO CUSTOM
   Maneja 3 archivos locales con Web Audio API
   para el visualizador de frecuencias.
   ════════════════════════════════════════════════ */

function initAudioPlayer() {
  const audio      = $('#audioEl');
  const playBtn    = $('#apPlay');
  const prevBtn    = $('#apPrev');
  const nextBtn    = $('#apNext');
  const volSlider  = $('#apVol');
  const fillEl     = $('#apFill');
  const progressW  = $('#apProgressWrap');
  const thumbEl    = $('#apThumb');
  const currentEl  = $('#apCurrent');
  const durationEl = $('#apDuration');
  const titleEl    = $('#apTitle');
  const genreEl    = $('#apGenre');
  const coverLtr   = $('#apCoverLetter');
  const rows       = $$('.ap-list-row');
  const canvas     = $('#apCanvas');

  if (!audio || !playBtn || !canvas) return;

  // ── Configuración de tracks ──
  const TRACKS = [
    { src: 'cancion1.mp3', title: 'Track 01 — Prod. ARIK DJ', genre: 'Trap · 2024',      letter: '01' },
    { src: 'cancion2.wav', title: 'Track 02 — Prod. ARIK DJ', genre: 'Reggaetón · 2024', letter: '02' },
    { src: 'cancion3.wav', title: 'Track 03 — Prod. ARIK DJ', genre: 'Trap / Rgt · 2024',letter: '03' },
  ];

  let currentIdx = 0;
  let isPlaying  = false;
  let audioCtx, analyser, source, dataArray;
  let rafId;

  // Cargar duración de todos los tracks al inicio
  TRACKS.forEach((t, i) => {
    const tmp = new Audio();
    tmp.preload = 'metadata';
    tmp.src = t.src;
    tmp.addEventListener('loadedmetadata', () => {
      const el = $(`#dur${i}`);
      if (el) el.textContent = formatTime(tmp.duration);
    });
  });

  // ── Cargar track ──
  function loadTrack(idx, autoplay = false) {
    currentIdx = idx;
    const t = TRACKS[idx];

    audio.src = t.src;
    audio.load();
    if (titleEl)   titleEl.textContent   = t.title;
    if (genreEl)   genreEl.textContent   = t.genre;
    if (coverLtr)  coverLtr.textContent  = t.letter;
    if (currentEl) currentEl.textContent = '0:00';
    if (durationEl) durationEl.textContent = '--:--';
    if (fillEl)    fillEl.style.width = '0%';
    if (thumbEl)   thumbEl.style.left = '0%';

    // Actualizar lista
    rows.forEach((r, i) => {
      r.classList.toggle('active', i === idx);
      r.setAttribute('aria-pressed', String(i === idx));
      r.classList.remove('playing');
    });

    if (autoplay) {
      audio.play().then(() => { isPlaying = true; updatePlayUI(); }).catch(() => {});
    } else {
      isPlaying = false;
      updatePlayUI();
    }
  }

  // ── Play / Pause ──
  function togglePlay() {
    if (!audioCtx) initAudioContext();

    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.play().catch(() => {});
      isPlaying = true;
    }
    updatePlayUI();
  }

  function updatePlayUI() {
    const iconPlay  = playBtn.querySelector('.ic-play');
    const iconPause = playBtn.querySelector('.ic-pause');
    if (iconPlay)  iconPlay.style.display  = isPlaying ? 'none'  : 'block';
    if (iconPause) iconPause.style.display = isPlaying ? 'block' : 'none';

    rows.forEach((r, i) => {
      if (i === currentIdx) r.classList.toggle('playing', isPlaying);
    });

    if (isPlaying) drawVisualizer();
    else cancelAnimationFrame(rafId);
  }

  // ── Web Audio API — visualizador ──
  function initAudioContext() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API no disponible:', e);
    }
  }

  function drawVisualizer() {
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    rafId = requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, W, H);
    const bars  = dataArray.length;
    const bw    = W / bars - 1;

    for (let i = 0; i < bars; i++) {
      const v  = dataArray[i] / 255;
      const bh = v * H;
      const hue = 265 + v * 60; // violeta → rojo según amplitud
      ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${0.4 + v * 0.6})`;
      ctx.fillRect(i * (bw + 1), H - bh, bw, bh);
    }
  }

  // Fallback visual sin audio context (animación CSS del canvas)
  function drawIdleVisualizer() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const bars = 48;
    const bw = W / bars - 1;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < bars; i++) {
      const v = (Math.sin(Date.now() * 0.002 + i * 0.4) + 1) / 2 * 0.3 + 0.05;
      ctx.fillStyle = `hsla(265, 80%, 55%, ${v * 2})`;
      ctx.fillRect(i * (bw + 1), H - v * H, bw, v * H);
    }
    requestAnimationFrame(drawIdleVisualizer);
  }
  drawIdleVisualizer();

  // ── Progress bar ──
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (fillEl)  fillEl.style.width = `${pct}%`;
    if (thumbEl) thumbEl.style.left = `${pct}%`;
    if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
    const el = $(`#dur${currentIdx}`);
    if (el) el.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('ended', () => {
    const next = (currentIdx + 1) % TRACKS.length;
    loadTrack(next, true);
  });

  // Click en barra de progreso
  progressW?.addEventListener('click', (e) => {
    const rect = progressW.querySelector('.ap-progress-bg').getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  });

  // ── Volumen ──
  volSlider?.addEventListener('input', () => {
    audio.volume = parseFloat(volSlider.value);
  });
  audio.volume = 0.85;

  // ── Controles prev / next ──
  playBtn?.addEventListener('click', togglePlay);
  prevBtn?.addEventListener('click', () => {
    const prev = (currentIdx - 1 + TRACKS.length) % TRACKS.length;
    loadTrack(prev, isPlaying);
  });
  nextBtn?.addEventListener('click', () => {
    const next = (currentIdx + 1) % TRACKS.length;
    loadTrack(next, isPlaying);
  });

  // ── Click en fila de lista ──
  rows.forEach((row, i) => {
    row.addEventListener('click', () => {
      if (i === currentIdx) { togglePlay(); }
      else { loadTrack(i, true); }
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
  });

  // Cargar primer track sin autoplay
  loadTrack(0, false);
}

function formatTime(s) {
  if (!s || isNaN(s)) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}



function initContactForm() {

  // ── Tabs de motivo ──
  const ftabs      = $$('.ftab');
  const eventoFlds = $('#evento-fields');
  const beatFlds   = $('#beat-fields');
  const formTipo   = $('#formTipo');

  ftabs.forEach(tab => {
    tab.addEventListener('click', () => {
      ftabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');

      const tipo = tab.dataset.ftab;
      if (formTipo) formTipo.value = tipo;

      if (eventoFlds) eventoFlds.style.display = tipo === 'evento' ? 'flex' : 'none';
      if (beatFlds)   beatFlds.style.display   = tipo === 'beat'   ? 'flex' : 'none';
    });
  });

  // ── Submit del formulario ──
  const form      = $('#contactForm');
  const submitBtn = $('#submitBtn');
  const success   = $('#formSuccess');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot anti-spam
    if (form.querySelector('[name="_honey"]')?.value) return;

    // Validación básica
    const nombre  = $('#f-name')?.value.trim();
    const email   = $('#f-email')?.value.trim();
    const mensaje = $('#f-msg')?.value.trim();

    if (!nombre || !email || !mensaje) {
      shakeInvalid(form);
      return;
    }
    if (!isValidEmail(email)) {
      shakeInvalid($('#f-email'));
      return;
    }

    // Estado de carga
    if (submitBtn) { submitBtn.disabled = true; $('.btn-text', submitBtn).textContent = 'Enviando...'; }

    // ═══════════════════════════════════════════════════════════════
    // BACKEND — elige UNA de estas opciones:
    // ───────────────────────────────────────────────────────────────
    //
    // OPCIÓN A: Formspree (más sencillo, sin servidor propio)
    // ───────────────────────────────────────────────────────────────
    // 1. Crea cuenta en formspree.io
    // 2. Crea un nuevo formulario
    // 3. Cambia la URL de abajo por tu endpoint:
    //
    //   const res = await fetch('https://formspree.io/f/TU_FORM_ID', {
    //     method: 'POST',
    //     headers: { 'Accept': 'application/json' },
    //     body: new FormData(form)
    //   });
    //   const ok = res.ok;
    //
    // ───────────────────────────────────────────────────────────────
    // OPCIÓN B: Supabase
    // ───────────────────────────────────────────────────────────────
    // 1. Crea proyecto en supabase.com
    // 2. Crea tabla: contact_requests
    //    Columnas: id (uuid), nombre, email, mensaje, tipo, created_at
    // 3. Obtén SUPABASE_URL y SUPABASE_ANON_KEY del dashboard
    //
    //   const SUPABASE_URL  = 'https://TU_ID.supabase.co';
    //   const SUPABASE_KEY  = 'TU_ANON_KEY';
    //
    //   const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_requests`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'apikey': SUPABASE_KEY,
    //       'Authorization': `Bearer ${SUPABASE_KEY}`,
    //       'Prefer': 'return=minimal'
    //     },
    //     body: JSON.stringify({ nombre, email, mensaje,
    //       tipo: formTipo?.value || 'evento' })
    //   });
    //   const ok = res.ok;
    //
    // ───────────────────────────────────────────────────────────────
    // OPCIÓN C: Firebase Firestore
    // ───────────────────────────────────────────────────────────────
    // 1. Crea proyecto en firebase.google.com
    // 2. Activa Firestore Database
    // 3. Añade los scripts del SDK de Firebase en index.html
    //    (antes de script.js):
    //    <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js"></script>
    //    <script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore-compat.js"></script>
    // 4. Luego aquí:
    //
    //   firebase.initializeApp({ apiKey:'...', projectId:'...' });
    //   const db = firebase.firestore();
    //   await db.collection('contactos').add({
    //     nombre, email, mensaje,
    //     tipo: formTipo?.value,
    //     timestamp: firebase.firestore.FieldValue.serverTimestamp()
    //   });
    //   const ok = true;
    //
    // ───────────────────────────────────────────────────────────────
    // OPCIÓN D: API propia (Node/Express, PHP, Python, etc.)
    // ───────────────────────────────────────────────────────────────
    //   const res = await fetch('/api/contacto', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ nombre, email, mensaje,
    //       tipo: formTipo?.value })
    //   });
    //   const ok = res.ok;
    //
    // ═══════════════════════════════════════════════════════════════

    // SIMULACIÓN (eliminar cuando tengas backend real):
    await new Promise(r => setTimeout(r, 1200));
    const ok = true;

    if (ok) {
      form.reset();
      success?.removeAttribute('hidden');
      if (submitBtn) { submitBtn.disabled = false; $('.btn-text', submitBtn).textContent = 'Enviar mensaje'; }
      setTimeout(() => success?.setAttribute('hidden', ''), 6000);
    } else {
      if (submitBtn) { submitBtn.disabled = false; $('.btn-text', submitBtn).textContent = 'Reintentar'; }
      alert('Hubo un error. Por favor escríbeme directamente a tu@email.com');
    }
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function shakeInvalid(el) {
  if (!el || !window.gsap || noMotion) return;
  gsap.fromTo(el,
    { x: -6 },
    { x: 0, duration: .5, ease: 'elastic.out(1, .3)',
      keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: 0 }]
    }
  );
}


/* ════════════════════════════════════════════════
   10. PORTFOLIO — hover con overlay info
   (El CSS ya maneja el hover, pero JS mejora
    la accesibilidad con teclado)
   ════════════════════════════════════════════════ */

function initPortfolio() {
  $$('.pf-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('focus',  () => card.classList.add('focused'));
    card.addEventListener('blur',   () => card.classList.remove('focused'));
  });
}

/* ════════════════════════════════════════════════
   10b. SERVICES SPLIT — imagen cambia con hover
   ════════════════════════════════════════════════ */
function initServicesSplit() {
  const items = $$('.svc-item');
  const imgs  = $$('.svc-bg-img');
  if (!items.length || !imgs.length) return;

  function activate(svc) {
    items.forEach(i => i.classList.toggle('active', i.dataset.svc === svc));
    imgs.forEach(img => img.classList.toggle('active', img.dataset.svc === svc));
  }

  items.forEach(item => {
    item.addEventListener('mouseenter', () => activate(item.dataset.svc));
    item.addEventListener('focus',      () => activate(item.dataset.svc));
  });
}


/* ════════════════════════════════════════════════
   11. EFECTO MAGNETIC en botones [data-hover]
   Solo en desktop. Atrae el botón hacia el cursor.
   ════════════════════════════════════════════════ */

function initMagnetic() {
  if (isTouch || !window.gsap || noMotion) return;

  $$('[data-hover]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) * .28;
      const dy   = (e.clientY - cy) * .28;
      gsap.to(btn, { x: dx, y: dy, duration: .4, ease: 'power2.out' });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1, .5)' });
    });
  });
}


/* ════════════════════════════════════════════════
   ARRANQUE — todo se inicializa aquí
   ════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  initLoader();        // 01 — Loader (llama a heroEntrance al terminar)
  initCursor();        // 02 — Cursor
  initHeroCanvas();    // 03 — Canvas fondo hero
  initNav();           // 04 — Navegación
  // 05 heroEntrance se llama desde initLoader()
  initScrollReveals(); // 06 — Reveals scroll
  initCounters();      // 07 — Contadores
  initMusicTabs();     // 08 — Music tabs
  initContactForm();   // 09 — Formulario
  initAudioPlayer();   // 09b — Reproductor de audio
  initPortfolio();     // 10 — Portfolio
  initServicesSplit(); // 10b — Services split hover
  initMagnetic();      // 11 — Magnetic buttons

});


/* ════════════════════════════════════════════════
   GUÍA DE PERSONALIZACIÓN RÁPIDA
   ════════════════════════════════════════════════

   📁 ESTRUCTURA DE ARCHIVOS RECOMENDADA:
   ───────────────────────────────────────
   /
   ├── index.html
   ├── styles.css
   ├── script.js
   ├── img/
   │   ├── arik-foto.jpg          ← Foto "Sobre mí"
   │   ├── hero-poster.jpg        ← Imagen de fondo del hero
   │   ├── portfolio/
   │   │   ├── evento-1.jpg
   │   │   ├── evento-2.jpg
   │   │   └── ...
   │   └── releases/
   │       ├── cover-modo-oscuro.jpg
   │       └── ...
   ├── video/
   │   ├── hero-loop.mp4          ← Vídeo hero (< 15MB, sin audio)
   │   └── hero-loop.webm
   └── music/
       └── (no se sirven archivos de audio aquí, usa embed)

   ───────────────────────────────────────
   ✅ CHECKLIST PARA LANZAR:
   ───────────────────────────────────────
   □ Cambiar "ARIK DJ" por nombre real si es diferente
   □ Actualizar número de WhatsApp en el botón FAB y en #contacto
   □ Actualizar email en .cm-item
   □ Añadir foto real en #sobre-mi (reemplazar placeholder)
   □ Añadir foto/vídeo hero (descomentar <video> en index.html)
   □ Pegar embed de Spotify (sección #musica, panel tracks)
   □ Pegar embed de SoundCloud
   □ Añadir IDs de YouTube a los set-card y video-card
   □ Añadir fotos reales al portfolio (pf-placeholder → <img>)
   □ Conectar formulario a backend (Opción A/B/C/D arriba)
   □ Actualizar links de redes sociales (busca href="#")
   □ Actualizar fechas de disponibilidad en .ca-dates
   □ Añadir testimonios reales
   □ Cambiar "Barcelona" si es otra ciudad
   □ Añadir meta og:image con una captura de pantalla de la web

   ════════════════════════════════════════════════ */