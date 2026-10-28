# Leads – app estático (protegido por senha)

App mobile para gerenciar leads: painel, cartões com **Ligar** e **WhatsApp** (mensagem pronta), status, notas, registro de contatos, follow-ups com a visão **Hoje**, score, filtros, adicionar lead e backup JSON.

## Visual
O app abre no visual **Estúdio**: fundo leve, vidro e transições curtas. No topo (e na tela da senha) dá para alternar para **3D**. A escolha fica salva neste aparelho.

Atalho: [`3d.html`](3d.html) liga o fundo 3D e entra no app. Dá para deixar os dois na tela inicial.

O 3D é um shader WebGL leve (não carrega biblioteca). Ele respeita "reduzir movimento" (mostra um quadro parado), baixa a resolução em aparelhos fracos e, se o gráfico não aguentar ou o WebGL falhar, volta sozinho para o fundo leve.

No computador (a partir de 1100px) o app vira um painel: barra lateral, números grandes, grade de leads e ficha ao lado. Setas movem a seleção, Esc fecha a ficha. No celular o fluxo continua o de sempre.

O fundo pausa enquanto você rola, toca ou deixa a aba escondida. Listas grandes mostram 20 leads por vez (`Mostrar mais`). O 3D fica em no máximo 30 fps, com resolução limitada, e em aparelho fraco volta sozinho para o fundo estático.

## Segurança
- Os leads ficam **só criptografados** em `data.enc.json`.
- **Formato atual (v1):** AES-GCM 256, chave PBKDF2-SHA256 com 310.000 iterações, salt e IV aleatórios, base64. É o que o site publicado usa hoje. O app continua abrindo esse arquivo.
- **Formato com equipe (v2), opcional:** os leads são cifrados uma vez com uma chave aleatória. Essa chave é embrulhada à parte para a senha do dono e para a senha da equipe. Dá para trocar ou revogar a senha da equipe rodando o `encrypt.js` de novo, sem reaproveitar o envelope antigo.
- A descriptografia acontece no navegador (WebCrypto). Senha errada mostra erro. Depois de entrar, o crachá diz **Dono** ou **Equipe**. A equipe vê e contata os leads; o backup (exportar/importar) fica só com o dono.
- "Lembrar nesta sessão" guarda a chave no `sessionStorage` até fechar a aba. O botão "Sair" apaga. A senha não fica salva.
- Status, notas, log e follow-ups ficam no `localStorage` do navegador, em texto, ligados ao @handle. O backup exportado também **não** é criptografado: guarde com cuidado.
- Sem a senha ninguém lê os leads, mas qualquer pessoa com o link vê que o app existe. Use senhas fortes e diferentes.

## Atualizar os dados
```bash
export LEADS_APP_PASSWORD='sua-senha'          # não salve em arquivo do repositório
# export LEADS_STAFF_PASSWORD='senha-da-equipe'  # opcional; sem isto o arquivo continua v1
node encrypt.js /workspace/leads/leads_instagram.csv   # ou um leads.json
node selftest.js                                       # imprime OK ou FAIL
```
Só com `LEADS_APP_PASSWORD`, o comando segue igual ao de hoje e o `selftest.js` confere essa senha. Com `LEADS_STAFF_PASSWORD` também definida, o arquivo passa a ser v2 e o selftest confere as duas. Nenhuma senha é impressa.

Para **trocar** a senha da equipe, exporte de novo com a senha nova. Para **revogar**, rode sem `LEADS_STAFF_PASSWORD` (volta ao v1). O app publicado continua abrindo o arquivo antigo até essa regeneração.

Leads novos aparecem e o que você salvou no navegador continua (ligado ao @handle).

## Publicar no GitHub Pages
Suba `index.html`, `app.js`, `style.css`, `manifest.webmanifest` e `data.enc.json` e ative o Pages. Não precisa de build. Não suba CSV/JSON em texto puro.
No celular: abra o link e use "Adicionar à tela inicial".
