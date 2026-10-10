// Firestore & Auth palsu di memori — cukup untuk menguji logika sinkronisasi aplikasi.
export const store = new Map();       // path -> data
let counter = 0;
export const auth = {}; export const db = {}; 
export const googleProvider = { addScope(){}, setCustomParameters(){} };
const SERVER_TS = { __ts: true };
export const serverTimestamp = () => SERVER_TS;
export const increment = n => ({ __inc: n });
export const collection = (_db, path) => ({ kind:'col', path });
export function doc(a, path) {
  if (a && a.kind === 'col') return { kind:'doc', path: a.path + '/' + ('d' + (++counter).toString(36) + Math.random().toString(36).slice(2,8)), id: null, _auto: true, get id(){ return this.path.split('/').pop(); } };
  return { kind:'doc', path, get id(){ return this.path.split('/').pop(); } };
}
const resolve = (old, data) => {
  const out = { ...(old||{}) };
  for (const [k,v] of Object.entries(data)) {
    if (v && v.__inc !== undefined) out[k] = (Number(out[k])||0) + v.__inc;
    else if (v === SERVER_TS) out[k] = '<ts>';
    else if (v === undefined) throw new Error('Unsupported field value: undefined ('+k+')');
    else out[k] = JSON.parse(JSON.stringify(v));
  }
  return out;
};
export const failNext = { n: 0 };      // paksa gagal untuk uji atomisitas
export async function addDoc(c, data) { const r = doc(c); store.set(r.path, resolve(null, data)); return r; }
export async function setDoc(r, data) { store.set(r.path, resolve(null, data)); }
export async function updateDoc(r, data) { if (!store.has(r.path)) throw new Error('NOT_FOUND '+r.path); store.set(r.path, resolve(store.get(r.path), data)); }
export async function deleteDoc(r) { store.delete(r.path); }
export async function getDocs(c) {
  const docs = [...store.entries()].filter(([p]) => p.startsWith(c.path + '/') && !p.slice(c.path.length+1).includes('/'))
    .map(([p, d]) => ({ id: p.split('/').pop(), data: () => JSON.parse(JSON.stringify(d)) }));
  return { size: docs.length, docs, forEach: f => docs.forEach(f) };
}
export function writeBatch() {
  const ops = [];
  return {
    set: (r, d) => ops.push(['set', r, d]), update: (r, d) => ops.push(['update', r, d]), delete: r => ops.push(['delete', r]),
    async commit() {
      if (failNext.n > 0) { failNext.n--; throw new Error('SIMULASI JARINGAN GAGAL'); }
      const snapshot = new Map(store);          // atomik: kalau ada op gagal, semuanya dibatalkan
      try {
        for (const [t, r, d] of ops) {
          if (t === 'set') store.set(r.path, resolve(null, d));
          else if (t === 'update') { if (!store.has(r.path)) throw new Error('NOT_FOUND '+r.path); store.set(r.path, resolve(store.get(r.path), d)); }
          else store.delete(r.path);
        }
      } catch (e) { store.clear(); snapshot.forEach((v,k)=>store.set(k,v)); throw e; }
    }
  };
}
export const signInWithEmailAndPassword = async () => {}; export const createUserWithEmailAndPassword = async () => {};
export const signOut = async () => {}; export const signInWithPopup = async () => {};
export const onAuthStateChanged = (_a, cb) => { globalThis.__authCb = cb; };
export const query = x => x; export const where = () => ({}); export const onSnapshot = () => () => {};
