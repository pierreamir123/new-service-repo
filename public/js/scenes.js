// Scroll scenes: progress bar, chapter rail, reveal-on-scroll, hero parallax.
// Does nothing (content stays fully visible, no snapping animation) for visitors who prefer reduced motion.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- chapter rail (works with or without motion) ----------
const links = $$('.chapters a');
const chapters = $$('.chapter').filter((c) => c.id);
function setActive(id) {
  links.forEach((a) => a.setAttribute('aria-current', String(a.dataset.ch === id)));
}
if ('IntersectionObserver' in window && chapters.length) {
  const active = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-42% 0px -55% 0px' });
  chapters.forEach((c) => active.observe(c));
}
setActive('hero');

// ---------- progress bar (always shown; it is not motion) ----------
const bar = $('.progress i');
const hero = $('#hero');
let ticking = false;
function frame() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  if (hero && !reduce) hero.style.setProperty('--hp', Math.min(1, scrollY / Math.max(1, hero.offsetHeight)).toFixed(3));
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
addEventListener('resize', frame);
frame();

// ---------- reveal on scroll ----------
if (!reduce && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  const groups = [
    '.hero__copy > *', '.facts > *', '.section-head > *', '.vision-statement', '.pillars > *', '.mission-banner', '.goal__title', '.goal-path', '.goal-path > *', '.arches > *', '.medals-wrap > .goal__title', '.medal',
    '.waves > *', '.labbox > *', '.rankbox > *', '.ranks > *', '.join__intro > :not(.seal)', '.join__card', '.faq details', '.closing > :not(.closing__church):not(.closing__palm):not(.closing__cross)',
    '.verse-feature', '.trail > *', '.journal__foot > *', '.divider', '.textile',
  ];
  const seen = new Set();
  groups.forEach((sel) => $$(sel).forEach((n, i) => {
    if (seen.has(n)) return;
    seen.add(n);
    n.setAttribute('data-reveal', '');
    n.style.setProperty('--d', `${(i % 6) * 80}ms`);
  }));
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((n) => io.observe(n));
}
