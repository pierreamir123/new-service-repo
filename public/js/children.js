// Interactive 90-minute lab timeline: tap a station to read what happens in it.
const lab = document.querySelector('[data-lab]');
const detail = document.getElementById('lab-detail');
if (lab && detail) {
  const items = [...lab.querySelectorAll('.lab__st')];
  const select = (i) => {
    items.forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.querySelector('button').setAttribute('aria-pressed', String(k === i));
    });
    const li = items[i];
    const title = document.createElement('strong');
    title.textContent = li.querySelector('b').textContent;
    detail.replaceChildren(title, li.querySelector('p').textContent);
  };
  items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => select(i)));
  lab.classList.add('lab--ready');
  select(0);
}
