// Mobile helpers: menu sheet, back-to-top button, dots for the swipeable persona cards.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NUM = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- menu sheet (built from the chapter rail so there is one list of sections) ----------
const btn = $('.menu-btn');
const rail = $$('.chapters a');
if (btn && rail.length) {
  const sheet = document.createElement('nav');
  sheet.className = 'menu-sheet';
  sheet.id = 'menu-sheet';
  sheet.hidden = true;
  sheet.setAttribute('aria-label', 'أقسام الصفحة');
  rail.forEach((a, i) => {
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.dataset.ch = a.dataset.ch;
    const n = document.createElement('i');
    n.textContent = NUM[i] ?? String(i + 1);
    link.append(n, a.textContent.trim());
    sheet.append(link);
  });
  const cta = document.createElement('a');
  cta.href = '#join';
  cta.className = 'menu-sheet__cta';
  cta.textContent = 'انضم للفريق';
  sheet.append(cta);
  const scrim = document.createElement('div');
  scrim.className = 'menu-scrim';
  scrim.hidden = true;
  document.body.append(scrim, sheet);

  const setOpen = (open, restoreFocus = true) => {
    btn.setAttribute('aria-expanded', String(open));
    sheet.hidden = !open;
    scrim.hidden = !open;
    if (open) sheet.querySelector('a').focus();
    else if (restoreFocus) btn.focus();
  };
  btn.setAttribute('aria-controls', 'menu-sheet');
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  scrim.addEventListener('click', () => setOpen(false));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) setOpen(false); });

  // mark the current chapter in the sheet
  const sync = () => {
    const current = rail.find((a) => a.getAttribute('aria-current') === 'true')?.dataset.ch;
    $$('a[data-ch]', sheet).forEach((a) => a.setAttribute('aria-current', String(a.dataset.ch === current)));
  };
  new MutationObserver(sync).observe($('.chapters'), { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  sync();
}

// ---------- back to top ----------
const top = document.createElement('button');
top.type = 'button';
top.className = 'to-top';
top.setAttribute('aria-label', 'ارجع لفوق');
top.innerHTML = '<svg aria-hidden="true"><use href="#i-cross"/></svg>';
top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
document.body.append(top);
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { top.classList.toggle('is-on', scrollY > innerHeight * 1.2); ticking = false; });
}, { passive: true });

// ---------- persona carousel dots ----------
function setupPager() {
  const shelves = $('#shelves');
  if (!shelves || $('.pager')) return;
  const cards = $$('.shelf', shelves);
  if (cards.length < 2) return;
  const pager = document.createElement('div');
  pager.className = 'pager';
  const hint = document.createElement('p');
  hint.className = 'pager__hint';
  hint.textContent = 'اسحب علشان تشوف باقي الشخصيات';
  pager.append(hint);
  const dots = cards.map((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `الشخصية ${NUM[i]}`);
    b.addEventListener('click', () => card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }));
    pager.append(b);
    return b;
  });
  shelves.after(pager);
  const mark = (i) => dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  mark(0);
  // The card nearest the middle of the strip is the current one.
  const update = () => {
    const mid = shelves.getBoundingClientRect().left + shelves.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < dist) { dist = d; best = i; } });
    mark(best);
  };
  shelves.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
}
// join.js re-renders the cards when the avatar toggle changes, so watch for the first render and any rebuild.
const shelvesEl = $('#shelves');
if (shelvesEl) {
  setupPager();
  new MutationObserver(() => { const old = $('.pager'); if (old) old.remove(); setupPager(); }).observe(shelvesEl, { childList: true });
}
