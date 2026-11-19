// Tela do apresentador (telão)
import { B } from './backend.js';
import {
  $, $$, show, esc, toast, brand, errMsg, COLORS, LETTERS, ICONS, scoreFor, shuffled, fmt, Sound,
} from './ui.js';
import { EXEMPLO } from './exemplo.js';

brand();
const params = new URLSearchParams(location.search);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pin = null, quiz = null, board = {}, state = 'none';
let players = new Map();      // uid -> nome
let answers = new Map();      // uid -> {choice, at}
let unP = null, unA = null, timerH = null, introH = null;
let cur = null;               // {i, qq, ord, disp, correct}
let closing = false;
let opts = { shuffle: true, music: true, showPhone: true };

// ---------- início / login ----------
async function boot() {
  show('s-loading');
  try { await B.init('host'); } catch (e) { show('s-login'); toast(errMsg(e), 8000); return; }
  B.onHost(async (u) => {
    $('#logoutBtn').hidden = !u;
    if (!u) { show('s-login'); return; }
    if (state !== 'none') return;
    if (params.get('pin')) await resume(params.get('pin'));
    else await dash();
  });
}

$('#loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const b = $('#loginBtn'); b.disabled = true;
  try { await B.hostSignIn($('#email').value.trim(), $('#pw').value); }
  catch (e) { toast(errMsg(e)); }
  finally { b.disabled = false; }
});
$('#logoutBtn').onclick = async () => { await B.hostSignOut(); location.href = 'host.html'; };

// ---------- botões fixos ----------
$('#soundBtn').onclick = () => {
  Sound.on = !Sound.on;
  $('#soundBtn').textContent = Sound.on ? '🔊 Som' : '🔇 Som';
  if (state === 'lobby') Sound.lobby(opts.music);
  else Sound.lobby(false);
};
$('#fsBtn').onclick = toggleFull;
function toggleFull() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'f' || e.key === 'F') { toggleFull(); return; }
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
    const map = { lobby: '#startBtn', reveal: '#toBoardBtn', board: '#nextBtn' };
    const b = map[state] && $(map[state]);
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  }
});
window.addEventListener('beforeunload', (e) => {
  if (['intro', 'question', 'closing', 'reveal', 'board'].includes(state)) { e.preventDefault(); e.returnValue = ''; }
});

// ---------- painel ----------
async function dash() {
  state = 'dash';
  $('#topPin').hidden = true;
  show('s-dash');
  try { opts = { ...opts, ...JSON.parse(localStorage.getItem('apsjogo_opts') || '{}') }; } catch {}
  $('#optShuffle').checked = opts.shuffle; $('#optMusic').checked = opts.music; $('#optShowPhone').checked = opts.showPhone;
  ['optShuffle', 'optMusic', 'optShowPhone'].forEach((id) => {
    $('#' + id).onchange = () => {
      opts = { shuffle: $('#optShuffle').checked, music: $('#optMusic').checked, showPhone: $('#optShowPhone').checked };
      try { localStorage.setItem('apsjogo_opts', JSON.stringify(opts)); } catch {}
    };
  });
  const box = $('#qlist');
  try {
    const list = await B.listQuizzes();
    if (!list.length) {
      box.innerHTML = `<div class="card" style="text-align:center">
        <h2 style="margin-bottom:8px">Nenhum quiz ainda</h2>
        <p class="muted">Crie um novo ou comece com o quiz pronto do Mapeio de Ativos.</p>
        <div class="row" style="justify-content:center">
          <button class="btn blue" id="seedBtn">Adicionar quiz "Mapeio de Ativos"</button>
          <a class="btn" href="editor.html">+ Novo quiz</a>
        </div></div>`;
      $('#seedBtn').onclick = async () => { await B.saveQuiz(null, EXEMPLO); dash(); };
      return;
    }
    box.innerHTML = list.map((q) => `
      <div class="qitem">
        <div class="t"><b>${esc(q.title || 'Sem título')}</b><span>${q.count} pergunta${q.count === 1 ? '' : 's'}</span></div>
        <button class="btn blue" data-play="${q.id}">▶ Jogar</button>
        <a class="btn light small" href="editor.html?id=${q.id}">Editar</a>
        <button class="btn danger small" data-del="${q.id}" title="Excluir">🗑</button>
      </div>`).join('');
    $$('[data-play]', box).forEach((b) => { b.onclick = () => play(b.dataset.play); });
    $$('[data-del]', box).forEach((b) => {
      b.onclick = async () => {
        if (!confirm('Excluir este quiz? Não dá para desfazer.')) return;
        await B.deleteQuiz(b.dataset.del); dash();
      };
    });
  } catch (e) { box.innerHTML = `<div class="card">${esc(errMsg(e))}</div>`; }
}

// ---------- criar jogo ----------
async function play(quizId) {
  show('s-loading');
  try {
    quiz = await B.getQuiz(quizId);
    if (!quiz || !quiz.questions || !quiz.questions.length) { toast('Este quiz não tem perguntas.'); dash(); return; }
    board = {};
    pin = await B.createGame({
      quizId, title: quiz.title || '', state: 'lobby', qIndex: -1, total: quiz.questions.length,
      q: null, correct: null, counts: null, board: {}, ord: null,
    });
    history.replaceState(null, '', `?pin=${pin}`);
    openLobby();
  } catch (e) { toast(errMsg(e)); dash(); }
}

function joinBase() {
  const dir = location.href.split('?')[0].replace(/[^/]*$/, '');
  return dir;
}

function openLobby() {
  state = 'lobby';
  $('#topPin').hidden = false; $('#topPin').textContent = `PIN ${pin}`;
  $('#bigPin').textContent = pin.replace(/(\d{3})(\d{3})/, '$1 $2');
  $('#joinUrl').textContent = joinBase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  $('#lobbyTitle').textContent = quiz.title || '';
  const qr = $('#qr'); qr.innerHTML = '';
  const link = `${joinBase()}index.html?pin=${pin}`;
  const drawQr = () => {
    if (window.QRCode) { new window.QRCode(qr, { text: link, width: 192, height: 192, correctLevel: window.QRCode.CorrectLevel.M }); }
    else qr.style.display = 'none';
  };
  if (document.readyState === 'complete') drawQr(); else window.addEventListener('load', drawQr, { once: true });
  watchPlayers();
  show('s-lobby');
  Sound.lobby(opts.music);
}

function watchPlayers() {
  if (unP) unP();
  unP = B.watchPlayers(pin, (list) => {
    const before = players.size;
    players = new Map(list.map((p) => [p.uid, p.name]));
    // quem foi removido sai do placar também
    for (const uid of Object.keys(board)) if (!players.has(uid)) delete board[uid];
    if (players.size > before && state === 'lobby') Sound.pop();
    renderChips();
    if (state === 'question') $('#nAns').textContent = `${answers.size}/${players.size}`;
  });
}

function renderChips() {
  $('#nPlayers').textContent = players.size;
  $('#startBtn').disabled = players.size === 0;
  const box = $('#chips');
  box.classList.toggle('many', players.size > 40);
  box.innerHTML = [...players].map(([uid, n]) => `<button class="chip" data-uid="${uid}" title="Remover">${esc(n)}</button>`).join('');
  $$('.chip', box).forEach((c) => {
    c.onclick = async () => {
      if (!confirm(`Remover "${c.textContent}" do jogo?`)) return;
      try { await B.kickPlayer(pin, c.dataset.uid); } catch (e) { toast(errMsg(e)); }
    };
  });
}

$('#startBtn').onclick = () => { Sound.lobby(false); Sound.start(); goIntro(0); };

// ---------- perguntas ----------
function buildCur(i, ord) {
  const qq = quiz.questions[i];
  const n = qq.options.length;
  const order = ord || (opts.shuffle && qq.type !== 'tf' ? shuffled(n) : [...Array(n).keys()]);
  const disp = order.map((k) => qq.options[k]);
  const correct = order.map((k, d) => ((qq.correct || []).includes(k) ? d : -1)).filter((d) => d >= 0);
  cur = { i, qq, ord: order, disp, correct };
}

function answersHtml(marks) {
  return cur.disp.map((t, d) => {
    const cls = marks ? (cur.correct.includes(d) ? 'right' : 'wrong') : '';
    return `<div class="ans ${cls}" style="background:${COLORS[d]}">
      <span class="ic">${ICONS[d]}</span><span class="tx">${esc(t)}</span>
      <span class="mk"><svg viewBox="0 0 24 24" width="70%" height="70%"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    </div>`;
  }).join('');
}
const qLabel = () => `Pergunta ${cur.i + 1} de ${quiz.questions.length}`;

async function goIntro(i) {
  clearInterval(timerH); clearTimeout(introH);
  buildCur(i);
  closing = false;
  state = 'intro';
  const qq = cur.qq;
  const payload = {
    type: qq.type || 'quiz',
    text: opts.showPhone ? qq.text : '',
    options: opts.showPhone ? cur.disp : cur.disp.map(() => ''),
    time: Number(qq.time) || 20,
    points: qq.points || 'standard',
  };
  $('#introNum').textContent = qLabel() + (qq.points === 'double' ? ' · PONTOS EM DOBRO ✨' : '');
  $('#introText').textContent = qq.text;
  const bar = $('#introBar');
  bar.style.transition = 'none'; bar.style.width = '0';
  show('s-intro');
  const dur = Math.min(6000, 3000 + qq.text.length * 25);
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `width ${dur}ms linear`; bar.style.width = '100%'; }));
  try {
    await B.updateGame(pin, { state: 'intro', qIndex: i, q: payload, correct: null, counts: null, ord: cur.ord });
  } catch (e) { toast(errMsg(e)); }
  introH = setTimeout(goQuestion, dur);
}

async function goQuestion() {
  state = 'question';
  const qq = cur.qq; const i = cur.i;
  const time = Number(qq.time) || 20;
  answers = new Map();
  if (unA) unA();
  unA = B.watchAnswers(pin, i, (list) => {
    if (!cur || cur.i !== i) return;
    answers = new Map(list.filter((a) => players.has(a.uid)).map((a) => [a.uid, a]));
    $('#nAns').textContent = players.size ? `${answers.size}/${players.size}` : answers.size;
    if (state === 'question' && players.size > 0 && answers.size >= players.size) setTimeout(closeQuestion, 700);
  });
  $('#qNum').textContent = qLabel();
  $('#qText').textContent = qq.text;
  $('#qMedia').innerHTML = qq.img ? `<img class="qimg" src="${qq.img}" alt="">` : '';
  $('#qMedia').className = qq.img ? '' : 'qimg-ph';
  $('#qAnswers').innerHTML = answersHtml(false);
  $('#nAns').textContent = `0/${players.size}`;
  show('s-question');
  try { await B.updateGame(pin, { state: 'question' }, 'qStartAt'); } catch (e) { toast(errMsg(e)); }
  const tEnd = Date.now() + time * 1000;
  let lastSec = null;
  const tick = () => {
    const left = Math.max(0, tEnd - Date.now());
    const s = Math.ceil(left / 1000);
    const el = $('#timer');
    el.textContent = s;
    el.classList.toggle('hot', s <= 5);
    if (s !== lastSec && s <= 5 && s > 0) Sound.tick();
    lastSec = s;
    if (left <= 0) closeQuestion();
  };
  tick(); clearInterval(timerH); timerH = setInterval(tick, 200);
}
$('#skipBtn').onclick = () => closeQuestion();

async function closeQuestion() {
  if (closing || state !== 'question') return;
  closing = true;
  clearInterval(timerH);
  state = 'closing';
  Sound.gong();
  try { await B.updateGame(pin, { state: 'closing' }); } catch (e) { toast(errMsg(e)); }
  await sleep(1500); // dá tempo para as últimas respostas chegarem
  let g = null;
  try { g = await B.getGame(pin); } catch {}
  const startAt = g && g.qStartAt ? g.qStartAt : null;
  const qq = cur.qq; const i = cur.i; const time = Number(qq.time) || 20;
  const counts = cur.disp.map(() => 0);
  for (const [uid, name] of players) {
    const e = board[uid] || { n: name, s: 0, a: '' };
    e.n = name;
    e.a = (e.a || '').padEnd(i, '-').slice(0, i);
    const a = answers.get(uid);
    let pts = 0, mark = '-';
    if (a && a.choice >= 0 && a.choice < counts.length) {
      counts[a.choice]++;
      const ok = cur.correct.includes(a.choice);
      mark = ok ? '1' : '0';
      if (ok) pts = scoreFor(qq.points, startAt && a.at ? a.at - startAt : time * 500, time);
    }
    e.d = pts; e.s = (e.s || 0) + pts; e.a += mark;
    board[uid] = e;
  }
  state = 'reveal';
  try { await B.updateGame(pin, { state: 'reveal', correct: cur.correct, counts, board }); } catch (e) { toast(errMsg(e)); }
  renderReveal(counts);
}

function renderReveal(counts) {
  state = 'reveal';
  $('#rNum').textContent = qLabel();
  $('#rText').textContent = cur.qq.text;
  const max = Math.max(1, ...counts);
  $('#bars').innerHTML = counts.map((c, d) => `
    <div class="bar ${cur.correct.includes(d) ? '' : 'wrong'}">
      <div class="n">${cur.correct.includes(d) ? '✔ ' : ''}${c}</div>
      <div class="col" style="background:${COLORS[d]};height:0%" data-h="${(c / max) * 100}">${ICONS[d]}</div>
    </div>`).join('');
  $('#rAnswers').innerHTML = answersHtml(true);
  show('s-reveal');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('#bars .col').forEach((el) => { el.style.height = `${Math.max(4, Number(el.dataset.h))}%`; });
  }));
}

$('#toBoardBtn').onclick = async () => {
  state = 'board';
  renderBoard();
  try { await B.updateGame(pin, { state: 'board' }); } catch (e) { toast(errMsg(e)); }
};

function ranking() { return Object.entries(board).sort((a, b) => b[1].s - a[1].s); }

function renderBoard() {
  state = 'board';
  const top = ranking().slice(0, 5);
  $('#board').innerHTML = top.length ? top.map(([, e], k) => `
    <div class="brow"><span class="pos">${k + 1}º</span><span>${esc(e.n)}</span>
    <span class="delta">${e.d ? '+' + fmt(e.d) : ''}</span><span>${fmt(e.s)}</span></div>`).join('')
    : '<div class="card">Ninguém pontuou ainda.</div>';
  const last = cur.i + 1 >= quiz.questions.length;
  $('#nextBtn').textContent = last ? 'Ver pódio 🏆' : 'Próxima ▶';
  show('s-board');
}

$('#nextBtn').onclick = () => {
  if (cur.i + 1 < quiz.questions.length) goIntro(cur.i + 1);
  else goEnd();
};

async function goEnd() {
  state = 'end';
  try { await B.updateGame(pin, { state: 'end' }); } catch (e) { toast(errMsg(e)); }
  if (unA) unA();
  if (unP) unP();
  renderPodium();
}

function renderPodium() {
  state = 'end';
  const r = ranking();
  const slot = (k, cls) => {
    const e = r[k] && r[k][1];
    return `<div class="step ${cls}"><div class="who">${e ? esc(e.n) : ''}<div class="pts">${e ? fmt(e.s) + ' pts' : ''}</div></div>
      <div class="block">${k + 1}º</div></div>`;
  };
  $('#podTitle').textContent = quiz && quiz.title ? quiz.title : 'Pódio';
  $('#podium').innerHTML = slot(1, 'p2') + slot(0, 'p1') + slot(2, 'p3');
  show('s-podium');
  setTimeout(() => { Sound.fanfare(); confetti(); }, 2600);
}

function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = [...COLORS, '#F4B63A', '#ffffff'];
  for (let k = 0; k < 140; k++) {
    const i = document.createElement('i');
    i.style.left = Math.random() * 100 + 'vw';
    i.style.background = cols[k % cols.length];
    i.style.animationDuration = 2.5 + Math.random() * 3 + 's';
    i.style.animationDelay = Math.random() * 1.5 + 's';
    c.appendChild(i);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 8000);
}

$('#csvBtn').onclick = () => {
  const n = quiz.questions.length;
  const head = ['Posição', 'Nome', 'Pontos', 'Acertos', ...quiz.questions.map((_, k) => `P${k + 1}`)];
  const lab = { 1: 'Acertou', 0: 'Errou', '-': 'Sem resposta' };
  const rows = ranking().map(([, e], k) => {
    const a = (e.a || '').padEnd(n, '-');
    return [k + 1, e.n, e.s, [...a].filter((x) => x === '1').length, ...[...a].slice(0, n).map((x) => lab[x])];
  });
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '﻿' + [head, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `resultado-${(quiz.title || 'quiz').replace(/[^\wÀ-ſ]+/g, '-').slice(0, 40)}-${pin}.csv`;
  a.click();
};
$('#backBtn').onclick = () => { location.href = 'host.html'; };

// ---------- retomar um jogo (se a página recarregar) ----------
async function resume(p) {
  show('s-loading');
  try {
    const g = await B.getGame(p);
    if (!g) { history.replaceState(null, '', 'host.html'); return dash(); }
    pin = p; board = g.board || {};
    quiz = await B.getQuiz(g.quizId);
    if (!quiz) { toast('O quiz deste jogo foi excluído.'); history.replaceState(null, '', 'host.html'); return dash(); }
    $('#topPin').hidden = false; $('#topPin').textContent = `PIN ${pin}`;
    if (g.state === 'lobby') { openLobby(); return; }
    if (g.state === 'end') { renderPodium(); return; }
    watchPlayers();
    buildCur(g.qIndex, g.ord);
    if (g.state === 'intro') { goIntro(g.qIndex); return; }
    if (g.state === 'question' || g.state === 'closing') {
      answers = new Map();
      unA = B.watchAnswers(pin, g.qIndex, (list) => { answers = new Map(list.map((a) => [a.uid, a])); });
      state = 'question'; closing = false;
      // remove a pontuação desta pergunta, caso já tenha sido parcialmente gravada
      await sleep(1200);
      closeQuestion();
      return;
    }
    if (g.state === 'reveal') { renderReveal(g.counts || cur.disp.map(() => 0)); return; }
    if (g.state === 'board') { renderBoard(); return; }
  } catch (e) { toast(errMsg(e)); dash(); }
}

boot();
