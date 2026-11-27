'use strict';
/* Mapa de Leonida em canvas: blocos locais (gtadb.org, CC BY 4.0) + pinos com ícone e marcação de progresso. */
const Mapa = (() => {
  // intervalo [x0, y0, x1, y1] de blocos existentes em cada nível
  const FAIXAS = [[0, 0, 2, 3], [1, 1, 5, 6], [2, 2, 10, 12], [4, 4, 20, 25], [8, 8, 41, 51], [17, 17, 83, 103], [34, 34, 167, 206]];
  const PADRAO_VISIVEL = ['flamingos', 'meditacao', 'kenton', 'relogios', 'trocalivros', 'murais', 'playlists', 'eggs', 'contatos', 'armaescondida', 'furacao', 'armas'];
  const EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const ROSA = '#ff4fa0';

  let cv, ctx, larg = 0, alt = 0, dpr = 1;
  const visao = { x: 25000, y: 31000, e: 0.02 };   // centro (px do nível 6) e escala (px de tela por px do mundo)
  const blocos = new Map(), figuras = new Map();
  let pontos = [], porId = new Map(), cats = new Map(), ativas = new Set();
  let selecionado = null, pronto = false, pedido = 0, ajustado = false;
  let foco = null;    // missão em destaque: { m, pinos, escolhido }

  const icone = c => (cats.get(c) || {}).icone || '📍';
  const cor = c => (cats.get(c) || {}).cor || '#d8d2f0';

  function iniciar(dados) {
    pontos = dados.pontos;
    porId = new Map(pontos.map(p => [p.id, p]));
    cats = new Map(dados.categorias.map(c => [c.id, c]));
    const salvas = Estado.filtros, conhecidas = (salvas || []).filter(c => cats.has(c));
    // filtros guardados por uma versão anterior podem usar nomes que não existem mais
    ativas = new Set(salvas && (conhecidas.length || !salvas.length) ? conhecidas : PADRAO_VISIVEL);
    cv = $('#mapaCanvas'); ctx = cv.getContext('2d');
    gestos();
    new ResizeObserver(medir).observe($('#mapaBox'));
    $('#btMais').onclick = () => zoom(1.6);
    $('#btMenos').onclick = () => zoom(1 / 1.6);
    $('#btTudo').onclick = () => (foco ? enquadrarLocais(foco.pinos) : enquadrar());
    $('#btFiltros').onclick = () => { const p = $('#mapaFiltros'); p.hidden = !p.hidden; if (!p.hidden) { sairMissao(); painelFiltros(); } };
    $('#mapaBusca').oninput = buscar;
    pronto = true;
  }

  function medir() {
    const r = $('#mapaBox').getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    larg = r.width; alt = r.height;
    cv.width = Math.round(larg * dpr); cv.height = Math.round(alt * dpr);
    if (!ajustado) {
      ajustado = true;
      if (foco) enquadrarFoco(); else if (selecionado) centrar(selecionado); else enquadrar();
    }
    pintar();
  }
  const escalaMin = () => Math.min(larg / 34304, alt / 44288) * 0.8 || 0.008;
  function enquadrar() { visao.x = 25856; visao.y = 30848; visao.e = escalaMin() * 1.2; pintar(); }

  /* retângulo que contém todos os locais (com o raio das áreas) */
  function limites(locais, minimo) {
    const x0 = Math.min(...locais.map(l => l.x - l.r)), x1 = Math.max(...locais.map(l => l.x + l.r));
    const y0 = Math.min(...locais.map(l => l.y - l.r)), y1 = Math.max(...locais.map(l => l.y + l.r));
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, l: Math.max(minimo, x1 - x0), a: Math.max(minimo, y1 - y0) };
  }
  function enquadrarLocais(locais) {
    if (!locais.length || !larg) return;
    const b = limites(locais, 900);
    // sobra espaço para a faixa da missão em cima e o cartão embaixo
    const livre = Math.max(160, alt - (foco ? 190 : 80));
    visao.e = Math.min(1.2, Math.max(escalaMin(), Math.min((larg - 70) / b.l, livre / b.a)));
    visao.x = b.x; visao.y = b.y;
    pintar();
  }

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

  /* ---------- desenhos ---------- */
  // cada ícone é desenhado uma vez e reaproveitado (são milhares de pinos)
  function figura(c, r) {
    const k = `${c}|${r}|${dpr}`;
    let f = figuras.get(k);
    if (f) return f;
    const lado = Math.ceil((r + 3) * 2 * dpr);
    f = document.createElement('canvas'); f.width = f.height = lado;
    const g = f.getContext('2d'), m = lado / 2;
    g.beginPath(); g.arc(m, m, r * dpr, 0, 7);
    g.fillStyle = '#1b1530'; g.fill();
    g.lineWidth = Math.max(1.5, r * 0.2) * dpr; g.strokeStyle = cor(c); g.stroke();
    g.font = `${r * 1.15 * dpr}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText(icone(c), m, m + r * 0.06 * dpr);
    figuras.set(k, f);
    return f;
  }

  function area(g, x, y, r) {
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, 7);
    g.fillStyle = 'rgba(255, 79, 160, .16)'; g.fill();
    g.setLineDash([7, 6]); g.lineWidth = 2.5; g.strokeStyle = ROSA; g.stroke();
    g.restore();
  }
  function numero(g, x, y, n, grande) {
    const r = grande ? 17 : 13;
    g.beginPath(); g.arc(x, y, r, 0, 7);
    g.fillStyle = ROSA; g.fill();
    g.lineWidth = grande ? 4 : 2.5; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = `bold ${r + 1}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n, x, y + 1);
  }

  // o número de uma região fica na borda de cima, para não cobrir os lugares exatos dentro dela
  const alturaNumero = p => p.y - (p.r || 0);

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
    const tela = p => [(p.x - esq) * visao.e, (p.y - cima) * visao.e];
    if (foco) {
      foco.pinos.forEach(p => { if (p.r) area(ctx, ...tela(p), p.r * visao.e); });
      const marca = (p, grande) => numero(ctx, ...tela({ x: p.x, y: alturaNumero(p) }), p.n, grande);
      foco.pinos.forEach(p => { if (p !== foco.escolhido) marca(p); });
      if (foco.escolhido) marca(foco.escolhido, true);
      return;
    }
    const raio = raioPino();
    if (selecionado && selecionado.a) area(ctx, ...tela(selecionado), selecionado.a * visao.e);
    for (const p of pontos) {
      if (!ativas.has(p.c) || p === selecionado) continue;
      const ok = feito(p.id);
      if (ok && Estado.esconder) continue;
      pino(p, ...tela(p), raio, ok);
    }
    if (selecionado) pino(selecionado, ...tela(selecionado), raio + 5, feito(selecionado.id), true);
  }
  const raioPino = () => Math.round(Math.max(8, Math.min(15, 6.5 + Math.log2(visao.e / escalaMin() + 1) * 1.8)));
  function pino(p, x, y, r, ok, destaque) {
    if (x < -30 || y < -30 || x > larg + 30 || y > alt + 30) return;
    ctx.globalAlpha = ok && !destaque ? 0.45 : 1;
    if (destaque) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); }
    const f = figura(p.c, r), lado = f.width / dpr;
    ctx.drawImage(f, x - lado / 2, y - lado / 2, lado, lado);
    ctx.globalAlpha = 1;
    if (ok) {
      ctx.beginPath(); ctx.arc(x + r * 0.72, y - r * 0.72, r * 0.55, 0, 7); ctx.fillStyle = '#2faa62'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${r * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', x + r * 0.72, y - r * 0.68);
    }
  }

  /* Mapinha parado, usado na tela da missão. Redesenha quando o tamanho muda (tela girada, janela redimensionada). */
  function miniatura(canvas, locais) {
    new ResizeObserver(() => desenharMiniatura(canvas, locais)).observe(canvas);
  }
  async function desenharMiniatura(canvas, locais) {
    const l = canvas.clientWidth, a = canvas.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
    if (!l || !a) return;
    canvas.width = Math.round(l * d); canvas.height = Math.round(a * d);
    const b = limites(locais, 1400);
    const e = Math.min((l - 50) / b.l, (a - 50) / b.a);
    const z = Math.max(0, Math.min(6, Math.ceil(Math.log2(e * d) + 6 - 0.25)));
    const lado = 256 * 2 ** (6 - z), [x0, y0, x1, y1] = FAIXAS[z];
    const esq = b.x - l / 2 / e, cima = b.y - a / 2 / e;
    const g = canvas.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = '#2f8aa8'; g.fillRect(0, 0, l, a);
    const espera = [];
    for (let ty = Math.max(y0, Math.floor(cima / lado)); ty <= Math.min(y1, Math.floor((cima + a / e) / lado)); ty++) {
      for (let tx = Math.max(x0, Math.floor(esq / lado)); tx <= Math.min(x1, Math.floor((esq + l / e) / lado)); tx++) {
        espera.push(new Promise(fim => {
          const i = new Image();
          i.onload = () => fim([i, (tx * lado - esq) * e, (ty * lado - cima) * e]);
          i.onerror = () => fim(null);
          i.src = `mapa/tiles/${z}/${z},${ty},${tx}.jpg`;
        }));
      }
    }
    const prontos = await Promise.all(espera);
    if (canvas.width !== Math.round(l * d) || canvas.clientWidth !== l) return;   // mudou de tamanho enquanto carregava
    for (const t of prontos) if (t) g.drawImage(t[0], t[1], t[2], lado * e + 0.6, lado * e + 0.6);
    locais.forEach(p => { if (p.r) area(g, (p.x - esq) * e, (p.y - cima) * e, p.r * e); });
    locais.map((p, i) => [p, i + 1]).reverse().forEach(([p, n]) => numero(g, (p.x - esq) * e, (alturaNumero(p) - cima) * e, n));
  }

  /* ---------- toques ---------- */
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
    let melhor = null, d = 22 / visao.e;
    for (const p of foco ? foco.pinos : pontos) {
      if (!foco) {
        if (!ativas.has(p.c) && p !== selecionado) continue;
        if (Estado.esconder && feito(p.id) && p !== selecionado) continue;
      }
      const dd = Math.hypot(p.x - wx, (foco ? alturaNumero(p) : p.y) - wy);
      if (dd < d) { d = dd; melhor = p; }
    }
    if (foco) escolher(melhor); else selecionar(melhor);
  }

  /* Textos em português das coleções que apontam para este pino. */
  function descricoes(id) {
    for (const c of App.guia.colecoes) {
      const i = c.itens.find(i => i.mapa === id);
      if (i) return { colecao: c, item: i };
    }
    return null;
  }

  function abrirCartao(html) {
    const box = $('#mapaCartao');
    document.body.classList.toggle('cartao-aberto', !!html);
    box.hidden = !html;
    box.innerHTML = html || '';
  }

  function selecionar(p) {
    selecionado = p;
    if (!p) { abrirCartao(''); App.contexto = null; pintar(); return; }
    const cat = cats.get(p.c) || { nome: p.c };
    const rel = descricoes(p.id);
    const texto = rel ? rel.item.texto : p.t;
    abrirCartao(`<span class="selo">${icone(p.c)} ${esc(cat.nome)}</span>${p.r ? `<span class="selo">${esc(p.r)}</span>` : ''}${p.a ? '<span class="selo perde">posição aproximada</span>' : ''}
      <h4>${esc(p.t || cat.nome)}</h4>
      ${texto && texto !== p.t ? `<p>${esc(texto)}</p>` : ''}
      ${p.d && !texto.includes(p.d) && !p.d.includes(texto) ? `<p class="fraco">${esc(p.d)}</p>` : ''}
      ${rel && rel.item.obs ? `<p class="fraco">${esc(rel.item.obs)}</p>` : ''}
      <div class="botoes">
        <button class="botao ${feito(p.id) ? 'feito' : 'primario'}" id="mcFeito">${feito(p.id) ? '✓ Já peguei' : 'Marcar como pego'}</button>
        <button class="botao" id="mcIA">🤖 Perguntar</button>
        ${rel ? `<a class="botao" href="#/col/${esc(rel.colecao.id)}">Ver lista</a>` : ''}
        <button class="botao" id="mcFechar">Fechar</button>
      </div>`);
    App.contexto = { titulo: `Local no mapa: ${p.t} (${cat.nome})`, texto: `${texto}. ${p.d} Região: ${p.r}` };
    $('#mcFeito').onclick = () => { alternar(p.id); selecionar(p); };
    $('#mcFechar').onclick = () => selecionar(null);
    $('#mcIA').onclick = () => IA.abrir();
    pintar();
  }

  /* ---------- modo missão ---------- */
  function missao(m, qual) {
    if (!m || !m.locais.length) return;
    selecionado = null;
    const pinos = m.locais.map((l, i) => ({ ...l, n: i + 1 }));
    foco = { m, pinos, escolhido: null };
    $('#mapaFiltros').hidden = true; $('#mapaResultados').hidden = true;
    const faixa = $('#mapaMissao');
    faixa.innerHTML = `<span><b>${esc(partesTitulo(m.titulo)[0])}</b><small>${pinos.length} ${pinos.length > 1 ? 'locais desta missão' : 'local desta missão'}</small></span>
      <a class="botao primario" href="#/m/${esc(m.id)}">Passo a passo</a><button class="botao" id="mmSair">Mapa completo</button>`;
    faixa.hidden = false;
    $('#mmSair').onclick = () => { sairMissao(); location.hash = '#/mapa'; };
    foco.inicial = pinos[+qual] || null;
    escolher(foco.inicial, true);
    if (larg) enquadrarFoco(); else ajustado = false;
  }
  function enquadrarFoco() {
    const p = foco.inicial;
    if (p) enquadrarLocais([{ ...p, r: Math.max(p.r, 450) }]); else enquadrarLocais(foco.pinos);
  }
  function escolher(p) {
    foco.escolhido = p;
    if (!p) { abrirCartao(''); pintar(); return; }
    const passos = p.passos.map(i => `<li><b>Passo ${i + 1}:</b> ${esc(foco.m.passos[i])}</li>`).join('');
    abrirCartao(`<span class="selo">local ${p.n} de ${foco.pinos.length}</span>${p.r ? '<span class="selo perde">região aproximada</span>' : ''}
      <h4>${esc(p.nome)}</h4>${passos ? `<ul class="simples">${passos}</ul>` : '<p class="fraco">Citado nas informações da missão.</p>'}
      <div class="botoes">
        ${p.n > 1 ? '<button class="botao" id="mcAnt">‹ Anterior</button>' : ''}${p.n < foco.pinos.length ? '<button class="botao primario" id="mcProx">Próximo local ›</button>' : ''}
        <button class="botao" id="mcFechar">Fechar</button>
      </div>`);
    const ir = i => { const q = foco.pinos[i]; escolher(q); enquadrarLocais([{ ...q, r: Math.max(q.r, 450) }]); };
    const a = $('#mcAnt'); if (a) a.onclick = () => ir(p.n - 2);
    const b = $('#mcProx'); if (b) b.onclick = () => ir(p.n);
    $('#mcFechar').onclick = () => escolher(null);
    pintar();
  }
  function sairMissao() {
    if (!foco) return;
    foco = null;
    $('#mapaMissao').hidden = true;
    abrirCartao('');
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
        lista.map(c => `<label><input type="checkbox" data-c="${esc(c.id)}" ${ativas.has(c.id) ? 'checked' : ''}><i style="border-color:${cor(c.id)}">${icone(c.id)}</i><span>${esc(c.nome)}</span><small class="fraco">${c.total}</small></label>`).join('')).join('');
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
    ul.innerHTML = achados.map(p => `<li><button data-id="${esc(p.id)}">${icone(p.c)} ${feito(p.id) ? '✓ ' : ''}${esc(p.t)} <small class="fraco">· ${esc((cats.get(p.c) || {}).nome)} · ${esc(p.r)}</small></button></li>`).join('') || '<li class="fraco">Nada encontrado.</li>';
    ul.hidden = false;
    ul.onclick = e => { const b = e.target.closest('button'); if (b) { ul.hidden = true; irPara(b.dataset.id); } };
  }

  function irPara(id) {
    const p = porId.get(id); if (!p) return;
    sairMissao();
    ativas.add(p.c);
    selecionar(p);
    if (larg) centrar(p);
  }
  function mostrarCategoria(lista) {
    const validas = [].concat(lista).filter(c => cats.has(c));
    if (!validas.length) return;
    sairMissao();
    ativas = new Set(validas); gravarFiltros();
    selecionar(null);
    if (larg) enquadrar(); else ajustado = false;
  }
  const categoria = c => cats.get(c);

  return { iniciar, irPara, mostrarCategoria, categoria, missao, sairMissao, miniatura, medir, pintar, fecharCartao: () => selecionar(null) };
})();
