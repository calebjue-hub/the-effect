document.getElementById('year').textContent = new Date().getFullYear();

/* Rotating announcement bar */
(() => {
  const items = [...document.querySelectorAll('.promo-item')];
  let i = 0;
  setInterval(() => {
    const cur = items[i];
    cur.classList.remove('is-active');
    cur.classList.add('is-leaving');
    setTimeout(() => cur.classList.remove('is-leaving'), 500);
    i = (i + 1) % items.length;
    items[i].classList.add('is-active');
  }, 4000);
})();

/* Mobile menu */
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* Cart */
(() => {
  const JARS = { single: 1, duo: 2, kit: 3 };
  const FREE_SHIP_JARS = 2;
  const cart = document.querySelector('.cart');
  const overlay = document.querySelector('.overlay');
  const list = document.querySelector('.cart-list');
  const countEl = document.querySelector('.cart-count');
  const label = document.querySelector('.cart-items-label');
  const sumEl = document.querySelector('.cart-sum');
  const shipMsg = document.querySelector('.ship-msg');
  const shipBar = document.querySelector('.ship-bar span');
  const note = document.querySelector('.cart-note');
  const cartBtn = document.querySelector('.cart-btn');

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
    setTimeout(() => { overlay.hidden = true; }, 350);
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
        <div class="cart-thumb"><img src="images/texture-jar.jpg" alt=""></div>
        <div>
          <h4>${it.name}</h4>
          <div class="qty">
            <button data-act="dec" aria-label="Decrease">−</button>
            <span>${it.qty}</span>
            <button data-act="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <span class="cart-line-price">$${it.price * it.qty}</span>
      </li>`).join('');
  };

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.closest('.product').dataset;
      const found = items.find(it => it.id === p.id);
      if (found) found.qty++;
      else items.push({ id: p.id, name: p.name, price: Number(p.price), qty: 1 });
      save(); render();
      btn.textContent = 'ADDED ✓';
      btn.classList.add('added');
      cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump');
      setTimeout(() => { btn.textContent = 'ADD TO BAG'; btn.classList.remove('added'); }, 1400);
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
  document.querySelector('.cart-close').addEventListener('click', close);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Placeholder until a real store (Shopify, Square, Stripe) is connected
  document.querySelector('.checkout').addEventListener('click', () => {
    note.textContent = items.length ? 'Checkout is coming soon. Ask Tim at the shop to grab a jar.' : 'Add a jar first.';
  });

  render();
})();

/* Newsletter (front-end only for now) */
document.querySelector('.news-form').addEventListener('submit', e => {
  e.preventDefault();
  document.querySelector('.news-msg').textContent = "You're on the list. Thanks!";
  e.target.reset();
});

/* Reveal on scroll */
(() => {
  const targets = document.querySelectorAll('.section-head, .product, .steps li, .founder-copy, .founder-media, .value-copy, .banner-copy, .faq details, .scale');
  targets.forEach(el => { if (!el.classList.contains('scale')) el.classList.add('reveal'); });
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  targets.forEach(el => io.observe(el));
})();

/* Scroll hero: plain-JS port of FrameSequenceHero.
   Photo mode (default): scroll drives a spin / tilt / zoom of the jar photo.
   Frame mode: set data-frame-count + data-frame-path ("…frame_####.jpg") on
   .fsh and scroll scrubs through the frames instead, like the original. */
(() => {
  const root = document.querySelector('.fsh');
  if (!root) return;

  const img = root.querySelector('.fsh-canvas');
  const copy = root.querySelector('.fsh-copy');
  const sub = root.querySelector('.fsh-sub');
  const fill = root.querySelector('.fsh-progress-fill');
  const cards = [...root.querySelectorAll('.fsh-card')];
  const steps = cards.map(c => ({ from: +c.dataset.from, to: +c.dataset.to }));

  // One tick row per card, one tick per step (same as the React version)
  const tickRows = cards.map(c => {
    const row = c.querySelector('.fsh-ticks');
    row.innerHTML = steps.map(() => '<i class="fsh-tick"><span></span></i>').join('');
    return [...row.querySelectorAll('.fsh-tick span')];
  });

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);

  /* ---- Frame mode (optional) ---- */
  const frameCount = +root.dataset.frameCount || 0;
  const pattern = root.dataset.framePath || '';
  const framePath = i => pattern.replace('####', String(i).padStart(4, '0'));
  if (frameCount) {
    root.classList.add('has-frames');
    const text = root.querySelector('.fsh-loader-text');
    const bar = root.querySelector('.fsh-loader-fill');
    const eager = Math.min(60, frameCount);
    let loaded = 0;
    const loadOne = i => {
      const im = new Image();
      im.decoding = 'async';
      const settle = () => {
        loaded++;
        const pct = Math.round((loaded / frameCount) * 100);
        text.textContent = pct < 100 ? `Loading · ${pct}%` : 'Ready';
        bar.style.width = pct + '%';
        if (loaded === eager) {
          root.classList.add('frames-ready');
          for (let j = eager; j < frameCount; j++) loadOne(j);
        }
      };
      im.onload = settle; im.onerror = settle;
      im.src = framePath(i + 1);
    };
    for (let i = 0; i < eager; i++) loadOne(i);
    img.src = framePath(1);
  }

  /* ---- Photo mode keyframes: scale, spin (deg), tilt (deg), lift (%) ---- */
  const K = [
    { p: 0.00, s: 0.90, r: -30, rx: 0,  y: 2 },
    { p: 0.22, s: 1.00, r: 0,   rx: 0,  y: 0 },  // 01 hold: spins in
    { p: 0.47, s: 1.00, r: 0,   rx: 42, y: 4 },  // 02 shine: tilts toward the light
    { p: 0.72, s: 1.6,  r: 0,   rx: 0,  y: -6 }, // 03 texture: zooms into the label
    { p: 1.00, s: 0.95, r: 360, rx: 0,  y: 0 },  // 04 barber: pulls back with a full turn
  ];
  const at = p => {
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1].p) i++;
    const a = K[i], b = K[i + 1];
    const t = ease(clamp((p - a.p) / (b.p - a.p)));
    const mix = k => a[k] + (b[k] - a[k]) * t;
    return { s: mix('s'), r: mix('r'), rx: mix('rx'), y: mix('y') };
  };

  let target = 0, shown = 0, lastFrame = -1, running = false;

  const render = p => {
    if (frameCount) {
      const idx = Math.round(p * (frameCount - 1));
      if (idx !== lastFrame) { img.src = framePath(idx + 1); lastFrame = idx; }
    } else {
      const k = at(p);
      img.style.transform = `translateY(${k.y}%) rotateX(${k.rx}deg) rotate(${k.r}deg) scale(${k.s})`;
      // Fade the title while the jar is zoomed in so they don't collide
      const fade = clamp((p - 0.5) / 0.12) * (1 - clamp((p - 0.82) / 0.12));
      copy.style.opacity = 1 - fade;
    }

    fill.style.width = p * 100 + '%';

    let active = -1, local = 0;
    steps.forEach((s, i) => {
      if (p >= s.from && p < s.to) { active = i; local = (p - s.from) / (s.to - s.from); }
    });
    cards.forEach((c, i) => {
      c.classList.toggle('fsh-card-active', i === active);
      c.classList.toggle('fsh-card-prev', active >= 0 && i < active);
    });
    if (active >= 0) {
      tickRows[active].forEach((t, j) => {
        t.style.transform = `scaleX(${j < active ? 1 : j === active ? clamp(local) : 0})`;
      });
    }
  };

  const tick = () => {
    const diff = target - shown;
    shown = Math.abs(diff) < 0.0005 ? target : shown + diff * 0.16;
    render(shown);
    if (shown !== target) requestAnimationFrame(tick);
    else running = false;
  };

  const onScroll = () => {
    const rect = root.getBoundingClientRect();
    const total = root.offsetHeight - window.innerHeight;
    target = clamp(-rect.top / Math.max(1, total));
    sub.classList.toggle('fsh-sub-hidden', rect.top < -8);
    if (!running) { running = true; requestAnimationFrame(tick); }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
