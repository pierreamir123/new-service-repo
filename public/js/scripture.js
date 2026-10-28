import { VERSES, TRANSLATION } from './verses.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

// Wrap every word in a highlighter stroke, cycling through six marker colours (hl1..hl6).
function highlighted(text, offset = 0) {
  const frag = document.createDocumentFragment();
  text.split(/\s+/).filter(Boolean).forEach((w, i) => {
    if (i) frag.append(' ');
    const span = el('span', { className: `hl hl${((i + offset) % 6) + 1}`, textContent: w });
    span.style.setProperty('--w', i);
    frag.append(span);
  });
  return frag;
}

const byId = Object.fromEntries(VERSES.map((v) => [v.id, v]));
const NOTES = ['coral', 'mint', 'sky', 'sun'];
const TILT = ['-2.2deg', '1.6deg', '-1.2deg', '2deg'];

function renderJournal(root) {
  const feature = byId.nehemiah;
  const cross = el('span', { className: 'verse-cross', ariaHidden: 'true' });
  cross.innerHTML = '<svg aria-hidden="true"><use href="#i-cross"/></svg>';
  const figure = el('figure', { className: 'verse-feature' },
    cross,
    el('p', { className: 'hand-eyebrow', textContent: 'محطة الوصول' }),
    el('blockquote', { className: 'verse-feature__text', lang: 'ar' }, highlighted(feature.text)),
    el('figcaption', { className: 'verse-ref' }, el('span', { className: 'scribble', textContent: feature.ref })),
  );

  const stops = VERSES.filter((v) => v.id !== 'nehemiah').map((v, i) => {
    const pin = el('span', { className: 'pin', 'aria-hidden': 'true', textContent: String(i + 1).replace(/\d/, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) });
    const q = el('blockquote', { className: 'stop__text', lang: 'ar' }, highlighted(v.text, i + 2));
    const ref = el('p', { className: 'verse-ref' }, el('span', { className: 'scribble', textContent: v.ref }));
    const li = el('li', { className: `stop stop--${NOTES[i % NOTES.length]}` }, pin, q, ref);
    li.style.setProperty('--tilt', TILT[i % TILT.length]);
    return li;
  });

  root.replaceChildren(
    figure,
    el('ol', { className: 'trail', 'aria-label': 'آيات على الطريق' }, ...stops),
    el('p', { className: 'source', textContent: `النص: ${TRANSLATION}` }),
  );
}

function renderClosing(node) {
  if (!node) return;
  node.replaceChildren(highlighted(byId.nehemiah.text, 1));
}

const root = $('#scripture-root');
if (root) renderJournal(root);
renderClosing($('#closing-verse'));
