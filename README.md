# Leads – app estático (protegido por senha)

App mobile para gerenciar leads: painel, cartões com **Ligar** e **WhatsApp** (mensagem pronta), status, notas, registro de contatos, follow-ups com a visão **Hoje**, score, filtros, adicionar lead e backup JSON.

## Segurança
- Os leads ficam **só criptografados** em `data.enc.json` (AES-GCM 256, chave PBKDF2-SHA256 com 310.000 iterações, salt e IV aleatórios, base64).
- A descriptografia acontece no navegador (WebCrypto) depois que você digita a senha. Senha errada mostra erro.
- "Lembrar nesta sessão" guarda a chave derivada no `sessionStorage` até fechar a aba. O botão "Sair" apaga.
- Status, notas, log e follow-ups ficam no `localStorage` do navegador, em texto, ligados ao @handle. O backup exportado também **não** é criptografado: guarde com cuidado.
- Sem a senha ninguém lê os leads, mas qualquer pessoa com o link vê que o app existe. Use uma senha forte.

## Atualizar os dados
```bash
export LEADS_APP_PASSWORD='sua-senha'   # não salve em arquivo do repositório
node encrypt.js /workspace/leads/leads_instagram.csv   # ou um leads.json
node selftest.js                                       # imprime OK ou FAIL
```
Leads novos aparecem e o que você salvou no navegador continua (ligado ao @handle).

## Publicar no GitHub Pages
Suba `index.html`, `app.js`, `style.css`, `manifest.webmanifest` e `data.enc.json` e ative o Pages. Não precisa de build. Não suba CSV/JSON em texto puro.
No celular: abra o link e use "Adicionar à tela inicial".
