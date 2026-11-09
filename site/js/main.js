const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

$$('#year').forEach(el => { el.textContent = new Date().getFullYear(); });

/* Header: solid background once you scroll */
(() => {
  const hdr = $('.hdr');
  if (!hdr) return;
  const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* Fullscreen menu */
(() => {
  const btn = $('.menu-btn');
  const menu = $('#menu');
  if (!btn || !menu) return;
  const label = $('.menu-label', btn);
  const set = open => {
    btn.setAttribute('aria-expanded', open);
    document.body.classList.toggle('menu-open', open);
    if (label) label.textContent = open ? 'Close' : 'Menu';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 350);
    }
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) set(false); });
})();

/* Product: size picker and gallery */
(() => {
  const pdp = $('.pdp');
  if (!pdp) return;
  const price = $('.js-price', pdp);
  const compare = $('.js-compare', pdp);
  const btnPrice = $('.js-btn-price', pdp);
  const update = () => {
    const v = $('input[name="variant"]:checked', pdp);
    price.textContent = `$${v.dataset.price}`;
    compare.textContent = v.dataset.compare ? `$${v.dataset.compare}` : '';
    btnPrice.textContent = `$${v.dataset.price}`;
  };
  $$('input[name="variant"]', pdp).forEach(r => r.addEventListener('change', update));
  update();

  const main = $('.pdp-main', pdp);
  const mainImg = $('.pdp-main-img', pdp);
  $$('.pdp-thumb', pdp).forEach(t => t.addEventListener('click', () => {
    $$('.pdp-thumb', pdp).forEach(x => x.classList.toggle('is-active', x === t));
    mainImg.src = t.dataset.src;
    main.classList.toggle('is-photo', t.dataset.fit === 'photo');
  }));
})();

/* Cart */
(() => {
  const cart = $('.cart');
  if (!cart) return;
  const JARS = { single: 1, duo: 2, kit: 3 };
  const FREE_SHIP_JARS = 2;
  const overlay = $('.overlay');
  const list = $('.cart-list');
  const countEl = $('.cart-count');
  const label = $('.cart-items-label');
  const sumEl = $('.cart-sum');
  const shipMsg = $('.ship-msg');
  const shipBar = $('.ship-bar span');
  const note = $('.cart-note');
  const cartBtn = $('.cart-btn');

  let items = [];
  try { items = JSON.parse(localStorage.getItem('effect-cart')) || []; } catch (e) { items = []; }
  const save = () => { try { localStorage.setItem('effect-cart', JSON.stringify(items)); } catch (e) {} };

  const open = () => {
    overlay.hidden = false;
    requestAnimationFrame(() => cart.classList.add('open'));
    cart.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    cart.classList.remove('open');
    cart.setAttribute('aria-hidden', 'true');
    setTimeout(() => { overlay.hidden = true; }, 400);
  };

  const render = () => {
    const qty = items.reduce((n, it) => n + it.qty, 0);
    const jars = items.reduce((n, it) => n + it.qty * (JARS[it.id] || 1), 0);
    const total = items.reduce((n, it) => n + it.qty * it.price, 0);
    countEl.textContent = qty;
    label.textContent = `(${qty})`;
    sumEl.textContent = `$${total}`;
    const left = Math.max(0, FREE_SHIP_JARS - jars);
    shipMsg.textContent = left ? `Add ${left} more jar${left > 1 ? 's' : ''} for free shipping` : 'You unlocked free shipping';
    shipBar.style.width = `${Math.min(100, (jars / FREE_SHIP_JARS) * 100)}%`;
    if (!items.length) {
      list.innerHTML = '<li class="cart-empty">Your bag is empty.</li>';
      return;
    }
    list.innerHTML = items.map(it => `
      <li class="cart-line" data-id="${it.id}">
        <div class="cart-thumb"><img src="images/jar-disc.jpg" alt=""></div>
        <div>
          <h4>${it.name}</h4>
          <div class="qty">
            <button data-act="dec" aria-label="Decrease">−</button>
            <span>${it.qty}</span>
            <button data-act="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <span>$${it.price * it.qty}</span>
      </li>`).join('');
  };

  $$('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = $('input[name="variant"]:checked');
      if (!v) return;
      const found = items.find(it => it.id === v.value);
      if (found) found.qty++;
      else items.push({ id: v.value, name: v.dataset.name, price: Number(v.dataset.price), qty: 1 });
      save(); render();
      const html = btn.innerHTML;
      btn.textContent = 'Added';
      btn.classList.add('added');
      cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
      setTimeout(() => { btn.innerHTML = html; btn.classList.remove('added'); }, 1300);
      open();
    });
  });

  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.closest('.cart-line').dataset.id;
    const it = items.find(x => x.id === id);
    it.qty += b.dataset.act === 'inc' ? 1 : -1;
    if (it.qty <= 0) items = items.filter(x => x.id !== id);
    save(); render();
  });

  cartBtn.addEventListener('click', open);
  $('.cart-close').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Placeholder until a real store (Shopify, Square, Stripe) is connected
  $('.checkout').addEventListener('click', () => {
    note.textContent = items.length ? 'Checkout is coming soon. Ask Tim at the shop to grab a jar.' : 'Add a jar first.';
  });

  render();
})();

/* Newsletter (front-end only for now) */
(() => {
  const form = $('.news-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    $('.news-msg').textContent = "You're on the list. Thanks!";
    form.reset();
  });
})();

/* Creator application: posts to Netlify Forms when hosted there */
(() => {
  const form = $('.apply-form');
  if (!form) return;
  const msg = $('.apply-msg', form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    msg.textContent = 'Sending…';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      msg.textContent = "Application sent. We'll be in touch by email.";
    } catch (err) {
      msg.textContent = "Couldn't send right now. Applications open once the site is live.";
    }
    btn.disabled = false;
  });
})();

/* Reveal on scroll */
(() => {
  const targets = $$('.intro, .pdp-info, .formula-head, .ing-grid li, .without, .compare, .story-copy, .story-media, .band, .faq-wrap, .newsletter, .c-perks li, .c-how, .c-ideas, .c-who, .c-apply');
  if (!('IntersectionObserver' in window)) return;
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  targets.forEach(el => io.observe(el));
})();

/* Scroll hero: the jar spins and the rounded shape turns as you scroll.
   Optional frame mode: add data-frame-count="120" and
   data-frame-path="images/frames/frame_####.jpg" to .hero to scrub real frames. */
(() => {
  const root = $('.hero');
  if (!root) return;
  const jar = $('.hero-jar', root);
  const img = $('.fsh-canvas', root);
  const shape = $('.hero-shape', root);
  const ring = $('.hero-ring text', root);
  const title = $('.hero-title span', root);
  const steps = $$('.hero-steps li', root);
  const hint = $('.hero-hint', root);
  const fill = $('.hero-progress span', root);

  const frameCount = +root.dataset.frameCount || 0;
  const pattern = root.dataset.framePath || '';
  const framePath = i => pattern.replace('####', String(i).padStart(4, '0'));
  if (frameCount) for (let i = 1; i <= frameCount; i++) { const im = new Image(); im.src = framePath(i); }

  const ease = t => t * t * (3 - 2 * t);
  // p: progress, r: jar spin, s: jar scale
  const K = [
    { p: 0.00, r: -24, s: 0.94 },
    { p: 0.25, r: 0,   s: 1.00 },
    { p: 0.50, r: 90,  s: 1.04 },
    { p: 0.75, r: 180, s: 1.14 },
    { p: 1.00, r: 360, s: 1.00 },
  ];
  const at = p => {
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1].p) i++;
    const a = K[i], b = K[i + 1];
    const t = ease(clamp((p - a.p) / (b.p - a.p)));
    return { r: a.r + (b.r - a.r) * t, s: a.s + (b.s - a.s) * t };
  };

  let target = 0, shown = 0, running = false, lastFrame = -1;

  const render = p => {
    if (frameCount) {
      const idx = Math.round(p * (frameCount - 1));
      if (idx !== lastFrame) { img.src = framePath(idx + 1); lastFrame = idx; }
    } else {
      const k = at(p);
      jar.style.transform = `rotate(${k.r}deg) scale(${k.s})`;
    }
    shape.style.transform = `rotate(${-p * 70}deg)`;
    ring.setAttribute('transform', `rotate(${p * 200} 200 200)`);
    title.parentElement.style.transform = `translateY(${-p * 6}vh)`;
    fill.style.width = p * 100 + '%';
    const active = Math.min(steps.length - 1, Math.floor(p * steps.length));
    steps.forEach((li, i) => li.classList.toggle('is-on', i === active));
  };

  const tick = () => {
    const diff = target - shown;
    shown = Math.abs(diff) < 0.0005 ? target : shown + diff * 0.14;
    render(shown);
    if (shown !== target) requestAnimationFrame(tick);
    else running = false;
  };

  const onScroll = () => {
    const rect = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    target = clamp(-rect.top / Math.max(1, total));
    hint.classList.toggle('is-hidden', rect.top < -8);
    if (!running) { running = true; requestAnimationFrame(tick); }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
