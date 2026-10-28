// Seeds sample registrations into the LOCAL Firestore emulator only (demo project). Never run against production.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-church-volunteers', firestore: { host: '127.0.0.1', port: 8085 } });
const names = ['مريم سمير', 'بيتر عادل', 'مينا ماهر', 'ماري جرجس', 'كيرلس نبيل', 'سارة وجيه', 'يوسف رأفت', 'مونيكا ثروت', 'أندرو فادي', 'إيرين كمال', 'مارك صموئيل', 'نانسي هاني'];
const avail = ['weekdays', 'weekend', 'flexible'];
const status = ['new', 'new', 'new', 'contacted', 'contacted', 'onboarded'];
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (let i = 0; i < names.length; i++) {
    const daysAgo = Math.floor(i * 2.3);
    await setDoc(doc(db, 'volunteers', `seed${i}`), {
      name: names[i], phone: `01${[0, 1, 2, 5][i % 4]}${String(10000000 + i * 1234567).slice(0, 8)}`,
      persona: (i % 5) + 1, avatar: i % 3 === 0 ? 'male' : 'female', availability: avail[i % 3],
      skill: i % 2 ? 'تصميم وتصوير' : '', consent: true, status: status[i % status.length],
      createdAt: Timestamp.fromDate(new Date(Date.now() - daysAgo * 864e5 - i * 36e5)),
    });
  }
});
console.log(`seeded ${names.length} sample registrations`);
await env.cleanup();
