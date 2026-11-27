# Meu Guia de Leonida (GTA VI)

Guia pessoal em português, feito para usar enquanto joga.

## Na internet (celular ou computador)

Abra https://xandygomes.github.io/Guia.GTA.VI/

- **Instalar no Android (Chrome):** menu ⋮ > Instalar app (ou Adicionar à tela inicial).
- **Instalar no iPhone (Safari):** botão Compartilhar > Adicionar à Tela de Início.
- **Usar sem internet:** no app, ⚙️ Ajustes > Mapa sem internet.

Para publicar mudanças: `git add -A`, `git commit -m "atualiza guia"` e `git push`.

## Como abrir no computador, sem internet

- **No computador:** dê dois cliques em `iniciar.bat`. O guia abre em http://localhost:8060.
- **No celular (mesmo Wi-Fi):** dê dois cliques em `iniciar-no-celular.bat` e digite no celular o endereço que aparecer.
  Se o Windows perguntar, permita o Python **somente em redes privadas**.
- Deixe a janela preta aberta enquanto usa.

No computador dá para instalar como app (ícone de instalar na barra de endereço) e baixar o mapa para usar sem internet.
No celular, pelo Wi-Fi, o guia funciona no navegador, mas **instalar e usar sem internet exige um endereço https**.

## O que tem

| Aba | Para quê |
|---|---|
| Rota | Passo a passo por capítulo, opcionais na ordem em que liberam e avisos antes dos pontos sem volta |
| Mapa | Mapa de Leonida com marcadores; toque num ponto para marcar como pego |
| Coleções | Cartas, flamingos, revistas, meditações, acrobacias, cofres, atividades… |
| Guias | Trapaças, easter eggs, armas, veículos, dinheiro, dicas, troféus, checklist 100% e finais |
| 🤖 Perguntar | IA que responde usando os dados do guia e a tela que você está vendo |

## Ligar a IA (grátis)

1. Entre em https://aistudio.google.com/apikey com a sua conta Google e crie uma chave.
2. No app, toque em **Perguntar** (ou em ⚙️ Ajustes), cole a chave e salve.

A chave fica só no aparelho. No plano gratuito há limite de uso e o Google pode usar as conversas para melhorar os produtos dele.

## Progresso

Fica salvo no navegador de cada aparelho. Em ⚙️ Ajustes dá para salvar um arquivo e carregar no outro aparelho.

## O que ainda está incompleto

O jogo é novo e os guias da internet ainda estão sendo escritos (pesquisa de 26/11/2026):

- Flamingos de cocaína: 28 de 125 locais (o 100% pede 100).
- Cartas colecionáveis: os 18 conjuntos têm todas as posições (Jack of Hearts, Nine1Nine e Delights aparecem como pinos no mapa).
- Algumas revistas, animais, tags No Flusher e várias sequências de trapaças não tinham local ou botões publicados.
- Existem divergências entre sites (preços, locais de alguns carros). Quando o jogo disser outra coisa, vale o jogo.

## Atualizar as informações

Os textos pesquisados ficam em `ferramentas/fontes/`. Depois de editar:

```powershell
python ferramentas/montar_dados.py
```

Ao mudar arquivos do app, aumente a versão em `sw.js` (por exemplo `leonida-app-v3` → `v4`).

## Créditos

- Mapa e locais: **gtadb.org** e colaboradores (CC BY 4.0), https://map.gtadb.org. Veja `mapa/LICENCA-gtadb.txt`.
- Locais das cartas: **The Games Wiki** (CC BY-NC-SA 4.0), https://thegameswiki.com/gta6/wiki/collectible-card-sets, traduzidos e resumidos. Uso não comercial, sob a mesma licença.
- Marcadores: **GTA Wiki (Fandom)** (CC BY-SA), https://gta.fandom.com/wiki/Map:GTA_VI_Places_of_Interest.
- Guias resumidos em palavras próprias; as fontes aparecem em cada tela e em Guias > Fontes.

Projeto de fã para uso pessoal, sem vínculo com a Rockstar Games ou a Take-Two.
