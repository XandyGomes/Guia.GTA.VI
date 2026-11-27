'use strict';
/* App funciona sem internet. Troque o número da versão ao mudar arquivos do app. */
const APP = 'leonida-app-v5';
const MAPA = 'leonida-mapa';
const ARQUIVOS = ['./', 'index.html', 'css/app.css', 'js/base.js', 'js/mapa.js', 'js/ia.js', 'js/telas.js',
  'dados/guia.json', 'dados/mapa.json', 'dados/blocos.json', 'manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('leonida-') && k !== APP && k !== MAPA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // a IA vai direto para a internet
  if (url.pathname.includes('/mapa/tiles/')) {            // blocos: primeiro o que já está guardado
    e.respondWith(caches.open(MAPA).then(async c => {
      const achado = await c.match(e.request);
      if (achado) return achado;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  e.respondWith(fetch(e.request).then(r => {              // app: tenta atualizar, cai para o guardado
    if (r.ok) { const copia = r.clone(); caches.open(APP).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
