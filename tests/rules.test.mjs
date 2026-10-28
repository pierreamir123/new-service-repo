// Run with the Firestore emulator up:  npm run test:rules
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ADMIN = 'pierrebassily@gmail.com'; // keep in sync with isAdmin() in firestore.rules
const env = await initializeTestEnvironment({
  projectId: 'demo-church-volunteers',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
});

await env.clearFirestore(); // start from an empty database so reruns behave the same

const valid = () => ({ name: 'مينا جرجس', phone: '01012345678', persona: 3, avatar: 'male', availability: 'weekend', skill: '', consent: true, status: 'new', createdAt: serverTimestamp() });
const anon = env.unauthenticatedContext().firestore();
const admin = env.authenticatedContext('admin-uid', { email: ADMIN, email_verified: true }).firestore();
const other = env.authenticatedContext('other-uid', { email: 'someone@example.com', email_verified: true }).firestore();

let n = 0;
const t = async (name, fn) => { await fn(); console.log('ok', ++n, name); };

await t('public can submit a valid registration', () => assertSucceeds(setDoc(doc(anon, 'volunteers/a1'), valid())));
await t('public cannot read it back', () => assertFails(getDoc(doc(anon, 'volunteers/a1'))));
await t('signed-in non-admin cannot read', () => assertFails(getDoc(doc(other, 'volunteers/a1'))));
await t('admin can read', () => assertSucceeds(getDoc(doc(admin, 'volunteers/a1'))));
await t('extra field is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/b1'), { ...valid(), admin: true })));
await t('bad phone is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/b2'), { ...valid(), phone: '12345' })));
await t('status other than new is rejected on create', () => assertFails(setDoc(doc(anon, 'volunteers/b3'), { ...valid(), status: 'onboarded' })));
await t('missing consent is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/b4'), { ...valid(), consent: false })));
await t('client-chosen timestamp is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/b5'), { ...valid(), createdAt: new Date('2020-01-01') })));
await t('public cannot change status', () => assertFails(updateDoc(doc(anon, 'volunteers/a1'), { status: 'contacted' })));
await t('admin can change status', () => assertSucceeds(updateDoc(doc(admin, 'volunteers/a1'), { status: 'contacted' })));
await t('admin cannot change other fields', () => assertFails(updateDoc(doc(admin, 'volunteers/a1'), { name: 'x' })));

// ---- service-training answers and links ----
const trained = { trainingTaken: true, trainingYear: '2022', trainingName: 'إعداد خدام الكنيسة' };
await t('training answered yes with year, name and links is accepted', () => assertSucceeds(setDoc(doc(anon, 'volunteers/c1'), { ...valid(), ...trained, links: ['https://instagram.com/mina', 'https://www.behance.net/mina'] })));
await t('training answered no is accepted', () => assertSucceeds(setDoc(doc(anon, 'volunteers/c2'), { ...valid(), trainingTaken: false, trainingYear: '', trainingName: '', links: [] })));
await t('old-style registration without the new keys is still accepted', () => assertSucceeds(setDoc(doc(anon, 'volunteers/c3'), valid())));
await t('training yes without a name is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d1'), { ...valid(), trainingTaken: true, trainingYear: '2022', trainingName: '' })));
await t('training yes without a year is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d2'), { ...valid(), trainingTaken: true, trainingYear: '', trainingName: 'إعداد' })));
await t('training year that is not text is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d3'), { ...valid(), ...trained, trainingYear: 2022 })));
await t('over-long training name is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d4'), { ...valid(), ...trained, trainingName: 'ا'.repeat(121) })));
await t('four links are rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d5'), { ...valid(), links: ['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com'] })));
await t('javascript: link is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d6'), { ...valid(), links: ['javascript:alert(1)'] })));
await t('link with spaces is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d7'), { ...valid(), links: ['https://a.com/has space'] })));
await t('over-long link is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d8'), { ...valid(), links: ['https://a.com/' + 'x'.repeat(200)] })));
await t('links that are not a list are rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d9'), { ...valid(), links: 'https://a.com' })));
await t('second link bad while first is fine is rejected', () => assertFails(setDoc(doc(anon, 'volunteers/d10'), { ...valid(), links: ['https://a.com', 'ftp://b.com'] })));

await env.cleanup();
console.log(`all ${n} rules checks passed`);
