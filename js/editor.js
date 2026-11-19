// Editor de quiz
import { B } from './backend.js';
import { $, $$, esc, toast, brand, errMsg, COLORS, ICONS } from './ui.js';

brand();
const params = new URLSearchParams(location.search);
let quizId = params.get('id');
let qs = [];
let dirty = false;

const TIMES = [5, 10, 20, 30, 60, 90, 120];
const blank = () => ({ type: 'quiz', text: '', options: ['', '', '', ''], correct: [0], time: 20, points: 'standard', img: '' });

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
const touch = () => { dirty = true; sizeInfo(); };

async function boot() {
  try { await B.init('host'); } catch (e) { toast(errMsg(e), 8000); return; }
  B.onHost(async (u) => {
    if (!u) { location.href = 'host.html'; return; }
    if (quizId) {
      const q = await B.getQuiz(quizId).catch(() => null);
      if (!q) { toast('Quiz não encontrado.'); quizId = null; qs = [blank()]; }
      else {
        $('#title').value = q.title || '';
        $('#desc').value = q.description || '';
        qs = (q.questions || []).map((x) => ({ ...blank(), ...x, options: [...x.options, '', '', '', ''].slice(0, x.type === 'tf' ? 2 : 4) }));
      }
    } else qs = [blank()];
    render();
  });
}

function render() {
  const box = $('#qs');
  box.innerHTML = qs.map((q, i) => {
    const tf = q.type === 'tf';
    const opts = q.options.map((o, k) => `
      <div class="opt" style="background:${COLORS[k]}14">
        <span class="sw" style="background:${COLORS[k]}">${ICONS[k]}</span>
        <input class="input" type="text" data-o="${k}" maxlength="75" value="${esc(o)}" placeholder="${tf ? '' : `Resposta ${k + 1}${k >= 2 ? ' (opcional)' : ''}`}" ${tf ? 'readonly' : ''}>
        <label class="c"><input type="${tf ? 'radio' : 'checkbox'}" name="c${i}" data-c="${k}" ${q.correct.includes(k) ? 'checked' : ''}> certa</label>
      </div>`).join('');
    return `<div class="qcard" data-i="${i}">
      <div class="qtop">
        <span class="qnum">${i + 1}</span>
        <select class="input" data-f="type" title="Tipo">
          <option value="quiz" ${!tf ? 'selected' : ''}>Quiz (2 a 4 respostas)</option>
          <option value="tf" ${tf ? 'selected' : ''}>Verdadeiro ou falso</option>
        </select>
        <select class="input" data-f="time" title="Tempo">${TIMES.map((t) => `<option value="${t}" ${Number(q.time) === t ? 'selected' : ''}>${t} s</option>`).join('')}</select>
        <select class="input" data-f="points" title="Pontos">
          <option value="standard" ${q.points === 'standard' ? 'selected' : ''}>Pontos normais</option>
          <option value="double" ${q.points === 'double' ? 'selected' : ''}>Pontos em dobro</option>
          <option value="none" ${q.points === 'none' ? 'selected' : ''}>Sem pontos</option>
        </select>
        <span class="spacer"></span>
        <button class="btn light small" data-a="up" title="Subir">↑</button>
        <button class="btn light small" data-a="down" title="Descer">↓</button>
        <button class="btn light small" data-a="dup" title="Duplicar">⧉</button>
        <button class="btn danger small" data-a="del" title="Excluir">🗑</button>
      </div>
      <div class="field">
        <input class="input" data-f="text" maxlength="120" value="${esc(q.text)}" placeholder="Digite a pergunta">
        <span class="counter-ch" data-cnt>${q.text.length}/120</span>
      </div>
      <div class="opts">${opts}</div>
      <div class="row" style="margin-top:10px">
        <label class="btn light small">🖼 ${q.img ? 'Trocar imagem' : 'Adicionar imagem (telão)'}<input type="file" accept="image/*" data-img hidden></label>
        ${q.img ? `<img class="thumb" src="${q.img}" alt=""><button class="btn danger small" data-a="noimg">Remover imagem</button>` : ''}
      </div>
    </div>`;
  }).join('');

  $$('.qcard[data-i]', box).forEach((card) => {
    const i = Number(card.dataset.i);
    const q = qs[i];
    $$('[data-f]', card).forEach((el) => {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        const f = el.dataset.f;
        if (f === 'type') {
          q.type = el.value;
          if (q.type === 'tf') { q.options = ['Verdadeiro', 'Falso']; q.correct = [0]; }
          else { q.options = ['', '', '', '']; q.correct = [0]; }
          touch(); render(); return;
        }
        q[f] = f === 'time' ? Number(el.value) : el.value;
        if (f === 'text') $('[data-cnt]', card).textContent = `${el.value.length}/120`;
        card.classList.remove('err');
        touch();
      });
    });
    $$('[data-o]', card).forEach((el) => el.addEventListener('input', () => { q.options[Number(el.dataset.o)] = el.value; touch(); }));
    $$('[data-c]', card).forEach((el) => el.addEventListener('change', () => {
      const k = Number(el.dataset.c);
      if (q.type === 'tf') q.correct = [k];
      else q.correct = el.checked ? [...new Set([...q.correct, k])].sort() : q.correct.filter((x) => x !== k);
      touch();
    }));
    $$('[data-a]', card).forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'up' && i > 0) [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
      if (a === 'down' && i < qs.length - 1) [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
      if (a === 'dup') qs.splice(i + 1, 0, JSON.parse(JSON.stringify(q)));
      if (a === 'del') { if (!confirm('Excluir esta pergunta?')) return; qs.splice(i, 1); if (!qs.length) qs.push(blank()); }
      if (a === 'noimg') q.img = '';
      touch(); render();
    }));
    const fi = $('[data-img]', card);
    fi.addEventListener('change', async () => {
      const f = fi.files[0]; if (!f) return;
      try { q.img = await shrink(f); touch(); render(); } catch { toast('Não consegui abrir essa imagem.'); }
    });
  });
  sizeInfo();
}

// Reduz a imagem para caber no banco de dados gratuito
function shrink(file, max = 640, quality = 0.62) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function payload() {
  return {
    title: $('#title').value.trim(),
    description: $('#desc').value.trim(),
    questions: qs.map((q) => {
      // remove respostas vazias e ajusta a marcação da certa
      const keep = q.options.map((o, k) => [o.trim(), k]).filter(([o]) => o);
      return {
        type: q.type, text: q.text.trim(), time: Number(q.time) || 20, points: q.points || 'standard', img: q.img || '',
        options: keep.map(([o]) => o),
        correct: keep.map(([, k], d) => (q.correct.includes(k) ? d : -1)).filter((d) => d >= 0),
      };
    }),
  };
}

function sizeInfo() {
  const kb = Math.round(JSON.stringify(payload()).length / 1024);
  const el = $('#sizeInfo');
  el.textContent = `${qs.length} pergunta${qs.length === 1 ? '' : 's'} · ${kb} KB de 900 KB`;
  el.style.color = kb > 900 ? 'var(--bad)' : '';
}

$('#addBtn').onclick = () => {
  qs.push(blank()); touch(); render();
  const last = $$('.qcard[data-i]').pop(); last.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('[data-f=text]', last).focus();
};

$('#saveBtn').onclick = async () => {
  const p = payload();
  $$('.qcard.err').forEach((c) => c.classList.remove('err'));
  if (!p.title) { toast('Dê um título ao quiz.'); $('#title').focus(); return; }
  const bad = p.questions.findIndex((q) => !q.text || q.options.length < 2 || !q.correct.length);
  if (bad >= 0) {
    const card = $$('.qcard[data-i]')[bad];
    card.classList.add('err'); card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`Pergunta ${bad + 1}: precisa de texto, pelo menos 2 respostas e uma marcada como certa.`, 5000);
    return;
  }
  if (JSON.stringify(p).length > 900 * 1024) { toast('O quiz ficou grande demais por causa das imagens. Remova algumas.', 6000); return; }
  const b = $('#saveBtn'); b.disabled = true; b.textContent = 'Salvando…';
  try {
    quizId = await B.saveQuiz(quizId, p);
    history.replaceState(null, '', `?id=${quizId}`);
    dirty = false;
    toast('Quiz salvo! ✔');
  } catch (e) { toast(errMsg(e)); }
  finally { b.disabled = false; b.textContent = '💾 Salvar quiz'; }
};

// ---------- importar / exportar ----------
function addImported(list) {
  const onlyBlank = qs.length === 1 && !qs[0].text.trim();
  if (onlyBlank) qs = [];
  qs.push(...list);
  touch(); render();
  toast(`${list.length} pergunta${list.length === 1 ? '' : 's'} importada${list.length === 1 ? '' : 's'}.`);
}

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

$('#xlsxIn').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const list = parseRows(rows);
    if (!list.length) { toast('Não encontrei perguntas nessa planilha.', 5000); return; }
    addImported(list);
  } catch (e) { toast('Não consegui ler a planilha: ' + (e.message || e), 6000); }
});

// Aceita o modelo de planilha usado em plataformas de quiz:
// Pergunta | Resposta 1..4 | Tempo | Resposta(s) certa(s) (ex.: 1 ou 1,3)
export function parseRows(rows) {
  let h = rows.findIndex((r) => r.some((c) => /^(question|pergunta)/i.test(String(c).trim())));
  let col;
  if (h >= 0) col = rows[h].findIndex((c) => /^(question|pergunta)/i.test(String(c).trim()));
  else { h = 7; col = 1; }
  const out = [];
  for (const r of rows.slice(h + 1)) {
    const text = String(r[col] ?? '').trim();
    if (!text) continue;
    const options = [1, 2, 3, 4].map((k) => String(r[col + k] ?? '').trim()).filter(Boolean).slice(0, 4);
    if (options.length < 2) continue;
    let time = Number(r[col + 5]) || 20;
    time = TIMES.reduce((a, b) => (Math.abs(b - time) < Math.abs(a - time) ? b : a));
    const correct = String(r[col + 6] ?? '1').split(/[,;\s]+/).map((x) => Number(x) - 1).filter((x) => x >= 0 && x < options.length);
    const tf = options.length === 2 && /^verdadeiro$/i.test(options[0]) && /^falso$/i.test(options[1]);
    out.push({
      type: tf ? 'tf' : 'quiz', text: text.slice(0, 120), time, points: 'standard', img: '',
      options: tf ? options : [...options.map((o) => o.slice(0, 75)), '', '', ''].slice(0, 4),
      correct: correct.length ? (tf ? [correct[0]] : correct) : [0],
    });
  }
  return out;
}

$('#jsonIn').addEventListener('change', async (ev) => {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!$('#title').value && data.title) $('#title').value = data.title;
    if (!$('#desc').value && data.description) $('#desc').value = data.description;
    addImported((data.questions || []).map((x) => ({ ...blank(), ...x, options: [...x.options, '', '', '', ''].slice(0, x.type === 'tf' ? 2 : 4) })));
  } catch { toast('Arquivo de backup inválido.'); }
});

$('#jsonOut').onclick = () => {
  const p = payload();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' }));
  a.download = `${(p.title || 'quiz').replace(/[^\wÀ-ſ]+/g, '-').slice(0, 50)}.json`;
  a.click();
};

boot();
