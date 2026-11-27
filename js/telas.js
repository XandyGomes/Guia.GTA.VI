'use strict';
/* Telas e navegação (rotas pelo # do endereço). */
const tela = () => $('#tela');

function mostrar(titulo, html, aba) {
  $('#tituloTopo').textContent = titulo;
  tela().innerHTML = html;
  $$('#abas a').forEach(a => a.classList.toggle('ativa', a.dataset.aba === aba));
}

const seletorCapitulos = atual => `<div class="capitulos">${App.guia.capitulos.map(c => {
  const l = missoesDoCap(c.n);
  return `<a href="#/cap/${c.n}" class="${c.n === atual ? 'ativa' : ''}">Cap. ${c.n}<br><small>${contarFeitos(l)}/${l.length}</small></a>`;
}).join('')}<a href="#/cap/0" class="${atual === 0 ? 'ativa' : ''}">Livres<br><small>${contarFeitos(missoesDoCap(0))}/${missoesDoCap(0).length}</small></a></div>`;

/* Ordem da rota: avisos aparecem imediatamente antes da missão que fecha a janela. */
function rotaDoCap(n) {
  const itens = [];
  for (const m of missoesDoCap(n)) {
    App.guia.portoes.forEach((p, i) => { if (p.cap === n && p.antes === m.k) itens.push({ portao: p, i }); });
    itens.push({ m });
  }
  return itens;
}
const itensPortao = (p, i) => p.itens.map((t, j) => ({ id: `g${i}-${j}`, texto: t }));
const proximaMissao = () => {
  for (let c = Estado.cap; c <= 5; c++) {
    const m = missoesDoCap(c).find(x => x.tipo === 'historia' && !feito(x.id));
    if (m) return m;
  }
  return null;
};
/* Opcionais que vêm antes da próxima missão da história e ainda não foram feitas. */
const opcionaisAbertas = prox => {
  if (!prox) return [];
  const l = missoesDoCap(prox.cap);
  return l.slice(0, l.indexOf(prox)).filter(m => m.tipo === 'opcional' && !feito(m.id));
};

function linhaMissao(m, proxima) {
  const [nome, objetivo] = partesTitulo(m.titulo);
  const escondida = oculto(m.cap);
  return `<div class="linha ${feito(m.id) ? 'ok' : ''} ${proxima ? 'proxima' : ''}">
    <button class="marca ${feito(m.id) ? 'on' : ''}" data-marca="${esc(m.id)}" aria-label="Marcar como feita">${feito(m.id) ? '✓' : ''}</button>
    <a class="corpo" href="#/m/${esc(m.id)}">
      <span class="nome">${escondida ? 'Missão oculta (spoiler)' : esc(nome)}</span>
      <span class="sub">${escondida ? '' : esc([objetivo, m.quem].filter(Boolean).join(' · '))}</span>
      <span class="selo ${m.tipo === 'opcional' ? 'op' : 'hist'}">${m.tipo === 'opcional' ? 'opcional' : 'história'}</span>
      ${m.grupo && !escondida ? `<span class="selo">${esc(m.grupo)}</span>` : ''}
      ${m.perdivel ? '<span class="selo perde">atenção: pode perder</span>' : ''}
    </a></div>`;
}

function cartaoPortao(p, i) {
  const itens = itensPortao(p, i);
  return `<div class="cartao ${p.nivel}"><h4>⚠️ ${esc(p.titulo)}</h4>${barra(contarFeitos(itens), itens.length)}
    ${itens.map(x => `<div class="linha ${feito(x.id) ? 'ok' : ''}"><button class="marca ${feito(x.id) ? 'on' : ''}" data-marca="${x.id}" aria-label="Marcar">${feito(x.id) ? '✓' : ''}</button><span class="corpo"><span class="nome">${esc(x.texto)}</span></span></div>`).join('')}</div>`;
}

function telaInicio() {
  App.contexto = null;
  const g = App.guia, prox = proximaMissao();
  const todas = g.missoes, itensCol = g.colecoes.flatMap(c => c.itens);
  const unicos = [...new Map(itensCol.map(i => [i.id, i])).values()];
  const abertas = opcionaisAbertas(prox);
  const portao = prox && g.portoes.map((p, i) => ({ p, i })).find(({ p }) => p.cap === prox.cap && missoesDoCap(p.cap).findIndex(m => m.k === p.antes) >= missoesDoCap(p.cap).indexOf(prox));
  mostrar('Guia Xandy GTA VI', `
    ${Instalar.cartao()}
    <h2>Estou no capítulo</h2>
    <div class="capitulos">${g.capitulos.map(c => `<button data-cap="${c.n}" class="${c.n === Estado.cap ? 'ativa' : ''}">${c.n}</button>`).join('')}</div>
    ${prox ? `<a class="cartao destaque" href="#/m/${prox.id}"><span class="fraco">PRÓXIMO PASSO · capítulo ${prox.cap}</span>
      <h4>${esc(partesTitulo(prox.titulo)[0])}</h4><span>${esc(prox.passos[0] || '')}</span><br><strong>Abrir passo a passo ›</strong></a>`
      : '<div class="cartao destaque"><h4>História concluída! 🏆</h4><p>Agora é o 100%: veja o checklist nos Guias.</p></div>'}
    ${abertas.length ? `<a class="cartao aviso" href="#/cap/${prox.cap}"><h4>${abertas.length} opcional(is) esperando antes dela</h4><span class="fraco">${esc(abertas.slice(0, 4).map(m => partesTitulo(m.titulo)[0]).join(' · '))}${abertas.length > 4 ? ' …' : ''}</span></a>` : ''}
    ${portao ? `<a class="cartao ${portao.p.nivel}" href="#/cap/${portao.p.cap}"><h4>⚠️ ${esc(portao.p.titulo)}</h4><span class="fraco">${contarFeitos(itensPortao(portao.p, portao.i))} de ${portao.p.itens.length} feitos. Toque para ver a lista.</span></a>` : ''}
    <h2>Passo a passo por capítulo</h2>${seletorCapitulos(-1)}
    <h2>Meu progresso</h2>
    <div class="grade">
      <a class="cartao" href="#/cap/${Estado.cap}"><span class="fraco">Missões</span><b>${contarFeitos(todas)}/${todas.length}</b>${barra(contarFeitos(todas), todas.length)}</a>
      <a class="cartao" href="#/colecoes"><span class="fraco">Itens do mundo</span><b>${contarFeitos(unicos)}/${unicos.length}</b>${barra(contarFeitos(unicos), unicos.length)}</a>
      <a class="cartao" href="#/guia/trofeus"><span class="fraco">Troféus</span><b>${g.guias.trofeus.filter(t => feito('tr-' + slug(t.nome))).length}/${g.guias.trofeus.length}</b></a>
      <a class="cartao" href="#/guia/check100"><span class="fraco">Checklist</span><b>100%</b><span class="fraco">o que falta</span></a>
    </div>`, 'rota');
  $$('[data-cap]').forEach(b => b.onclick = () => { Estado.cap = +b.dataset.cap; salvar(); telaInicio(); });
}

function telaCapitulo(n) {
  const cap = App.guia.capitulos.find(c => c.n === n);
  const lista = missoesDoCap(n), prox = lista.find(m => m.tipo === 'historia' && !feito(m.id));
  App.contexto = { titulo: n ? `Rota do capítulo ${n}` : 'Missões livres', texto: `Missões: ${lista.map(m => m.titulo).join('; ')}` };
  let corpo = seletorCapitulos(n);
  if (!n) {
    corpo += '<h2>Sem capítulo fixo</h2><p class="fraco">Podem ser feitas em qualquer momento, assim que o mundo estiver liberado.</p>' + lista.map(m => linhaMissao(m)).join('');
  } else {
    corpo += `<h2>Capítulo ${n}${oculto(n) ? '' : ' · ' + esc(cap.nome)}</h2>${barra(contarFeitos(lista), lista.length)}`;
    if (n > Estado.cap) corpo += `<div class="botoes"><button class="botao primario" id="btCheguei">Cheguei no capítulo ${n}</button></div>`;
    corpo += '<p class="fraco">Siga de cima para baixo: as opcionais aparecem no momento em que costumam liberar.</p>';
    corpo += rotaDoCap(n).map(x => x.m ? linhaMissao(x.m, x.m === prox) : (oculto(n) ? '' : cartaoPortao(x.portao, x.i))).join('');
    if (!oculto(n)) {
      const w = cap.mundo;
      corpo += `<h2>🌎 Explorar o mundo antes de avançar</h2><div class="cartao"><p>${esc(w.texto)}</p>
        ${w.fazer.map((t, j) => `<div class="linha ${feito(`w${n}-${j}`) ? 'ok' : ''}"><button class="marca ${feito(`w${n}-${j}`) ? 'on' : ''}" data-marca="w${n}-${j}" aria-label="Marcar">${feito(`w${n}-${j}`) ? '✓' : ''}</button><span class="corpo"><span class="nome">${esc(t)}</span></span></div>`).join('')}
        <div class="botoes"><a class="botao primario" href="#/colecoes/${encodeURIComponent(w.regiao)}">Itens de ${esc(w.regiao)}</a><a class="botao" href="#/mapa">Abrir mapa</a></div>
        <p class="fraco">A região é uma sugestão de ordem para não deixar nada para trás; quase tudo no mapa pode ser pego depois, menos o que está nos avisos.</p></div>`;
    }
    if (n < 5) corpo += `<div class="botoes"><a class="botao" href="#/cap/${n + 1}">Capítulo ${n + 1} ›</a></div>`;
    else corpo += '<div class="botoes"><a class="botao primario" href="#/guia/finais">Finais e pós-jogo ›</a></div>';
  }
  mostrar(n ? `Capítulo ${n}` : 'Missões livres', corpo, 'rota');
  const b = $('#btCheguei');
  if (b) b.onclick = () => { Estado.cap = n; salvar(); telaCapitulo(n); };
}

/* Lugares citados na missão: mapinha, lista numerada e atalhos para o mapa. */
function ondeFica(m) {
  const camadas = (m.camadas || []).map(c => Mapa.categoria(c)).filter(Boolean);
  const botoes = camadas.length ? `<div class="botoes">${camadas.map(c => `<a class="botao" href="#/mapa/c:${esc(c.id)}">${c.icone} Ver no mapa: ${esc(c.nome)}</a>`).join('')}</div>` : '';
  if (!m.locais.length) {
    return `<h3>📍 Onde fica</h3><p class="fraco">As fontes não citam um lugar fixo para esta missão: siga o marcador que aparece no mapa do jogo.</p>${botoes}`;
  }
  const passos = l => (l.passos.length ? `passo ${l.passos.map(i => i + 1).join(', ')}` : '');
  return `<h3>📍 Onde fica</h3>
    <a class="minimapa" href="#/mapa/m:${esc(m.id)}" aria-label="Abrir os locais desta missão no mapa"><canvas id="miniMapa"></canvas><span>Toque para ampliar</span></a>
    <ol class="lugares">${m.locais.map((l, i) => `<li><a href="#/mapa/m:${esc(m.id)}/${i}"><i>${i + 1}</i><span>${esc(l.nome)}
      <small>${[l.r ? 'região aproximada' : '', passos(l)].filter(Boolean).join(' · ')}</small></span><b>›</b></a></li>`).join('')}</ol>${botoes}`;
}
const lugaresDoPasso = (m, i) => {
  const l = m.locais.map((x, n) => [x, n]).filter(([x]) => x.passos.includes(i));
  return l.length ? `<span class="onde">${l.map(([x, n]) => `<a href="#/mapa/m:${esc(m.id)}/${n}">📍 ${n + 1}. ${esc(x.nome)}</a>`).join('')}</span>` : '';
};

function telaMissao(id, revelar) {
  const m = App.guia.missoes.find(x => x.id === id);
  if (!m) return telaInicio();
  const lista = missoesDoCap(m.cap), pos = lista.indexOf(m), ant = lista[pos - 1], prox = lista[pos + 1] || (m.cap && missoesDoCap(m.cap + 1)[0]);
  const [nome, objetivo] = partesTitulo(m.titulo);
  if (oculto(m.cap) && !revelar) {
    App.contexto = null;
    mostrar('Spoiler', `<div class="cartao aviso"><h4>Esta missão é do capítulo ${m.cap}</h4><p>Você marcou que está no capítulo ${Estado.cap}.</p>
      <div class="botoes"><button class="botao primario" id="btRevelar">Mostrar mesmo assim</button><a class="botao" href="#/">Voltar</a></div></div>`, 'rota');
    $('#btRevelar').onclick = () => telaMissao(id, true);
    return;
  }
  App.contexto = { titulo: `Missão ${m.titulo} (capítulo ${m.cap || 'livre'})`, texto: `Locais: ${m.locais.map(l => l.nome).join('; ') || '-'}. Passos: ${m.passos.join(' ')} Escolhas: ${m.escolhas || '-'} Perdível: ${m.perdivel || '-'} Itens: ${m.itens || '-'} Recompensa: ${m.recompensa || '-'}` };
  const marcados = new Set(Estado.passos[id] || []);
  const portoes = App.guia.portoes.map((p, i) => ({ p, i })).filter(({ p }) => p.cap === m.cap && p.antes === m.k);
  const bloco = (titulo, texto, classe = '') => texto ? `<div class="cartao ${classe}"><h4>${titulo}</h4><p>${esc(texto)}</p></div>` : '';
  mostrar(nome, `
    <span class="selo ${m.tipo === 'opcional' ? 'op' : 'hist'}">${m.tipo === 'opcional' ? 'opcional' : 'história'}</span>
    <span class="selo">${m.cap ? 'capítulo ' + m.cap : 'qualquer capítulo'}</span>${m.quem ? `<span class="selo">${esc(m.quem)}</span>` : ''}
    <h2>${esc(nome)}</h2>${objetivo ? `<p class="fraco">No jogo: ${esc(objetivo)}</p>` : ''}${m.resumo ? `<p>${esc(m.resumo)}</p>` : ''}
    ${portoes.map(({ p, i }) => cartaoPortao(p, i)).join('')}
    ${bloco('⚠️ Atenção: pode perder', m.perdivel, 'perigo')}
    ${ondeFica(m)}
    <h3>Passo a passo <span class="fraco">(toque para riscar)</span></h3>
    <ol class="passos">${m.passos.map((p, i) => `<li data-passo="${i}" class="${marcados.has(i) ? 'ok' : ''}" tabindex="0"><span class="texto">${esc(p)}</span>${lugaresDoPasso(m, i)}</li>`).join('')}</ol>
    ${bloco('Escolhas', m.escolhas)}
    ${bloco('🔎 Itens e segredos na missão', m.itens)}
    ${m.dicas && m.dicas.length ? `<div class="cartao"><h4>💡 Dicas</h4><ul class="simples">${m.dicas.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>` : ''}
    ${bloco('🎁 Recompensa', m.recompensa)}
    ${m.antes && m.antes.length ? `<div class="cartao aviso"><h4>Antes de seguir</h4><ul class="simples">${m.antes.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>` : ''}
    <div class="botoes">
      <button class="botao ${feito(id) ? 'feito' : 'primario'}" id="btFeita">${feito(id) ? '✓ Concluída (toque para desfazer)' : 'Concluir missão'}</button>
      <button class="botao" id="btPerguntar">🤖 Tenho uma dúvida</button>
    </div>
    <div class="botoes">${ant ? `<a class="botao" href="#/m/${ant.id}">‹ Anterior</a>` : ''}${prox ? `<a class="botao" href="#/m/${prox.id}">Próxima ›</a>` : ''}<a class="botao" href="#/cap/${m.cap}">Lista do capítulo</a></div>
    ${m.fontes && m.fontes.length ? `<p class="fraco">Texto resumido a partir de: ${m.fontes.map(f => link(f, nomeSite(f))).join(' · ')}</p>` : ''}`, 'rota');
  $('#btFeita').onclick = () => {
    const agora = alternar(id);
    if (agora && prox && m.cap) {
      const resta = lista.some(x => x.tipo === 'historia' && !feito(x.id));
      if (!resta && m.cap === Estado.cap && m.cap < 5) { Estado.cap = m.cap + 1; salvar(); avisar(`Capítulo ${m.cap} concluído!`); }
      else avisar('Missão concluída ✓');
      location.hash = `#/m/${prox.id}`;
    } else telaMissao(id, revelar);
  };
  $('#btPerguntar').onclick = () => IA.abrir();
  $$('[data-passo]').forEach(li => {
    const trocar = () => {
      const i = +li.dataset.passo, s = new Set(Estado.passos[id] || []);
      s.has(i) ? s.delete(i) : s.add(i);
      Estado.passos[id] = [...s]; salvar(); li.classList.toggle('ok', s.has(i));
    };
    li.onclick = e => { if (!e.target.closest('a')) trocar(); };
    li.onkeydown = e => { if (e.target === li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); trocar(); } };
  });
  const mini = $('#miniMapa'); if (mini) Mapa.miniatura(mini, m.locais);
}

function telaColecoes(regiao) {
  App.contexto = null;
  const filtro = i => !regiao || semAcento(i.regiao).includes(semAcento(regiao)) || (regiao === 'Leonida Keys' && semAcento(i.regiao).includes('mariana'));
  const grupos = {};
  App.guia.colecoes.forEach(c => {
    const itens = c.itens.filter(filtro);
    if (itens.length) (grupos[c.grupo] ||= []).push([c, itens]);
  });
  const regioes = ['Leonida Keys', 'Kelly County', 'Vice-Dale County', 'Leonard County', 'Lummox County'];
  mostrar('Coleções', `
    <p class="fraco">Marque cada item quando pegar. O que você marca aqui também aparece marcado no mapa.</p>
    <div class="chips"><button data-r="" class="${!regiao ? 'ativa' : ''}">Tudo</button>${regioes.map(r => `<button data-r="${r}" class="${r === regiao ? 'ativa' : ''}">${r}</button>`).join('')}</div>
    ${Object.entries(grupos).map(([g, l]) => `<h3>${esc(g)}</h3><div class="grade">${l.map(([c, itens]) => {
    const n = contarFeitos(itens);
    return `<a class="cartao" href="#/col/${c.id}${regiao ? '/' + encodeURIComponent(regiao) : ''}"><h4>${esc(c.nome)}</h4><span class="fraco">${n}/${itens.length}${regiao ? ' nesta região' : ''}${c.meta ? ` · 100% pede ${c.meta}` : ''}</span>${barra(n, itens.length)}</a>`;
  }).join('')}</div>`).join('') || '<p>Nenhum item com essa região.</p>'}`, 'colecoes');
  $$('[data-r]').forEach(b => b.onclick = () => { location.hash = b.dataset.r ? `#/colecoes/${encodeURIComponent(b.dataset.r)}` : '#/colecoes'; });
}

function telaColecao(id, regiao) {
  const c = App.guia.colecoes.find(x => x.id === id);
  if (!c) return telaColecoes();
  const regioes = [...new Set(c.itens.map(i => i.regiao.split('>')[0].trim()).filter(Boolean))].sort();
  let filtroRegiao = regiao || '', texto = '';
  const naRegiao = i => !filtroRegiao || semAcento(i.regiao).includes(semAcento(filtroRegiao)) || (filtroRegiao === 'Leonida Keys' && semAcento(i.regiao).includes('mariana'));
  App.contexto = { titulo: `Coleção ${c.nome}`, texto: `${c.como} ${c.recompensa} ${c.perdivel} ${c.aviso}` };
  mostrar(c.nome, `<h2>${esc(c.nome)}</h2><div id="cProg"></div>
    ${c.aviso ? `<div class="cartao aviso">${esc(c.aviso)}</div>` : ''}
    ${c.como ? `<p><strong>Como fazer:</strong> ${esc(c.como)}</p>` : ''}
    ${c.recompensa ? `<p><strong>Recompensa:</strong> ${esc(c.recompensa)}</p>` : ''}
    ${c.perdivel ? `<p><strong>Atenção:</strong> ${esc(c.perdivel)}</p>` : ''}
    <div class="botoes">${c.mapcat ? '<button class="botao primario" id="btVerMapa">🗺️ Ver todos no mapa</button>' : ''}<button class="botao" id="btCP">🤖 Perguntar</button></div>
    <input type="search" id="cBusca" placeholder="Procurar nesta lista">
    ${regioes.length > 1 ? `<select id="cRegiao"><option value="">Todas as regiões</option>${[...new Set([filtroRegiao, ...regioes].filter(Boolean))].map(r => `<option ${r === filtroRegiao ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>` : ''}
    <label class="opcao"><input type="checkbox" id="cEsconder" ${Estado.esconder ? 'checked' : ''}>Esconder o que já peguei</label>
    <div id="cLista"></div>
    ${c.fontes.length ? `<p class="fraco">Fontes: ${c.fontes.map(f => link(f, nomeSite(f))).join(' · ')}</p>` : ''}`, 'colecoes');
  const desenhar = () => {
    const n = contarFeitos(c.itens);
    $('#cProg').innerHTML = `<span class="fraco">${n} de ${c.itens.length} marcados${c.meta ? ` · o 100% pede ${c.meta}` : ''}</span>${barra(n, c.meta || c.itens.length)}`;
    const q = semAcento(texto);
    const vis = c.itens.filter(i => naRegiao(i) && !(Estado.esconder && feito(i.id)) && (!q || semAcento(`${i.n} ${i.texto} ${i.regiao} ${i.obs}`).includes(q)));
    $('#cLista').innerHTML = vis.map(i => `<div class="linha ${feito(i.id) ? 'ok' : ''}">
      <button class="marca ${feito(i.id) ? 'on' : ''}" data-marca="${esc(i.id)}" aria-label="Marcar como pego">${feito(i.id) ? '✓' : ''}</button>
      <span class="corpo"><span class="nome">${esc(i.n)}. ${esc(i.texto)}</span><span class="sub">${esc([i.regiao, i.obs].filter(Boolean).join(' · '))}</span></span>
      ${i.mapa ? `<a class="verpino" href="#/mapa/${esc(i.mapa)}" aria-label="Ver no mapa">📍</a>` : ''}</div>`).join('') || '<p class="fraco">Nada para mostrar com esses filtros.</p>';
  };
  desenhar();
  App.redesenhar = desenhar;
  $('#cBusca').oninput = e => { texto = e.target.value; desenhar(); };
  const sel = $('#cRegiao'); if (sel) sel.onchange = e => { filtroRegiao = e.target.value; desenhar(); };
  $('#cEsconder').onchange = e => { Estado.esconder = e.target.checked; salvar(); desenhar(); };
  $('#btCP').onclick = () => IA.abrir();
  const v = $('#btVerMapa'); if (v) v.onclick = () => { location.hash = '#/mapa'; Mapa.mostrarCategoria(c.mapcat); };
}

/* ---------- guias ---------- */
const GUIAS = [
  ['trapacas', '🎮', 'Trapaças (códigos)'], ['eggs', '👽', 'Easter eggs e segredos'], ['armas', '🔫', 'Armas'], ['veiculos', '🚗', 'Carros e veículos'],
  ['dinheiro', '💵', 'Como ganhar dinheiro'], ['dicas', '💡', 'Dicas'], ['trofeus', '🏆', 'Troféus'], ['check100', '💯', 'Checklist 100%'],
  ['finais', '🎬', 'Finais e pós-jogo'], ['sobre', 'ℹ️', 'Fontes e créditos'],
];
const caixa = (id, titulo, sub, extra = '') => `<div class="linha ${feito(id) ? 'ok' : ''}" data-q="${esc(semAcento(titulo + ' ' + sub))}">
  <button class="marca ${feito(id) ? 'on' : ''}" data-marca="${esc(id)}" aria-label="Marcar">${feito(id) ? '✓' : ''}</button>
  <span class="corpo"><span class="nome">${esc(titulo)}</span><span class="sub">${esc(sub)}</span>${extra}</span></div>`;
const campoFiltro = '<input type="search" id="gBusca" placeholder="Procurar">';
function ligarFiltro() {
  const i = $('#gBusca'); if (!i) return;
  i.oninput = () => { const q = semAcento(i.value); $$('[data-q]').forEach(e => { e.hidden = !e.dataset.q.includes(q); }); };
}

function telaGuias() {
  App.contexto = null;
  mostrar('Guias', `<div class="grade">${GUIAS.map(([id, ic, nome]) => `<a class="cartao" href="#/guia/${id}"><b>${ic}</b>${nome}</a>`).join('')}</div>`, 'guias');
}

function telaGuia(id) {
  const G = App.guia.guias;
  const info = GUIAS.find(g => g[0] === id);
  if (!info) return telaGuias();
  let h = `<h2>${info[1]} ${info[2]}</h2>`;
  App.contexto = { titulo: `Guia: ${info[2]}`, texto: '' };
  if (id === 'trapacas') {
    const nomes = { '↑': 'cima', '↓': 'baixo', '←': 'esquerda', '→': 'direita' };
    const item = t => `<div class="cartao" data-q="${esc(semAcento(t.nome + ' ' + t.efeito + ' ' + t.libera))}"><h4>${esc(t.nome)}</h4><p>${esc(t.efeito)}</p>
      ${t.seq ? `<div class="setas" aria-label="${esc(t.seq.split(/\s+/).map(s => nomes[s] || s).join(', '))}">${t.seq.split(/\s+/).map(s => `<span aria-hidden="true">${esc(s)}</span>`).join('')}</div>` : '<p class="fraco">Sequência de botões ainda não publicada: veja na aba Cheats do jogo depois de liberar.</p>'}
      ${t.libera ? `<p class="fraco">Para liberar: ${esc(t.libera)}</p>` : ''}${t.nota ? `<p class="fraco">${esc(t.nota)}</p>` : ''}</div>`;
    const com = G.trapacas.lista.filter(t => t.seq), sem = G.trapacas.lista.filter(t => !t.seq);
    h += `<div class="cartao perigo"><h4>Como usar</h4><ul class="simples">${G.trapacas.como.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>${campoFiltro}
      <h3>Com sequência de botões (${com.length})</h3>${com.map(item).join('')}<h3>Outras trapaças (${sem.length})</h3>${sem.map(item).join('')}`;
  } else if (id === 'eggs') {
    h += campoFiltro + G.eggs.map(e => `<div class="cartao" data-q="${esc(semAcento(e.nome + ' ' + e.regiao + ' ' + e.local))}">
      <h4>${esc(e.nome)}</h4><p class="fraco">${esc([e.regiao, e.quando].filter(Boolean).join(' · '))}</p><p>${esc(e.local)}</p>
      ${e.passos.length ? `<ul class="simples">${e.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}${e.recompensa ? `<p><strong>Recompensa:</strong> ${esc(e.recompensa)}</p>` : ''}
      <div class="botoes"><button class="botao ${feito('egg-' + slug(e.nome)) ? 'feito' : ''}" data-marca="egg-${slug(e.nome)}">${feito('egg-' + slug(e.nome)) ? '✓ Já vi' : 'Marcar como visto'}</button>
      ${e.mapa ? `<a class="botao" href="#/mapa/${esc(e.mapa)}">📍 Mapa</a>` : ''}</div>${link(e.fonte, 'fonte: ' + nomeSite(e.fonte))}</div>`).join('');
  } else if (id === 'armas') {
    const grupos = {}; G.armas.forEach(a => (grupos[a.categoria] ||= []).push(a));
    h += `<p class="fraco">Marque as armas que já encontrou (o 100% pede 50). Arma comprada que for descartada volta pelo armário da Ammu-Nation ou pelo porta-malas.</p>${campoFiltro}` +
      Object.entries(grupos).map(([g, l]) => `<h3>${esc(g)}</h3>` + l.map(a => caixa('arma-' + slug(a.nome), a.nome + (a.unica ? ' ★ única' : ''),
        [a.como_conseguir, a.local, a.preco, a.dica].filter(Boolean).join(' · '))).join('')).join('');
  } else if (id === 'veiculos') {
    h += `${campoFiltro}<h3>Carros raros e especiais: onde pegar</h3>` + G.raros.map(v => caixa('raro-' + slug(v.nome), v.nome, `${v.local} ${v.obs}`,
      v.passos.length ? `<ul class="simples">${v.passos.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '')).join('')
      + '<h3>Lista de desejos do Randy</h3>' + G.randy.map(v => caixa('randy-' + slug(v.carro), v.carro, `${v.onde}. ${v.obs || ''}`)).join('')
      + '<h3>Garagens</h3>' + G.garagens.map(v => caixa('gar-' + slug(v.nome), v.nome, [v.local, v.preco, v.como].filter(Boolean).join(' · '))).join('')
      + '<h3>Escanear veículos (app WAiNK, o 100% pede 200)</h3>' + G.todos.map(g => `<details><summary>${esc(g.categoria)} (${g.nomes.filter(n => feito('vei-' + slug(n))).length}/${g.nomes.length})</summary>${g.nomes.map(n => caixa('vei-' + slug(n), n, '')).join('')}</details>`).join('')
      + '<p class="fraco">Veja também as listas "Veículos especiais", "Carros do Randy" e "Carros do Moses" em Coleções.</p>';
  } else if (id === 'dinheiro') {
    h += G.dinheiro.map(d => `<div class="cartao"><h4>${esc(d.metodo)}</h4><p>${esc(d.como)}</p><p class="fraco">${esc(d.valor)}</p></div>`).join('');
  } else if (id === 'dicas') {
    h += G.dicas.map(d => `<details open><summary>${esc(d.tema)}</summary><ul class="simples">${d.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>`).join('');
  } else if (id === 'trofeus') {
    const n = G.trofeus.filter(t => feito('tr-' + slug(t.nome))).length;
    h += `<span class="fraco">${n} de ${G.trofeus.length}</span>${barra(n, G.trofeus.length)}${campoFiltro}` +
      G.trofeus.map(t => caixa('tr-' + slug(t.nome), Estado.spoiler && /cap[ií]tulo [345]/i.test(t.como) && Estado.cap < 3 ? 'Troféu de história (oculto)' : t.nome,
        `${t.tipo} · ${Estado.spoiler && /cap[ií]tulo [345]/i.test(t.como) && Estado.cap < 3 ? 'avance na história' : t.como}${t.confirmar ? ' (a confirmar)' : ''}`)).join('');
  } else if (id === 'check100') {
    const grupos = {}; G.check100.forEach(c => (grupos[c.grupo] ||= []).push(c));
    const soma = G.check100.reduce((s, c) => s + Math.min(1, (Estado.check[c.id] || 0) / c.meta), 0);
    h += `<p>Copie aqui os números que o jogo mostra em Progresso. <strong id="pctTotal">${Math.floor(soma * 100 / G.check100.length)}%</strong> deste checklist.</p>` +
      Object.entries(grupos).map(([g, l]) => `<h3>${esc(g)}</h3>` + l.map(c => `<div class="linha ${(Estado.check[c.id] || 0) >= c.meta ? 'ok' : ''}">
        <span class="corpo"><span class="nome">${esc(c.nome)}</span><span class="sub">meta: ${c.meta}</span></span>
        <input type="number" inputmode="numeric" min="0" max="${c.meta}" value="${Estado.check[c.id] || 0}" data-check="${c.id}" aria-label="${esc(c.nome)}"></div>`).join('')).join('') +
      '<p class="fraco">Metas conforme os checklists publicados; confira sempre o contador do jogo.</p>';
  } else if (id === 'finais') {
    if (Estado.spoiler && Estado.cap < 5) {
      h += '<div class="cartao aviso"><h4>Spoiler pesado</h4><p>Aqui estão os finais da história.</p><button class="botao primario" id="btFinais">Mostrar mesmo assim</button></div>';
    }
    h += `<div id="finais" ${Estado.spoiler && Estado.cap < 5 ? 'hidden' : ''}>${G.finais.map(f => `<div class="cartao"><h4>${esc(f.nome)}</h4><p><strong>Como:</strong> ${esc(f.como_conseguir)}</p><p>${esc(f.o_que_acontece)}</p></div>`).join('')}
      <h3>Depois dos créditos</h3><ul class="simples">${G.posjogo.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
  } else if (id === 'sobre') {
    const sites = new Map();
    const guardar = u => { if (/^http/.test(u || '')) sites.set(nomeSite(u), (sites.get(nomeSite(u)) || new Set()).add(u)); };
    App.guia.missoes.forEach(m => (m.fontes || []).forEach(guardar));
    App.guia.colecoes.forEach(c => c.fontes.forEach(guardar));
    G.eggs.forEach(e => guardar(e.fonte)); G.raros.forEach(e => guardar(e.fonte));
    h += `<div class="cartao destaque"><h4>Créditos</h4><p>Desenvolvido por <strong>Prof. Me. Xandy Gomes</strong><br>
      com contribuições de <strong>Claude.IA</strong></p><p>${link('https://github.com/XandyGomes', 'github.com/XandyGomes')}</p></div>
      <div class="cartao"><p>Guia pessoal, feito por fã, sem vínculo com a Rockstar Games ou a Take-Two. Os textos são resumos em palavras próprias; as páginas originais têm fotos e mais detalhes.</p>
      <p>Mapa e locais: ${link('https://map.gtadb.org', 'GTA VI Map Tiles e Landmarks Data, gtadb.org e colaboradores')} (${link('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}).<br>
      Marcadores: ${link('https://gta.fandom.com/wiki/Map:GTA_VI_Places_of_Interest', 'GTA Wiki no Fandom')} (CC BY-SA). Textos traduzidos e pinos convertidos para este app.<br>
      Locais das cartas e dos demais itens, com textos em português: ${link('https://jeanropke.github.io/GTAVIMap/', 'GTAVIMap, de Jean Ropke')} (dados reutilizados com crédito; os direitos do jogo são dos donos).<br>
      Posição das efígies: lida nas telas de mapa publicadas pelo ${link('https://www.powerpyx.com/gta-6-search-for-tree-effigies-locations-walkthrough/', 'PowerPyx')}.<br>
      Descrições extras das cartas: ${link('https://thegameswiki.com/gta6/wiki/collectible-card-sets', 'The Games Wiki')} (${link('https://creativecommons.org/licenses/by-nc-sa/4.0/', 'CC BY-NC-SA 4.0')}), traduzidos e resumidos; uso não comercial, sob a mesma licença.</p>
      <p>Dados pesquisados em ${esc(App.guia.versao.split('-').reverse().join('/'))}.</p></div>
      <div class="cartao"><h4>Mapas interativos na internet</h4><p>${link('https://mapgenie.io/grand-theft-auto-6/maps/leonida', 'MapGenie')} (tem mais categorias, como animais) · ${link('https://gta6route.com/', 'GTA6 Route')} · ${link('https://map.gtadb.org/', 'gtadb')}</p></div>` +
      [...sites].map(([s, us]) => `<details><summary>${esc(s)} (${us.size} páginas)</summary><ul class="simples">${[...us].sort().map(u => `<li>${link(u, decodeURIComponent(new URL(u).pathname))}</li>`).join('')}</ul></details>`).join('');
  }
  mostrar(info[2], h, 'guias');
  ligarFiltro();
  App.redesenhar = () => {   // mantém busca, grupos abertos e posição ao marcar um item
    const y = scrollY, q = $('#gBusca')?.value || '', abertos = $$('#tela details').map(d => d.open);
    telaGuia(id);
    $$('#tela details').forEach((d, i) => { if (i in abertos) d.open = abertos[i]; });
    if (q) { $('#gBusca').value = q; $('#gBusca').oninput(); }
    scrollTo(0, y);
  };
  $$('[data-check]').forEach(i => i.onchange = () => {
    Estado.check[i.dataset.check] = Math.max(0, Math.min(+i.max, Math.floor(+i.value || 0))); salvar(); App.redesenhar();
  });
  const bf = $('#btFinais'); if (bf) bf.onclick = () => { $('#finais').hidden = false; bf.closest('.cartao').remove(); };
}

/* ---------- busca ---------- */
function telaBusca() {
  App.contexto = null;
  mostrar('Buscar', '<input type="search" id="bTexto" placeholder="Missão, arma, carro, carta, lugar…" autofocus><div id="bRes"></div>', '');
  const g = App.guia;
  const base = [
    ...g.missoes.map(m => ({ t: m.titulo, s: `Missão · capítulo ${m.cap || 'livre'}`, h: `#/m/${m.id}`, q: oculto(m.cap) ? '' : `${m.titulo} ${m.grupo} ${m.quem || ''}`, q2: oculto(m.cap) ? '' : m.passos.join(' ') })),
    ...g.colecoes.map(c => ({ t: c.nome, s: 'Coleção', h: `#/col/${c.id}`, q: c.nome, q2: c.como })),
    ...g.colecoes.flatMap(c => c.itens.map(i => ({ t: i.texto, s: `${c.nome} · ${i.regiao}`, h: i.mapa ? `#/mapa/${i.mapa}` : `#/col/${c.id}`, q: i.texto, q2: i.regiao }))),
    ...g.guias.armas.map(a => ({ t: a.nome, s: 'Arma', h: '#/guia/armas', q: `${a.nome} ${a.categoria}`, q2: a.como_conseguir })),
    ...g.guias.raros.map(a => ({ t: a.nome, s: 'Veículo', h: '#/guia/veiculos', q: a.nome, q2: a.local })),
    ...g.guias.randy.map(a => ({ t: a.carro, s: 'Carro do Randy', h: '#/guia/veiculos', q: a.carro, q2: a.onde })),
    ...g.guias.trapacas.lista.map(a => ({ t: a.nome, s: 'Trapaça', h: '#/guia/trapacas', q: `${a.nome} trapaça código cheat`, q2: a.efeito })),
    ...g.guias.eggs.map(a => ({ t: a.nome, s: 'Easter egg', h: '#/guia/eggs', q: `${a.nome} easter egg segredo`, q2: a.local })),
    ...g.guias.trofeus.map(a => ({ t: a.nome, s: 'Troféu', h: '#/guia/trofeus', q: `${a.nome} troféu`, q2: a.como })),
  ].map(x => ({ ...x, q: semAcento(x.q), q2: semAcento(x.q2) }));
  $('#bTexto').oninput = e => {
    const termos = semAcento(e.target.value).split(/\s+/).filter(Boolean);
    if (!termos.join('') || termos.join('').length < 2) { $('#bRes').innerHTML = ''; return; }
    const r = base.filter(x => termos.every(t => x.q.includes(t) || x.q2.includes(t)))
      .sort((a, b) => termos.filter(t => b.q.includes(t)).length - termos.filter(t => a.q.includes(t)).length).slice(0, 60);
    $('#bRes').innerHTML = r.map(x => `<a class="cartao" href="${esc(x.h)}"><strong>${esc(x.t)}</strong><br><span class="fraco">${esc(x.s)}</span></a>`).join('') || '<p>Nada encontrado. Experimente perguntar à IA.</p>';
  };
  $('#bTexto').focus();
}

/* ---------- ajustes ---------- */
async function baixarMapa(nivelMax) {
  if (!('caches' in window)) return avisar('Para baixar o mapa, abra o app por localhost ou por um endereço https.');
  const lista = await (await fetch('dados/blocos.json')).json();
  const urls = [];
  for (let z = 0; z <= nivelMax; z++) for (const p of lista[z]) urls.push(`mapa/tiles/${z}/${z},${p}.jpg`);
  const cache = await caches.open('leonida-mapa'), saida = $('#mapaStatus');
  let n = 0, erros = 0, i = 0;
  const trabalhar = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try { if (!await cache.match(u)) await cache.add(u); } catch (e) { erros++; }
      if (++n % 50 === 0 || n === urls.length) saida.textContent = `${n} de ${urls.length} blocos…`;
    }
  };
  await Promise.all(Array.from({ length: 8 }, trabalhar));
  saida.textContent = erros ? `Terminado com ${erros} falhas. Toque de novo para completar.` : 'Mapa salvo para usar sem internet ✓';
}

function telaAjustes() {
  App.contexto = null;
  mostrar('Ajustes', `
    ${Instalar.cartao(true)}
    <div class="cartao"><h4>Spoilers</h4><label class="opcao"><input type="checkbox" id="aSpoiler" ${Estado.spoiler ? 'checked' : ''}>Esconder missões de capítulos que ainda não alcancei</label></div>
    <div class="cartao"><h4>Inteligência artificial (Gemini, plano gratuito)</h4>
      <p class="fraco">${IA.chave() ? 'Chave salva neste aparelho ✓' : 'Nenhuma chave salva.'} Crie a sua em ${link('https://aistudio.google.com/apikey', 'aistudio.google.com/apikey')}.</p>
      <input type="password" id="aChave" placeholder="Cole uma nova chave" autocomplete="off">
      <div class="botoes"><button class="botao primario" id="aSalvar">Salvar chave</button>${IA.chave() ? '<button class="botao" id="aApagar">Apagar chave</button>' : ''}</div></div>
    <div class="cartao"><h4>Meu progresso</h4><p class="fraco">Fica salvo neste aparelho. Use o arquivo para passar do computador para o celular ou guardar uma cópia.</p>
      <div class="botoes"><button class="botao" id="aExportar">Salvar arquivo de progresso</button><button class="botao" id="aImportar">Carregar arquivo</button><button class="botao" id="aZerar">Zerar tudo</button></div>
      <input type="file" id="aArquivo" accept="application/json,.json" hidden></div>
    <div class="cartao"><h4>Mapa sem internet</h4><p class="fraco">Guarda os blocos do mapa neste aparelho.</p>
      <div class="botoes"><button class="botao" data-baixar="4">Zoom normal (~8 MB)</button><button class="botao" data-baixar="5">Zoom alto (~26 MB)</button><button class="botao" data-baixar="6">Zoom máximo (~86 MB)</button></div><p id="mapaStatus" class="fraco"></p></div>`, '');
  $('#aSpoiler').onchange = e => { Estado.spoiler = e.target.checked; salvar(); };
  $('#aSalvar').onclick = () => { const v = $('#aChave').value.trim(); if (v.length < 20) return avisar('Essa chave parece incompleta.'); IA.definirChave(v); avisar('Chave salva.'); telaAjustes(); };
  const ap = $('#aApagar'); if (ap) ap.onclick = () => { IA.definirChave(''); telaAjustes(); };
  $('#aExportar').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(Estado)], { type: 'application/json' }));
    a.download = 'meu-progresso-gta6.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#aImportar').onclick = () => $('#aArquivo').click();
  $('#aArquivo').onchange = async e => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
      if (!objeto(d) || !objeto(d.feitos)) throw new Error();
      for (const k of Object.keys(PADRAO)) if (k in d) Estado[k] = d[k];
      Estado.passos = objeto(Estado.passos) ? Estado.passos : {}; Estado.check = objeto(Estado.check) ? Estado.check : {};
      Estado.cap = [1, 2, 3, 4, 5].includes(Estado.cap) ? Estado.cap : 1;
      salvar(); avisar('Progresso carregado ✓'); telaAjustes();
    } catch (err) { avisar('Esse arquivo não é um progresso válido.'); }
  };
  $('#aZerar').onclick = () => {
    if (!confirm('Apagar TODO o progresso marcado neste aparelho? Não dá para desfazer.')) return;
    Object.assign(Estado, JSON.parse(JSON.stringify(PADRAO))); salvar(); avisar('Progresso zerado.'); telaAjustes();
  };
  $$('[data-baixar]').forEach(b => b.onclick = () => baixarMapa(+b.dataset.baixar));
}

/* ---------- navegação ---------- */
function rotear() {
  const [rota = '', a, b] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const noMapa = rota === 'mapa';
  App.redesenhar = null;
  $('#mapaBox').hidden = !noMapa; tela().hidden = noMapa;
  document.body.classList.toggle('no-mapa', noMapa);
  if (!noMapa) { document.body.classList.remove('cartao-aberto'); $('#mapaCartao').hidden = true; }
  $('#ia').hidden = true;
  $('#btVoltar').style.visibility = rota ? 'visible' : 'hidden';
  if (noMapa) {
    $('#tituloTopo').textContent = 'Mapa de Leonida';
    $$('#abas a').forEach(x => x.classList.toggle('ativa', x.dataset.aba === 'mapa'));
    Mapa.medir();
    if (a && a.startsWith('m:')) {
      const m = App.guia.missoes.find(x => x.id === a.slice(2));
      $('#tituloTopo').textContent = 'Locais da missão';
      Mapa.missao(m, b);
    } else {
      Mapa.sairMissao();
      if (a && a.startsWith('c:')) Mapa.mostrarCategoria(a.slice(2).split(','));
      else if (a) Mapa.irPara(a); else Mapa.pintar();
    }
    return;
  }
  if (rota === 'cap') telaCapitulo(Math.max(0, Math.min(5, +a || 0)));
  else if (rota === 'm') telaMissao(a);
  else if (rota === 'colecoes') telaColecoes(a);
  else if (rota === 'col') telaColecao(a, b);
  else if (rota === 'guias') telaGuias();
  else if (rota === 'guia') telaGuia(a);
  else if (rota === 'busca') telaBusca();
  else if (rota === 'ajustes') telaAjustes();
  else telaInicio();
  scrollTo(0, 0);
}

/* Qualquer botão com data-marca alterna o "feito" e atualiza a tela sem perder a posição. */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-marca]');
  if (!b) return;
  alternar(b.dataset.marca);
  if (App.redesenhar) return App.redesenhar();
  const y = scrollY; rotear(); scrollTo(0, y);
});
$('#btVoltar').onclick = () => { history.length > 1 ? history.back() : (location.hash = '#/'); };

(async function iniciar() {
  try {
    const ler = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); };
    [App.guia, App.mapa] = await Promise.all([ler('dados/guia.json'), ler('dados/mapa.json')]);
  } catch (e) {
    tela().innerHTML = '<div class="cartao perigo"><h4>Não consegui carregar o guia</h4><p>Abra o app pelo arquivo <b>iniciar.bat</b> (não dá para abrir o index.html com dois cliques).</p></div>';
    return;
  }
  App.guia.colecoes.forEach(c => { if (c.antiga) c.itens = c.itens.filter(i => feito(i.id)); });
  App.guia.colecoes = App.guia.colecoes.filter(c => c.itens.length);
  Mapa.iniciar(App.mapa);
  IA.iniciar();
  window.addEventListener('hashchange', rotear);
  rotear();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
