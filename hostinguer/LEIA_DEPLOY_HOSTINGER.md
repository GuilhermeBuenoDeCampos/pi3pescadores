# Deploy na Hostinger

Este pacote foi preparado para o dominio cair no backend Express, sem subdominio.

## Estrutura

- `hostinguer/nodejs`: backend completo. Use esta pasta como Node.js app.
- `hostinguer/nodejs/uploads`: imagens servidas em `/uploads`.
- `hostinguer/public_html`: build do frontend Vite.

O backend Express resolve:

- `/api`: rotas da API.
- `/uploads`: arquivos de `nodejs/uploads`.
- `/health`: teste de vida do backend.
- demais rotas GET: frontend React em `public_html/index.html`.

## Configuracao no hPanel

No Node.js Web App da Hostinger:

- App root: `nodejs`
- Entry file: `index.js`
- Start command: `npm start`
- Node: 22

Se o painel da Hostinger estiver travado em `server.js`, tambem funciona.
O arquivo `server.js` existe apenas como wrapper e chama `index.js`.

Configuracao principal do pacote:

- `main`: `index.js`
- `start`: `node index.js`
- `server.js`: `require('./index')`

Nao envie `node_modules`; a Hostinger instala as dependencias com `npm install`.

## Variaveis

Confirme no `nodejs/.env` ou nas variaveis do painel:

- `NODE_ENV=production`
- `DB_DIALECT=mysql`
- `DB_HOST`
- `DB_PORT=3306`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `SESSION_SECRET`
- `FRONTEND_URL=https://www.trespescadoresstore.com.br,https://trespescadoresstore.com.br`
- `CORS_ORIGINS=https://www.trespescadoresstore.com.br,https://trespescadoresstore.com.br`

## Testes

Depois de reiniciar o app Node, acesse:

- `https://www.trespescadoresstore.com.br/health`
- `https://www.trespescadoresstore.com.br/api/categorias`
- `https://www.trespescadoresstore.com.br/uploads/Banner/Aparecida.png`

Se `/health` retornar `503`, o Node esta caindo no runtime. Verifique `stderr.log` no painel da Hostinger.
