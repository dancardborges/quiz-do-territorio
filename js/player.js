// Tela do celular (jogador)
import { B } from './backend.js?v=7';
import { $, show, esc, toast, brand, errMsg, COLORS, LETTERS, ICONS, rankOf, fmt } from './ui.js?v=7';
import { REACOES, figEmoji, figValid, randomFig, figPicker } from './figurinhas.js?v=7';

brand();
const params = new URLSearchParams(location.search);
const KEY = 'apsjogo_sessao';
let pin = null, me = null, unsub = null, G = null;
let renderedQ = -1, deadline = 0, timerH = null;
const answered = {}; // qIndex -> escolha

let pick = null;
function saveSession() { try { localStorage.setItem(KEY, JSON.stringify({ pin, name: me && me.name, fig: pick })); } catch {} }
function loadSession() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
function clearSession() { try { localStorage.removeItem(KEY); } catch {} }

function message(title, text, btn = 'Voltar') {
  $('#msgTitle').textContent = title;
  $('#msgText').textContent = text;
  $('#msgBtn').textContent = btn;
  show('s-msg');
}
$('#msgBtn').onclick = () => { clearSession(); location.href = location.pathname; };

async function start() {
  try { await B.init('player'); }
  catch (e) { message('Ops!', errMsg(e)); return; }

  if (params.get('pin')) $('#pin').value = params.get('pin').replace(/\D/g, '').slice(0, 6);
  const s = loadSession();
  if (s && s.name) $('#nick').value = s.name;
  pick = s && figValid(s.fig) ? s.fig : randomFig();
  renderPicker('#figPick');

  // Volta automaticamente para o jogo se a página for recarregada
  if (s && s.pin && (!params.get('pin') || params.get('pin') === s.pin)) {
    try {
      const g = await B.getGame(s.pin);
      if (g && g.state !== 'end') {
        const who = await B.amIIn(s.pin);
        if (who) { pin = s.pin; me = who; enter(); return; }
      }
    } catch {}
  }
  setTimeout(() => (params.get('pin') ? $('#nick') : $('#pin')).focus(), 50);
}

$('#joinForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const p = $('#pin').value.replace(/\D/g, '');
  const name = $('#nick').value.trim().replace(/\s+/g, ' ');
  if (p.length !== 6) return toast('O PIN tem 6 números.');
  if (!name) return toast('Digite seu nome.');
  const btn = $('#joinBtn');
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const g = await B.getGame(p);
    if (!g) { toast('PIN não encontrado. Confira o número no telão.'); return; }
    if (g.state === 'end') { toast('Este jogo já terminou.'); return; }
    pin = p;
    me = await B.joinGame(p, name, pick);
    saveSession();
    enter();
  } catch (e) { toast(errMsg(e)); }
  finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});

function enter() {
  if (unsub) unsub();
  unsub = B.watchGame(pin, (g, err) => {
    if (err) { toast('Conexão instável… tentando de novo.'); return; }
    if (!g) { message('Jogo encerrado', 'Este jogo não existe mais.'); return; }
    G = g; render();
  });
}

function setNames() {
  ['#lobbyName', '#introName', '#fbName'].forEach((s) => { $(s).textContent = `${figEmoji(me.avatar)} ${me.name}`; });
  $('#lobbyFig').textContent = figEmoji(me.avatar);
}

// ---- figurinhas ----
function renderPicker(sel) {
  const box = $(sel);
  box.innerHTML = figPicker(sel === '#figPick' ? pick : me && me.avatar);
  box.onclick = async (ev) => {
    const b = ev.target.closest('[data-fig]'); if (!b) return;
    box.querySelectorAll('.fig').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    pick = b.dataset.fig;
    if (sel === '#figPick2' && me && pin) {
      try { await B.setAvatar(pin, pick); me.avatar = pick; saveSession(); setNames(); $('#figSheet').hidden = true; }
      catch (e) { toast('Só dá para trocar antes do jogo começar.'); $('#figSheet').hidden = true; }
    }
  };
}
$('#swapFig').onclick = () => { renderPicker('#figPick2'); $('#figSheet').hidden = false; };
$('#figClose').onclick = () => { $('#figSheet').hidden = true; };

// ---- reações (aparecem no telão) ----
document.querySelectorAll('[data-react]').forEach((bar) => {
  bar.innerHTML = `<div class="reactlabel">Mande uma reação para o telão</div><div class="reacts">${
    REACOES.map((e) => `<button type="button" class="reactbtn" data-e="${e}" aria-label="Reagir ${e}">${e}</button>`).join('')}</div>`;
});
let lastReact = 0, reactCount = 0, reactPhase = '';
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.reactbtn'); if (!b || !pin || !me) return;
  const phase = G ? G.state + ':' + G.qIndex : '';
  if (phase !== reactPhase) { reactPhase = phase; reactCount = 0; }
  const now = Date.now();
  if (now - lastReact < 900 || reactCount >= 15) return; // evita excesso de envios
  lastReact = now; reactCount++;
  b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 200);
  if (navigator.vibrate) navigator.vibrate(15);
  B.sendReaction(pin, b.dataset.e).catch(() => {});
});
function showReacts(on) { document.querySelectorAll('[data-react]').forEach((x) => { x.hidden = !on; }); }

function myEntry() { return (G.board || {})[me.uid] || null; }
function footer() {
  const e = myEntry();
  const r = rankOf(G.board, me.uid);
  $('#fbRank').textContent = r ? `${r}º lugar` : '';
  $('#fbScore').textContent = `${fmt(e ? e.s : 0)} pts`;
}
const qLabel = () => `Pergunta ${G.qIndex + 1} de ${G.total}`;

function render() {
  setNames();
  clearInterval(timerH);
  const st = G.state;
  showReacts(st === 'lobby' || st === 'reveal' || st === 'board' || st === 'end');
  if (st !== 'lobby') $('#figSheet').hidden = true;
  if (st === 'lobby') { show('s-lobby'); return; }
  if (st === 'end') { renderEnd(); return; }
  if (st === 'intro') {
    $('#introNum').textContent = qLabel();
    $('#introText').textContent = G.q ? G.q.text : '';
    show('s-intro');
    return;
  }
  const a = answered[G.qIndex];
  if (st === 'question') {
    if (a === -1) { feedbackWait('Não deu tempo!', 'Aguarde a próxima pergunta…'); return; }
    if (a !== undefined) { feedbackWait('Resposta enviada!', 'Aguarde os outros jogadores…'); return; }
    renderQuestion();
    return;
  }
  if (st === 'closing') {
    if (a !== undefined && a !== -1) feedbackWait('Resposta enviada!', 'Contando os pontos…');
    else feedbackWait('Tempo esgotado!', 'Contando os pontos…');
    return;
  }
  if (st === 'reveal' || st === 'board') { renderResult(); }
}

function renderQuestion() {
  const q = G.q;
  if (renderedQ !== G.qIndex) {
    renderedQ = G.qIndex;
    deadline = Date.now() + q.time * 1000;
  }
  $('#qNum').textContent = qLabel();
  $('#qText').textContent = q.text;
  const box = $('#pbtns');
  box.className = 'pbtns' + (q.options.length <= 2 ? ' tf' : '');
  box.innerHTML = q.options.map((o, i) => `
    <button class="pbtn" data-i="${i}" style="background:${COLORS[i]}">
      <span class="ic">${ICONS[i]}</span>
      <span class="lt">${LETTERS[i]}</span>
      <span>${esc(o)}</span>
    </button>`).join('');
  box.querySelectorAll('.pbtn').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
  show('s-question');
  const tick = () => {
    const left = Math.max(0, deadline - Date.now());
    $('#qLeft').textContent = `${Math.ceil(left / 1000)}s`;
    $('#qBar').style.width = `${(left / (q.time * 1000)) * 100}%`;
  };
  tick(); timerH = setInterval(tick, 250);
}

async function answer(i) {
  const q = G.qIndex;
  if (answered[q] !== undefined) return;
  answered[q] = i;
  if (navigator.vibrate) navigator.vibrate(40);
  clearInterval(timerH);
  feedbackWait('Resposta enviada!', 'Aguarde os outros jogadores…');
  try {
    await B.submitAnswer(pin, q, i);
  } catch (e) {
    delete answered[q];
    const m = String(e && (e.code || e.message));
    if (m.includes('permission')) {
      if (G.state === 'question' && G.qIndex === q) {
        const still = await B.amIIn(pin).catch(() => null);
        if (!still) { clearSession(); message('Você saiu do jogo', 'O apresentador removeu seu nome. Entre de novo com outro nome.'); return; }
      }
      answered[q] = -1;
      feedbackWait('Não deu tempo!', 'Sua resposta chegou depois do tempo.');
    } else {
      toast(errMsg(e));
      if (G.state === 'question' && G.qIndex === q) renderQuestion();
    }
  }
}

function feedbackWait(title, sub) {
  $('#fbNum').textContent = G.qIndex >= 0 ? qLabel() : '';
  const box = $('#fbBox');
  box.className = 'feedback wait';
  box.innerHTML = `<div class="spinner"></div><div class="big">${esc(title)}</div><div>${esc(sub)}</div>`;
  footer();
  show('s-feedback');
}

function renderResult() {
  const e = myEntry();
  const mark = e && e.a ? e.a[G.qIndex] : undefined;
  const box = $('#fbBox');
  $('#fbNum').textContent = qLabel();
  if (mark === '1') {
    box.className = 'feedback ok';
    box.innerHTML = `<div class="big">Acertou! 🎉</div><div class="score">${G.q && G.q.points === 'none' ? 'Pergunta sem pontos' : `+${fmt(e.d)} pontos`}</div>`;
  } else if (mark === '0') {
    box.className = 'feedback bad';
    box.innerHTML = `<div class="big">Não foi dessa vez</div><div>Continue! Na próxima você acerta.</div>`;
  } else {
    box.className = 'feedback bad';
    box.innerHTML = `<div class="big">Sem resposta</div><div>O tempo acabou antes da sua resposta.</div>`;
  }
  const r = rankOf(G.board, me.uid);
  if (r && r <= 3 && G.state === 'board') box.insertAdjacentHTML('beforeend', `<div class="score">Você está no pódio! 🏆</div>`);
  footer();
  show('s-feedback');
}

function renderEnd() {
  const e = myEntry();
  const r = rankOf(G.board, me.uid);
  const total = Object.keys(G.board || {}).length;
  const acertos = e && e.a ? [...e.a].filter((c) => c === '1').length : 0;
  const medal = r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '⭐';
  $('#endBox').innerHTML = `
    <div style="font-size:4rem">${medal}</div>
    <div class="big">${r ? `${r}º lugar` : 'Fim de jogo!'}</div>
    <div>${r ? `de ${total} participantes` : ''}</div>
    <div class="score">${fmt(e ? e.s : 0)} pontos · ${acertos} acerto${acertos === 1 ? '' : 's'}</div>
    <p style="max-width:300px">Obrigado por participar, ${esc(me.name)}!</p>`;
  clearSession();
  show('s-end');
}

start();
