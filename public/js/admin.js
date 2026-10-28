import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db, configured } from './firebase.js';
import { PERSONAS, AVAILABILITY, STATUSES, AVATARS, img } from './personas.js';

const $ = (s) => document.querySelector(s);
const label = (list, v) => list.find((x) => x.value === v)?.label ?? v;
const personaOf = (id) => PERSONAS.find((p) => p.id === id);
const INK = '#2b0a10';

let all = [];
let unsubscribe = null;
const charts = {};

// ---------- auth gate ----------
$('#signin').addEventListener('click', async () => {
  $('#gate-error').textContent = '';
  if (!configured) { $('#gate-error').textContent = 'الموقع لسه مش متوصل بمشروع Firebase.'; return; }
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { if (e.code !== 'auth/popup-closed-by-user') $('#gate-error').textContent = 'معرفناش نسجّل دخولك. جرّب تاني.'; }
});
$('#signout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  unsubscribe?.();
  unsubscribe = null;
  const signedIn = Boolean(user);
  $('#gate').hidden = signedIn;
  $('#dash').hidden = !signedIn;
  $('#signout').hidden = !signedIn;
  if (!signedIn) return;
  // Authorisation is enforced by firestore.rules; a non-admin simply gets permission-denied here.
  unsubscribe = onSnapshot(query(collection(db, 'volunteers'), orderBy('createdAt', 'desc')),
    (snap) => { $('#table-error').textContent = ''; all = snap.docs.map((d) => ({ id: d.id, ...d.data() })); render(); },
    (err) => {
      if (err.code === 'permission-denied') {
        signOut(auth).then(() => { $('#gate-text').textContent = 'الحساب ده مش مصرح له يشوف البيانات.'; });
      } else { $('#table-error').textContent = 'معرفناش نحمّل البيانات. جرّب تحدّث الصفحة.'; }
    });
});

// ---------- filters ----------
$('#f-persona').append(...PERSONAS.map((p) => Object.assign(document.createElement('option'), { value: String(p.id), textContent: p.ar })));
$('#f-status').append(...STATUSES.map((s) => Object.assign(document.createElement('option'), { value: s.value, textContent: s.label })));
['#q', '#f-persona', '#f-status'].forEach((s) => $(s).addEventListener('input', renderTable));

const filtered = () => {
  const q = $('#q').value.trim().toLowerCase();
  const p = $('#f-persona').value, s = $('#f-status').value;
  return all.filter((v) => (!p || String(v.persona) === p) && (!s || v.status === s) && (!q || `${v.name} ${v.phone}`.toLowerCase().includes(q)));
};

// ---------- render ----------
const fmt = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
const when = (v) => (v.createdAt?.toDate ? v.createdAt.toDate() : null);

function render() { renderKpis(); renderCharts(); renderTable(); }

function renderKpis() {
  const week = Date.now() - 7 * 864e5;
  const n = (s) => all.filter((v) => v.status === s).length;
  $('#k-total').textContent = all.length;
  $('#k-week').textContent = all.filter((v) => (when(v)?.getTime() ?? 0) >= week).length;
  $('#k-new').textContent = n('new');
  $('#k-contacted').textContent = n('contacted');
  $('#k-onboarded').textContent = n('onboarded');
}

function chart(id, type, labels, data, colors, opts = {}) {
  charts[id]?.destroy();
  charts[id] = new Chart($(id), {
    type,
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: INK, borderWidth: type === 'line' ? 3 : 2, borderRadius: type === 'bar' ? 12 : 0, tension: 0.35, fill: type === 'line' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: type === 'doughnut', position: 'bottom', labels: { color: INK, font: { family: 'IBM Plex Sans Arabic', size: 13 } } } },
      scales: type === 'doughnut' ? {} : { y: { beginAtZero: true, ticks: { precision: 0, color: INK } }, x: { ticks: { color: INK, font: { family: 'IBM Plex Sans Arabic' } } } },
      ...opts,
    },
  });
}

function renderCharts() {
  if (typeof Chart === 'undefined') return;
  const count = (fn, keys) => keys.map((k) => all.filter((v) => fn(v) === k).length);
  chart('#c-persona', 'bar', PERSONAS.map((p) => p.ar), count((v) => v.persona, PERSONAS.map((p) => p.id)), PERSONAS.map((p) => p.color));
  chart('#c-availability', 'doughnut', ['أيام الأسبوع', 'الويك إند', 'مرن'], count((v) => v.availability, AVAILABILITY.map((a) => a.value)), ['#f4d98a', '#c9892a', '#7a1c2b']);
  chart('#c-status', 'bar', STATUSES.map((s) => s.label), count((v) => v.status, STATUSES.map((s) => s.value)), ['#f4d98a', '#d9a93a', '#7a1c2b']);
  const answered = all.filter((v) => typeof v.trainingTaken === 'boolean');
  chart('#c-training', 'doughnut', ['أخد إعداد', 'لسه', 'مجاوبش'], [answered.filter((v) => v.trainingTaken).length, answered.filter((v) => !v.trainingTaken).length, all.length - answered.length], ['#d9a93a', '#7a1c2b', '#e8cf9c']);
  chart('#c-avatar', 'doughnut', AVATARS.map((a) => a.label), count((v) => v.avatar, AVATARS.map((a) => a.value)), ['#7a1c2b', '#d9a93a']);
  const days = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const key = (d) => d.toDateString();
  const perDay = new Map(days.map((d) => [key(d), 0]));
  all.forEach((v) => { const d = when(v); if (d && perDay.has(key(d))) perDay.set(key(d), perDay.get(key(d)) + 1); });
  chart('#c-time', 'line', days.map((d) => d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })), [...perDay.values()], 'rgba(217,169,58,0.5)');
}

// A stored link is only turned into a clickable anchor when it is a real http(s) address.
function linkChip(u) {
  let url;
  try { url = new URL(u); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const a = document.createElement('a');
  a.href = url.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer nofollow';
  a.className = 'chip-link';
  a.title = url.href;
  a.textContent = url.hostname.replace(/^www\./, '');
  return a;
}
const linkChips = (links) => (Array.isArray(links) ? links.map(linkChip).filter(Boolean) : []);
const trainingText = (v) => (typeof v.trainingTaken !== 'boolean' ? '' : v.trainingTaken ? `أيوه · ${v.trainingYear} · ${v.trainingName}` : 'لأ');

function renderTable() {
  const list = filtered();
  $('#count-line').textContent = `${list.length} من ${all.length}`;
  $('#rows').replaceChildren(...list.map((v) => {
    const p = personaOf(v.persona);
    const tr = document.createElement('tr');
    const cell = (cls, ...kids) => { const td = document.createElement('td'); if (cls) td.className = cls; td.append(...kids); return td; };
    const who = document.createElement('div');
    who.className = 'who';
    if (p) { const im = Object.assign(document.createElement('img'), { src: img(p, v.avatar === 'male' ? 'male' : 'female', 'face'), alt: '', width: 40, height: 40 }); who.append(im, p.ar); }
    const sel = document.createElement('select');
    sel.className = 'input';
    sel.setAttribute('aria-label', `حالة ${v.name}`);
    STATUSES.forEach((s) => sel.append(Object.assign(document.createElement('option'), { value: s.value, textContent: s.label, selected: s.value === v.status })));
    sel.addEventListener('change', async () => {
      sel.disabled = true;
      try { await updateDoc(doc(db, 'volunteers', v.id), { status: sel.value }); }
      catch { sel.value = v.status; $('#table-error').textContent = 'معرفناش نغيّر الحالة.'; }
      sel.disabled = false;
    });
    tr.append(
      cell('', when(v) ? fmt.format(when(v)) : '...'),
      cell('', v.name ?? ''),
      cell('phone', v.phone ?? ''),
      cell('', who),
      cell('', label(AVAILABILITY, v.availability) ?? ''),
      cell('skill', v.skill ?? ''),
      cell('training', trainingText(v)),
      cell('links', ...linkChips(v.links)),
      cell('', sel),
    );
    return tr;
  }));
}

// ---------- CSV ----------
const safe = (s) => { const t = String(s ?? ''); return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; };
$('#csv').addEventListener('click', () => {
  const head = ['التاريخ', 'الاسم', 'الموبايل', 'الشخصية', 'شكل الشخصية', 'الوقت', 'ملاحظة', 'أخد إعداد خدام', 'سنة الإعداد', 'اسم الإعداد', 'الروابط', 'الحالة'];
  const lines = filtered().map((v) => [when(v)?.toISOString() ?? '', v.name, v.phone, personaOf(v.persona)?.ar, label(AVATARS, v.avatar), label(AVAILABILITY, v.availability), v.skill, typeof v.trainingTaken === 'boolean' ? (v.trainingTaken ? 'أيوه' : 'لأ') : '', v.trainingYear, v.trainingName, Array.isArray(v.links) ? v.links.join(' | ') : '', label(STATUSES, v.status)]
    .map((c) => `"${safe(c).replaceAll('"', '""')}"`).join(','));
  const blob = new Blob(['﻿' + [head.map((h) => `"${h}"`).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `volunteers-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
});
