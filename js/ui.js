// Utilidades compartilhadas: cores, ícones, sons, pontuação.
import { CONFIG } from './config.js';

export const COLORS = ['#E0533D', '#11967F', '#E39414', '#4C5BD4'];
export const LETTERS = ['A', 'B', 'C', 'D'];
export const ICON_NAMES = ['Coração', 'Folha', 'Sol', 'Casa'];

const svg = (p) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${p}</svg>`;
export const ICONS = [
  svg('<path d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3 5 6.6 5c2.1 0 3.5 1.1 4.4 2.4C11.9 6.1 13.3 5 15.4 5 19 5 20.9 8.6 21.5 11.8 19.5 16.4 12 21 12 21z"/>'),
  svg('<path d="M20.5 3.5C11 3.5 4 8.5 4 16c0 1.3.2 2.5.6 3.6L3 21.2l1.1 1.1 1.7-1.7c1 .4 2.1.6 3.2.6 7.5 0 11.5-7.5 11.5-17.7zM8.5 17.6c2-4.2 5.2-7.3 9-9.1-3 2.4-5.5 5.6-7.3 9.9z"/>'),
  svg('<circle cx="12" cy="12" r="4.6"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  svg('<path d="M12 2.8 1.8 11.2l1.3 1.6 1.4-1.1V21h5.3v-6h4.4v6h5.3v-9.3l1.4 1.1 1.3-1.6z"/>'),
];

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function show(id) {
  $$('.screen').forEach((el) => el.classList.toggle('active', el.id === id));
}

export function toast(msg, ms = 3200) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), ms);
}

export function brand() {
  document.title = `${CONFIG.appName}${document.title ? ' · ' + document.title : ''}`;
  $$('[data-app-name]').forEach((el) => { el.textContent = CONFIG.appName; });
  $$('[data-tagline]').forEach((el) => { el.textContent = CONFIG.tagline || ''; });
}

export function errMsg(e) {
  const m = String(e && (e.code || e.message) || e);
  if (m.includes('CONFIG_MISSING')) return 'O sistema ainda não foi configurado (arquivo js/config.js).';
  if (m.includes('permission')) return 'Sem permissão para esta ação.';
  if (m.includes('invalid-credential') || m.includes('wrong-password') || m.includes('user-not-found') || m.includes('invalid-email')) return 'E-mail ou senha incorretos.';
  if (m.includes('network') || m.includes('unavailable')) return 'Sem conexão com a internet. Tente de novo.';
  if (m.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um pouco.';
  return 'Algo deu errado: ' + m;
}

// Pontuação: resposta certa vale até 1000 pontos (ou 2000 em dobro);
// quanto mais rápido, mais pontos (mínimo de 500 / 1000).
export function scoreFor(pointsMode, elapsedMs, limitSec) {
  const base = pointsMode === 'double' ? 2000 : pointsMode === 'none' ? 0 : 1000;
  const frac = Math.min(Math.max(elapsedMs / (limitSec * 1000), 0), 1);
  return Math.round(base * (1 - frac / 2));
}

export function rankOf(board, uid) {
  const list = Object.entries(board || {}).sort((a, b) => b[1].s - a[1].s);
  const i = list.findIndex(([u]) => u === uid);
  return i < 0 ? null : i + 1;
}

export function shuffled(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

// ---------- sons (gerados no navegador, sem arquivos) ----------
let actx = null;
function ctx() {
  if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur = 0.15, type = 'sine', vol = 0.18, when = 0) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t = c.currentTime + when;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
export const Sound = {
  on: true,
  tick() { if (this.on) tone(880, 0.07, 'square', 0.06); },
  pop() { if (this.on) tone(660, 0.12, 'triangle', 0.12); },
  gong() { if (this.on) { tone(196, 1.2, 'sine', 0.25); tone(392, 0.8, 'sine', 0.08); } },
  start() { if (this.on) [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, i * 0.12)); },
  fanfare() { if (this.on) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.16)); },
  // música ambiente simples para o saguão
  _loop: null,
  lobby(on) {
    clearInterval(this._loop); this._loop = null;
    if (!on || !this.on) return;
    const notes = [262, 330, 392, 330, 294, 349, 440, 349];
    let i = 0;
    this._loop = setInterval(() => { tone(notes[i % notes.length], 0.35, 'triangle', 0.05); i++; }, 420);
  },
};
