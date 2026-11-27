'use strict';
/* Mapa de Leonida em canvas: blocos locais (gtadb.org, CC BY 4.0) + pinos com marcação de progresso. */
const Mapa = (() => {
  // intervalo [x0, y0, x1, y1] de blocos existentes em cada nível
  const FAIXAS = [[0, 0, 2, 3], [1, 1, 5, 6], [2, 2, 10, 12], [4, 4, 20, 25], [8, 8, 41, 51], [17, 17, 83, 103], [34, 34, 167, 206]];
  const CORES = { 'Colecionáveis': '#ff5fa8', 'Segredos': '#ffd166', 'Acrobacias e lazer': '#59d98c', 'Veículos': '#8aa4ff', 'Assaltos': '#ff6b6b', 'Lojas': '#c58bff', 'Outros': '#e8e2ff' };
  const PADRAO_VISIVEL = ['Magazine', 'Safe', 'Hidden Weapons', 'Hurricane Secret Mission', 'Jack of Hearts', 'Delights', 'Nine1Nine', 'Landmark', 'Ammu-Nation'];

  let cv, ctx, larg = 0, alt = 0, dpr = 1;
  const visao = { x: 25000, y: 31000, e: 0.02 };   // centro (px do nível 6) e escala (px de tela por px do mundo)
  const blocos = new Map();
  let pontos = [], porId = new Map(), cats = new Map(), ativas = new Set();
  let selecionado = null, pronto = false, pedido = 0, ajustado = false;

  const cor = c => CORES[(cats.get(c) || {}).grupo] || '#fff';

  function iniciar(dados) {
    pontos = dados.pontos;
    porId = new Map(pontos.map(p => [p.id, p]));
    cats = new Map(dados.categorias.map(c => [c.id, c]));
    ativas = new Set(Estado.filtros || PADRAO_VISIVEL);
    cv = $('#mapaCanvas'); ctx = cv.getContext('2d');
    gestos();
    new ResizeObserver(medir).observe($('#mapaBox'));
    $('#btMais').onclick = () => zoom(1.6);
    $('#btMenos').onclick = () => zoom(1 / 1.6);
    $('#btTudo').onclick = enquadrar;
    $('#btFiltros').onclick = () => { const p = $('#mapaFiltros'); p.hidden = !p.hidden; if (!p.hidden) painelFiltros(); };
    $('#mapaBusca').oninput = buscar;
    pronto = true;
  }

  function medir() {
    const r = $('#mapaBox').getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    larg = r.width; alt = r.height;
    cv.width = Math.round(larg * dpr); cv.height = Math.round(alt * dpr);
    if (!ajustado) { ajustado = true; if (!selecionado) enquadrar(); else centrar(selecionado); }
    pintar();
  }
  const escalaMin = () => Math.min(larg / 34304, alt / 44288) * 0.8 || 0.008;
  function enquadrar() { visao.x = 25856; visao.y = 30848; visao.e = escalaMin() * 1.2; pintar(); }
  function zoom(f, sx = larg / 2, sy = alt / 2) {
    const nova = Math.max(escalaMin(), Math.min(2.5, visao.e * f));
    const wx = visao.x + (sx - larg / 2) / visao.e, wy = visao.y + (sy - alt / 2) / visao.e;
    visao.e = nova;
    visao.x = wx - (sx - larg / 2) / nova; visao.y = wy - (sy - alt / 2) / nova;
    pintar();
  }
  function limitar() {
    visao.x = Math.max(8704, Math.min(43008, visao.x));
    visao.y = Math.max(8704, Math.min(52992, visao.y));
  }

  function bloco(z, x, y) {
    const k = `${z}/${z},${y},${x}`;
    let b = blocos.get(k);
    if (!b) {
      b = new Image();
      b.onload = pintar;
      b.onerror = () => { b.falhou = true; };
      b.src = `mapa/tiles/${k}.jpg`;
      blocos.set(k, b);
      if (blocos.size > 700) blocos.delete(blocos.keys().next().value);
    }
    return b.complete && b.naturalWidth ? b : null;
  }

  function pintar() { if (!pedido) pedido = requestAnimationFrame(desenhar); }
  function desenhar() {
    pedido = 0;
    if (!pronto || !larg) return;
    limitar();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2f8aa8'; ctx.fillRect(0, 0, larg, alt);
    const z = Math.max(0, Math.min(6, Math.ceil(Math.log2(visao.e * dpr) + 6 - 0.25)));
    const lado = 256 * 2 ** (6 - z);
    const [x0, y0, x1, y1] = FAIXAS[z];
    const esq = visao.x - larg / 2 / visao.e, cima = visao.y - alt / 2 / visao.e;
    const tx0 = Math.max(x0, Math.floor(esq / lado)), tx1 = Math.min(x1, Math.floor((esq + larg / visao.e) / lado));
    const ty0 = Math.max(y0, Math.floor(cima / lado)), ty1 = Math.min(y1, Math.floor((cima + alt / visao.e) / lado));
    const tam = lado * visao.e;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const dx = (tx * lado - esq) * visao.e, dy = (ty * lado - cima) * visao.e;
        const img = bloco(z, tx, ty);
        if (img) { ctx.drawImage(img, dx, dy, tam + 0.6, tam + 0.6); continue; }
        for (let p = 1; p <= z; p++) {          // enquanto carrega, usa o bloco de um nível acima
          const f = 2 ** p, pai = blocos.get(`${z - p}/${z - p},${Math.floor(ty / f)},${Math.floor(tx / f)}`);
          if (pai && pai.complete && pai.naturalWidth) {
            const s = 256 / f;
            ctx.drawImage(pai, (tx % f) * s, (ty % f) * s, s, s, dx, dy, tam + 0.6, tam + 0.6);
            break;
          }
        }
      }
    }
    const raio = Math.max(3.5, Math.min(9, 3 + Math.log2(visao.e / escalaMin() + 1) * 1.4));
    for (const p of pontos) {
      if (!ativas.has(p.c) || p === selecionado) continue;
      const ok = feito(p.id);
      if (ok && Estado.esconder) continue;
      pino(p, esq, cima, raio, ok);
    }
    if (selecionado) pino(selecionado, esq, cima, raio + 4, feito(selecionado.id), true);
  }
  function pino(p, esq, cima, r, ok, destaque) {
    const x = (p.x - esq) * visao.e, y = (p.y - cima) * visao.e;
    if (x < -20 || y < -20 || x > larg + 20 || y > alt + 20) return;
    ctx.globalAlpha = ok && !destaque ? 0.45 : 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    ctx.fillStyle = ok ? '#6b6585' : cor(p.c); ctx.fill();
    ctx.lineWidth = destaque ? 4 : 1.5; ctx.strokeStyle = destaque ? '#fff' : '#14101f'; ctx.stroke();
    if (ok && r > 5) { ctx.fillStyle = '#fff'; ctx.font = `bold ${r * 1.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', x, y); }
    ctx.globalAlpha = 1;
  }

  function gestos() {
    const dedos = new Map();
    let moveu = 0, distancia = 0;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      dedos.set(e.pointerId, pos(e));
      if (dedos.size === 1) moveu = 0; else moveu = 99;
      distancia = 0;
      $('#mapaResultados').hidden = true; $('#mapaFiltros').hidden = true;
    });
    cv.addEventListener('pointermove', e => {
      const ant = dedos.get(e.pointerId); if (!ant) return;
      const atual = pos(e); dedos.set(e.pointerId, atual);
      if (dedos.size === 1) {
        visao.x -= (atual.x - ant.x) / visao.e; visao.y -= (atual.y - ant.y) / visao.e;
        moveu += Math.abs(atual.x - ant.x) + Math.abs(atual.y - ant.y);
        pintar();
      } else if (dedos.size === 2) {
        const [a, b] = [...dedos.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distancia) zoom(d / distancia, (a.x + b.x) / 2, (a.y + b.y) / 2);
        distancia = d;
      }
    });
    const soltar = e => {
      if (!dedos.has(e.pointerId)) return;
      const p = pos(e); dedos.delete(e.pointerId); distancia = 0;
      if (e.type === 'pointerup' && !dedos.size && moveu < 9) tocar(p.x, p.y);
    };
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); zoom(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y); }, { passive: false });
    cv.addEventListener('dblclick', e => { const p = pos(e); zoom(2, p.x, p.y); });
  }

  function tocar(sx, sy) {
    const wx = visao.x + (sx - larg / 2) / visao.e, wy = visao.y + (sy - alt / 2) / visao.e;
    let melhor = null, d = 18 / visao.e;
    for (const p of pontos) {
      if (!ativas.has(p.c) && p !== selecionado) continue;
      if (Estado.esconder && feito(p.id) && p !== selecionado) continue;
      const dd = Math.hypot(p.x - wx, p.y - wy);
      if (dd < d) { d = dd; melhor = p; }
    }
    selecionar(melhor);
  }

  /* Textos em português das coleções que apontam para este pino. */
  function descricoes(id) {
    for (const c of App.guia.colecoes) {
      const i = c.itens.find(i => i.mapa === id);
      if (i) return { colecao: c, item: i };
    }
    return null;
  }

  function selecionar(p) {
    selecionado = p;
    const box = $('#mapaCartao');
    document.body.classList.toggle('cartao-aberto', !!p);
    if (!p) { box.hidden = true; App.contexto = null; pintar(); return; }
    const cat = cats.get(p.c) || { nome: p.c };
    const rel = descricoes(p.id);
    const texto = rel ? rel.item.texto : p.t;
    box.innerHTML = `<span class="selo">${esc(cat.nome)}</span>${p.r ? `<span class="selo">${esc(p.r)}</span>` : ''}
      <h4>${esc(p.t || cat.nome)}</h4>
      ${texto && texto !== p.t ? `<p>${esc(texto)}</p>` : ''}
      ${p.d && !texto.includes(p.d) ? `<p class="fraco">${p.en ? 'Descrição em inglês: ' : ''}${esc(p.d)}</p>` : ''}
      <div class="botoes">
        <button class="botao ${feito(p.id) ? 'feito' : 'primario'}" id="mcFeito">${feito(p.id) ? '✓ Já peguei' : 'Marcar como pego'}</button>
        <button class="botao" id="mcIA">🤖 Perguntar</button>
        ${rel ? `<a class="botao" href="#/col/${esc(rel.colecao.id)}">Ver lista</a>` : ''}
        <button class="botao" id="mcFechar">Fechar</button>
      </div>`;
    box.hidden = false;
    App.contexto = { titulo: `Local no mapa: ${p.t} (${cat.nome})`, texto: `${texto}. ${p.d} Região: ${p.r}` };
    $('#mcFeito').onclick = () => { alternar(p.id); selecionar(p); };
    $('#mcFechar').onclick = () => selecionar(null);
    $('#mcIA').onclick = () => IA.abrir();
    pintar();
  }

  function centrar(p) {
    visao.x = p.x; visao.e = Math.max(visao.e, 0.35);
    visao.y = p.y + (alt * 0.18) / visao.e;
    pintar();
  }

  function painelFiltros() {
    const box = $('#mapaFiltros');
    const grupos = {};
    for (const c of cats.values()) (grupos[c.grupo] ||= []).push(c);
    box.innerHTML = `<div class="botoes"><button class="botao" data-f="tudo">Mostrar tudo</button><button class="botao" data-f="nada">Ocultar tudo</button><button class="botao primario" data-f="ok">Pronto</button></div>
      <label><input type="checkbox" id="fEsconder" ${Estado.esconder ? 'checked' : ''}><span>Esconder o que já peguei</span></label>` +
      Object.entries(grupos).map(([g, lista]) => `<h3><button class="link" data-g="${esc(g)}">${esc(g)} (ligar/desligar)</button></h3>` +
        lista.map(c => `<label><input type="checkbox" data-c="${esc(c.id)}" ${ativas.has(c.id) ? 'checked' : ''}><i style="background:${cor(c.id)}"></i><span>${esc(c.nome)}</span><small class="fraco">${c.total}</small></label>`).join('')).join('');
    box.onchange = e => {
      if (e.target.id === 'fEsconder') { Estado.esconder = e.target.checked; salvar(); }
      else if (e.target.dataset.c) { e.target.checked ? ativas.add(e.target.dataset.c) : ativas.delete(e.target.dataset.c); gravarFiltros(); }
      pintar();
    };
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.f === 'ok') { box.hidden = true; return; }
      if (b.dataset.f === 'tudo') ativas = new Set(cats.keys());
      if (b.dataset.f === 'nada') ativas = new Set();
      if (b.dataset.g) {
        const ids = grupos[b.dataset.g].map(c => c.id), ligar = ids.some(i => !ativas.has(i));
        ids.forEach(i => ligar ? ativas.add(i) : ativas.delete(i));
      }
      gravarFiltros(); painelFiltros(); pintar();
    };
  }
  function gravarFiltros() { Estado.filtros = [...ativas]; salvar(); }

  function buscar() {
    const q = semAcento($('#mapaBusca').value.trim()), ul = $('#mapaResultados');
    if (q.length < 2) { ul.hidden = true; return; }
    const achados = pontos.filter(p => semAcento(`${p.t} ${(cats.get(p.c) || {}).nome} ${p.r}`).includes(q)).slice(0, 40);
    ul.innerHTML = achados.map(p => `<li><button data-id="${esc(p.id)}">${feito(p.id) ? '✓ ' : ''}${esc(p.t)} <small class="fraco">· ${esc((cats.get(p.c) || {}).nome)} · ${esc(p.r)}</small></button></li>`).join('') || '<li class="fraco">Nada encontrado.</li>';
    ul.hidden = false;
    ul.onclick = e => { const b = e.target.closest('button'); if (b) { ul.hidden = true; irPara(b.dataset.id); } };
  }

  function irPara(id) {
    const p = porId.get(id); if (!p) return;
    ativas.add(p.c);
    selecionar(p);
    if (larg) centrar(p);
  }
  function mostrarCategoria(c) {
    if (!cats.has(c)) return;
    ativas = new Set([c]); gravarFiltros();
    selecionar(null);
    if (larg) enquadrar(); else ajustado = false;
  }

  return { iniciar, irPara, mostrarCategoria, medir, pintar, fecharCartao: () => selecionar(null) };
})();
