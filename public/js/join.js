import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db, configured } from './firebase.js';
import { PERSONAS, AVAILABILITY, AVATARS, img } from './personas.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NUM = ['١', '٢', '٣'];
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids);
  return n;
};

const state = { avatar: 'female', persona: null };
const personaById = (id) => PERSONAS.find((p) => p.id === id);


// ---------- form pickers ----------
function choice(name, value, labelNode, checked, onChange, extraClass = '') {
  const input = el('input', { type: 'radio', name, value, checked });
  input.addEventListener('change', onChange);
  return el('label', { className: `choice ${extraClass}`.trim() }, input, labelNode, el('span', { className: 'dot', 'aria-hidden': 'true' }));
}

function renderPickers() {
  $('#persona-picker').replaceChildren(...PERSONAS.map((p) =>
    choice('persona', String(p.id), el('span', {}, el('img', { className: 'face', src: img(p, state.avatar, 'face'), alt: '', width: 360, height: 360, loading: 'lazy' }), el('span', { textContent: p.ar })), state.persona === p.id, () => selectPersona(p.id))));
  const shown = personaById(state.persona) || PERSONAS[0];
  $('#avatar-picker').replaceChildren(...AVATARS.map((a) =>
    choice('avatar', a.value, el('span', {}, el('img', { className: 'face', src: img(shown, a.value, 'face'), alt: '', width: 360, height: 360, loading: 'lazy' }), el('span', { textContent: a.label })), state.avatar === a.value, () => setAvatar(a.value))));
  $('#availability-picker').replaceChildren(...AVAILABILITY.map((a) =>
    choice('availability', a.value, el('span', { textContent: a.label }), $('input[name=availability]:checked')?.value === a.value, () => {}, 'choice--row')));
}

function selectPersona(id) {
  state.persona = id;
  const keep = $('input[name=availability]:checked')?.value;
  renderPickers();
  if (keep) { const r = $(`input[name=availability][value=${keep}]`); if (r) r.checked = true; }
  $('#err-persona').textContent = '';
  refreshLive();
}

// ---------- service-training question and links ----------
const TRAINING = [{ value: 'yes', label: 'أيوه' }, { value: 'no', label: 'لأ، لسه' }];
const MAX_LINKS = 3;

function renderTraining() {
  $('#training-picker').replaceChildren(...TRAINING.map((o) =>
    choice('training', o.value, el('span', { textContent: o.label }), false, toggleTraining, 'choice--row')));
}
function toggleTraining() {
  $('#training-more').hidden = $('input[name=training]:checked')?.value !== 'yes';
  $('#err-training').textContent = '';
  refreshLive();
}

function relabelLinks() {
  const rows = $$('#link-rows .link-row');
  rows.forEach((row, i) => {
    row.querySelector('input').setAttribute('aria-label', `رابط ${NUM[i]}`);
    const rm = row.querySelector('.link-remove');
    rm.hidden = rows.length < 2;
    rm.setAttribute('aria-label', `امسح رابط ${NUM[i]}`);
  });
  $('#add-link').hidden = rows.length >= MAX_LINKS;
}
function addLinkRow() {
  if ($$('#link-rows .link-row').length >= MAX_LINKS) return;
  const input = el('input', { className: 'input', type: 'text', inputMode: 'url', autocomplete: 'off', maxLength: 200, placeholder: 'https://' });
  const remove = el('button', { type: 'button', className: 'link-remove', textContent: '×' });
  const row = el('div', { className: 'link-row' }, input, remove);
  remove.addEventListener('click', () => { row.remove(); relabelLinks(); $('#err-links').textContent = ''; });
  $('#link-rows').append(row);
  relabelLinks();
  return input;
}
$('#add-link').addEventListener('click', () => addLinkRow()?.focus());

// Accepts "instagram.com/x" and adds https://. Returns '' for empty, null for anything that is not a plain web link.
function normalizeUrl(raw) {
  let v = raw.trim();
  if (!v) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // javascript:, mailto:, data: and similar
    v = 'https://' + v;
  }
  let u;
  try { u = new URL(v); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || /\s/.test(v)) return null;
  return u.href.length <= 200 ? u.href : null;
}

// ---------- live ticket preview and step progress ----------
function refreshLive() {
  const p = personaById(state.persona);
  const name = $('#name').value.trim();
  const avail = $('input[name=availability]:checked')?.value;
  const ticketImg = $('#ticket-img');
  const src = img(p || PERSONAS[0], state.avatar, 'front');
  if (ticketImg && !ticketImg.src.endsWith(src)) ticketImg.src = src;
  $('#ticket-name').textContent = name || 'اسمك هنا';
  $('#ticket-role').textContent = p ? `${p.ar} · ${p.focus}` : 'اختار شخصيتك';
  $('#ticket-time').textContent = avail ? AVAILABILITY.find((a) => a.value === avail).label : '';
  const tr = $('input[name=training]:checked')?.value;
  const trainingDone = tr === 'no' || (tr === 'yes' && $('#training-year').value.trim() !== '' && $('#training-name').value.trim().length >= 2);
  const done = [Boolean(p), Boolean(p), name.length >= 2 && PHONE_RE.test(normalizePhone($('#phone').value)), Boolean(avail), trainingDone];
  document.querySelectorAll('.steps li').forEach((li, i) => li.classList.toggle('is-done', done[i]));
  $('.ticket').classList.toggle('is-ready', done.every(Boolean));
}
$('#join-form').addEventListener('input', refreshLive);
$('#join-form').addEventListener('change', refreshLive);

// ---------- validation ----------
const toLatinDigits = (s) => s.replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, (d) => d.charCodeAt(0) - 0x6f0);
function normalizePhone(raw) {
  let p = toLatinDigits(raw).replace(/[\s\-().]/g, '');
  if (p.startsWith('+20')) p = '0' + p.slice(3);
  else if (p.startsWith('0020')) p = '0' + p.slice(4);
  else if (/^20\d{10}$/.test(p)) p = '0' + p.slice(2);
  return p;
}
const PHONE_RE = /^01[0125]\d{8}$/;

function setError(id, msg, inputId) {
  $(`#${id}`).textContent = msg;
  const i = inputId && $(`#${inputId}`);
  if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}

function validate() {
  const name = $('#name').value.trim();
  const phone = normalizePhone($('#phone').value);
  const availability = $('input[name=availability]:checked')?.value;
  const trainingChoice = $('input[name=training]:checked')?.value;
  const trainingYear = toLatinDigits($('#training-year').value.trim()).slice(0, 20);
  const trainingName = $('#training-name').value.trim().slice(0, 120);
  const links = [];
  let linkError = '';
  $$('#link-rows input').forEach((input, i) => {
    const raw = input.value.trim();
    if (!raw) return;
    const u = normalizeUrl(raw);
    if (u) { if (!links.includes(u)) links.push(u); }
    else if (!linkError) linkError = `رابط ${NUM[i]} مش مظبوط، اكتبه زي https://instagram.com/اسمك`;
  });
  const wantsYes = trainingChoice === 'yes';
  const results = [
    setError('err-persona', state.persona ? '' : 'اختار شخصية الأول.'),
    setError('err-name', name.length >= 2 ? '' : 'اكتب اسمك (حرفين على الأقل).', 'name'),
    setError('err-phone', PHONE_RE.test(phone) ? '' : 'اكتب رقم موبايل مصري صح، زي 01012345678.', 'phone'),
    setError('err-availability', availability ? '' : 'اختار إمتى تقدر تخدم.'),
    setError('err-training', trainingChoice ? '' : 'جاوب على السؤال ده.'),
    setError('err-training-year', !wantsYes || trainingYear ? '' : 'اكتب السنة.', 'training-year'),
    setError('err-training-name', !wantsYes || trainingName.length >= 2 ? '' : 'اكتب اسم الإعداد.', 'training-name'),
    setError('err-links', linkError),
    setError('err-consent', $('#consent').checked ? '' : 'محتاجين موافقتك علشان نتواصل معاك.'),
  ];
  return results.every(Boolean)
    ? { name, phone, availability, trainingTaken: wantsYes, trainingYear: wantsYes ? trainingYear : '', trainingName: wantsYes ? trainingName : '', links }
    : null;
}

// ---------- submit ----------
$('#join-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('err-form', '');
  const ok = validate();
  if (!ok) { const first = document.querySelector('.error:not(:empty)'); first?.closest('fieldset, div')?.scrollIntoView({ block: 'center' }); return; }
  if ($('input[name=website]').value) return showSuccess(); // honeypot: bots see success, nothing is saved
  if (!configured) return setError('err-form', 'الموقع لسه مش متوصل بقاعدة البيانات. جرّب بعد شوية.');

  const btn = $('#submit');
  btn.disabled = true;
  btn.textContent = 'ثانية واحدة...';
  try {
    // addDoc never rejects while offline (the write is queued), so give up waiting after 12 s and tell the user.
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000));
    await Promise.race([timeout, addDoc(collection(db, 'volunteers'), {
      name: ok.name,
      phone: ok.phone,
      persona: state.persona,
      avatar: state.avatar,
      availability: ok.availability,
      skill: $('#skill').value.trim().slice(0, 300),
      trainingTaken: ok.trainingTaken,
      trainingYear: ok.trainingYear,
      trainingName: ok.trainingName,
      links: ok.links,
      consent: true,
      status: 'new',
      createdAt: serverTimestamp(),
    })]);
    showSuccess(ok.name);
  } catch (err) {
    console.error(err);
    setError('err-form', err.message === 'timeout'
      ? 'الاتصال ضعيف ومعرفناش نأكد التسجيل. اتأكد من النت وجرّب تاني.'
      : 'حصلت مشكلة وإحنا بنسجّلك. جرّب تاني بعد شوية.');
    btn.disabled = false;
    btn.textContent = 'سجّلني في الفريق';
  }
});

function showSuccess(name = '') {
  const p = personaById(state.persona);
  $('#join-form').hidden = true;
  const s = $('#success');
  $('#success-img').src = img(p, state.avatar, 'wave');
  $('#success-img').alt = `${p.ar} بيرحّب بيك`;
  $('#success-title').textContent = name ? `اتسجلت يا ${name.split(' ')[0]}!` : 'اتسجلت!';
  $('#success-text').textContent = `اخترت «${p.ar}» (${p.focus}). هنتواصل معاك قريب علشان نظبط دورك في الفريق.`;
  s.hidden = false;
  s.focus();
}

const qs = new URLSearchParams(location.search);
if (['female', 'male'].includes(qs.get('avatar'))) state.avatar = qs.get('avatar');
if (personaById(Number(qs.get('persona')))) state.persona = Number(qs.get('persona'));
renderPickers();
renderTraining();
addLinkRow();
refreshLive();
