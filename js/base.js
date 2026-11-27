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

/* Instalar como aplicativo: muitos navegadores não perguntam sozinhos, então o próprio guia oferece. */
const Instalar = (() => {
  const DISPENSOU = 'guia-xandy-sem-convite';
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const dentroDeOutroApp = /Instagram|FBAN|FBAV|FB_IAB|; wv\)/.test(ua);   // navegador embutido não instala
  let convite = null;    // aviso de instalação que o Chrome/Edge entregam à página

  const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const dispensado = () => { try { return !!localStorage.getItem(DISPENSOU); } catch (e) { return false; } };

  function passos() {
    if (dentroDeOutroApp) return ['Este link abriu dentro de outro aplicativo, que não deixa instalar.', 'Toque no menu e escolha "Abrir no navegador" (Chrome ou Safari). Depois toque em Instalar.'];
    if (ios) return ['No Safari, toque no botão Compartilhar (quadrado com uma seta para cima).', 'Escolha "Adicionar à Tela de Início" e toque em Adicionar.',
      'No iPhone o app instalado guarda o progresso separado do Safari: se já marcou coisas, salve o arquivo em Ajustes e carregue dentro do app.'];
    if (android) return ['No Chrome, toque no menu ⋮ (canto de cima).', 'Escolha "Instalar app" ou "Adicionar à tela inicial" e confirme.', 'Se aparecer "Abrir app", ele já está instalado: procure o ícone entre os aplicativos.'];
    return ['No Chrome ou Edge, clique no ícone de instalar no fim da barra de endereço.', 'Se não aparecer, abra o menu do navegador e procure "Instalar".'];
  }

  function cartao(sempre) {
    if (instalado()) return sempre ? '<div class="cartao"><h4>📲 Aplicativo</h4><p class="fraco">Você já está usando o app instalado ✓</p></div>' : '';
    if (!sempre && dispensado()) return '';
    return `<div class="cartao destaque" id="cartaoInstalar"><h4>📲 Instalar o app</h4><p>Ganha um ícone na tela inicial e abre em tela cheia.</p>
      <ol id="comoInstalar" class="como" hidden>${passos().map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      <div class="botoes"><button class="botao primario" data-instalar="sim">Instalar</button>${sempre ? '' : '<button class="botao" data-instalar="depois">Agora não</button>'}</div></div>`;
  }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); convite = e; });
  window.addEventListener('appinstalled', () => { convite = null; $('#cartaoInstalar')?.remove(); avisar('App instalado ✓'); });
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-instalar]');
    if (!b) return;
    if (b.dataset.instalar === 'depois') {
      try { localStorage.setItem(DISPENSOU, '1'); } catch (err) { /* sem armazenamento: some só desta vez */ }
      $('#cartaoInstalar').remove();
      avisar('Para instalar depois: ⚙️ Ajustes.');
    } else if (convite) {
      const pedido = convite;
      convite = null;            // cada aviso só pode ser usado uma vez
      pedido.prompt();
      await pedido.userChoice;
    } else $('#comoInstalar').hidden = false;
  });

  return { cartao };
})();
