// Ligação com o Firebase (banco de dados em tempo real + login).
import { CONFIG } from './config.js?v=6';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, onSnapshot, serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let app, auth, db;

const ms = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v ?? null);

function normGame(snap) {
  if (!snap.exists()) return null;
  const d = snap.data({ serverTimestamps: 'estimate' });
  d.qStartAt = ms(d.qStartAt);
  d.createdAt = ms(d.createdAt);
  d.pin = snap.id;
  return d;
}

const B = {
  kind: 'firebase',

  // role = 'player' | 'host' — instâncias separadas para que o login do
  // apresentador e o do jogador não se misturem no mesmo navegador.
  async init(role) {
    if (!CONFIG.firebase || String(CONFIG.firebase.apiKey).includes('COLE_AQUI')) {
      throw new Error('CONFIG_MISSING');
    }
    app = initializeApp(CONFIG.firebase, role);
    auth = getAuth(app);
    db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  },

  // ---------- login ----------
  async playerSignIn() {
    if (auth.currentUser) return auth.currentUser.uid;
    await new Promise((r) => { const u = onAuthStateChanged(auth, () => { u(); r(); }); });
    if (auth.currentUser) return auth.currentUser.uid;
    const c = await signInAnonymously(auth);
    return c.user.uid;
  },
  onHost(cb) {
    return onAuthStateChanged(auth, (u) => cb(u && !u.isAnonymous ? { uid: u.uid, email: u.email } : null));
  },
  async hostSignIn(email, pw) { await signInWithEmailAndPassword(auth, email, pw); },
  async hostSignOut() { await signOut(auth); },
  uid() { return auth.currentUser ? auth.currentUser.uid : null; },

  // ---------- quizzes ----------
  async listQuizzes() {
    const s = await getDocs(collection(db, 'quizzes'));
    return s.docs.map((d) => {
      const x = d.data();
      return { id: d.id, title: x.title, count: (x.questions || []).length, updatedAt: ms(x.updatedAt) };
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },
  async getQuiz(id) {
    const s = await getDoc(doc(db, 'quizzes', id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },
  async saveQuiz(id, data) {
    const body = { ...data, updatedAt: serverTimestamp() };
    delete body.id;
    if (id) { await setDoc(doc(db, 'quizzes', id), body); return id; }
    const r = await addDoc(collection(db, 'quizzes'), body);
    return r.id;
  },
  async deleteQuiz(id) { await deleteDoc(doc(db, 'quizzes', id)); },

  // ---------- jogos ----------
  async createGame(data) {
    for (let i = 0; i < 20; i++) {
      const pin = String(Math.floor(100000 + Math.random() * 900000));
      const ref = doc(db, 'games', pin);
      if ((await getDoc(ref)).exists()) continue;
      await setDoc(ref, { ...data, hostUid: auth.currentUser.uid, createdAt: serverTimestamp() });
      return pin;
    }
    throw new Error('Não foi possível gerar um PIN');
  },
  async getGame(pin) { return normGame(await getDoc(doc(db, 'games', pin))); },
  watchGame(pin, cb) {
    return onSnapshot(doc(db, 'games', pin), (s) => cb(normGame(s)), (e) => cb(null, e));
  },
  // stamp = nome de um campo que deve receber a hora do servidor
  async updateGame(pin, patch, stamp) {
    const p = { ...patch };
    if (stamp) p[stamp] = serverTimestamp();
    await updateDoc(doc(db, 'games', pin), p);
  },

  // ---------- jogadores ----------
  async joinGame(pin, name, avatar) {
    const uid = await B.playerSignIn();
    const ref = doc(db, 'games', pin, 'players', uid);
    const s = await getDoc(ref);
    if (!s.exists()) await setDoc(ref, { name, avatar: avatar || '', joinedAt: serverTimestamp() });
    const d = s.exists() ? s.data() : { name, avatar };
    return { uid, name: d.name, avatar: d.avatar || '' };
  },
  async amIIn(pin) {
    const uid = await B.playerSignIn();
    const s = await getDoc(doc(db, 'games', pin, 'players', uid));
    return s.exists() ? { uid, name: s.data().name, avatar: s.data().avatar || '' } : null;
  },
  async setAvatar(pin, avatar) {
    await updateDoc(doc(db, 'games', pin, 'players', auth.currentUser.uid), { avatar });
  },
  watchPlayers(pin, cb) {
    return onSnapshot(collection(db, 'games', pin, 'players'),
      (s) => cb(s.docs.map((d) => ({ uid: d.id, name: d.data().name, avatar: d.data().avatar || '' }))));
  },

  // ---------- reações ----------
  async sendReaction(pin, e) {
    await addDoc(collection(db, 'games', pin, 'reactions'), { uid: auth.currentUser.uid, e, at: serverTimestamp() });
  },
  watchReactions(pin, cb) {
    const since = Timestamp.fromMillis(Date.now() - 3000);
    return onSnapshot(query(collection(db, 'games', pin, 'reactions'), where('at', '>', since)), (s) => {
      s.docChanges().forEach((c) => { if (c.type === 'added') { const x = c.doc.data(); cb({ uid: x.uid, e: x.e }); } });
    }, (err) => console.warn('[reações] não consegui escutar:', err && (err.code || err.message)));
  },
  async kickPlayer(pin, uid) { await deleteDoc(doc(db, 'games', pin, 'players', uid)); },

  // ---------- respostas ----------
  async submitAnswer(pin, q, choice) {
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, 'games', pin, 'answers', `${uid}_${q}`), { uid, q, choice, at: serverTimestamp() });
  },
  watchAnswers(pin, q, cb) {
    return onSnapshot(query(collection(db, 'games', pin, 'answers'), where('q', '==', q)), (s) => {
      cb(s.docs.map((d) => {
        const x = d.data({ serverTimestamps: 'estimate' });
        return { uid: x.uid, choice: x.choice, at: ms(x.at) };
      }));
    });
  },
};

export default B;
