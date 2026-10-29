import { PERSONAS, img } from './personas.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};
const state = { avatar: 'female' };

function renderShelves() {
  const box = $('#shelves');
  box.replaceChildren(...PERSONAS.map((p, i) => {
    const art = el('div', { className: 'shelf__art' }, el('img', { src: img(p, state.avatar, 'front'), alt: `${p.ar}، ${p.en}`, width: 520, height: 832, loading: 'lazy' }));
    const name = el('div', { className: 'shelf__name' }, el('h3', { textContent: p.ar }), el('small', { textContent: `${p.en} · ${p.focus}` }));
    const traits = el('ul', { className: 'chips' }, ...p.traits.map((t) => el('li', { textContent: t })));
    traits.querySelectorAll('li').forEach((li) => li.style.setProperty('--chip', p.color));
    const fits = el('p', { className: 'fits' }, el('strong', { textContent: 'بيناسب الفريق ده: ' }), p.fits.join('، '));
    const body = el('div', { className: 'shelf__body' }, name, el('p', { textContent: p.desc }), traits, fits);
    const pick = el('a', { className: 'btn', href: `join.html?persona=${p.id}&avatar=${state.avatar}`, textContent: 'اختار الدور ده' });
    const shelf = el('article', { className: 'shelf', 'aria-label': p.ar }, art, body, pick);
    shelf.style.setProperty('--tint', p.color);
    shelf.style.setProperty('--i', i);
    return shelf;
  }));
}

function setAvatar(avatar) {
  state.avatar = avatar;
  document.querySelectorAll('.toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.avatar === avatar)));
  renderShelves();
}
document.querySelectorAll('.toggle button').forEach((b) => b.addEventListener('click', () => setAvatar(b.dataset.avatar)));
renderShelves();
