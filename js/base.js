'use strict';
/* Estado, progresso salvo no aparelho e utilidades usadas por todas as telas. */
const App = { guia: null, mapa: null, contexto: null };

const CHAVE = 'guia-leonida-v1';
const PADRAO = { feitos: {}, passos: {}, check: {}, cap: 1, spoiler: true, esconder: false, filtros: null };
const Estado = (() => {
  let dados;
  try { dados = Object.assign({}, PADRAO, JSON.parse(localStorage.getItem(CHAVE) || '{}')); }
  catch (e) { dados = Object.assign({}, PADRAO); }
  return dados;
})();

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(Estado)); }
  catch (e) { avisar('Não consegui salvar neste navegador.'); }
}
const feito = id => !!Estado.feitos[id];
function alternar(id, valor) {
  const v = valor === undefined ? !feito(id) : valor;
  if (v) Estado.feitos[id] = 1; else delete Estado.feitos[id];
  salvar();
  return v;
}

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
/* Todo texto vindo dos dados passa por aqui antes de virar HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = s => semAcento(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const link = (url, texto) => /^https?:\/\//.test(url || '') ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(texto)}</a>` : '';
const nomeSite = url => { try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return 'fonte'; } };

let relogioAviso;
function avisar(texto) {
  const a = $('#aviso');
  a.textContent = texto; a.hidden = false;
  clearTimeout(relogioAviso);
  relogioAviso = setTimeout(() => { a.hidden = true; }, 2600);
}

function barra(n, total) {
  const p = total ? Math.min(100, Math.round(n * 100 / total)) : 0;
  return `<div class="barra" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
}
const contarFeitos = lista => lista.reduce((n, x) => n + (feito(x.id) ? 1 : 0), 0);
const missoesDoCap = c => App.guia.missoes.filter(m => m.cap === c);
const oculto = cap => Estado.spoiler && cap > Estado.cap;
const partesTitulo = t => { const m = String(t).match(/^(.*?)\s*\((.*)\)\s*$/); return m ? [m[1], m[2]] : [t, '']; };
