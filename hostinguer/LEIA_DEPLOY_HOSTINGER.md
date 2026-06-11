# Deploy na Hostinger

Este pacote foi preparado para o dominio cair no backend Express, sem subdominio.

## Estrutura

- `hostinguer/nodejs`: backend completo. Use esta pasta como Node.js app.
- `hostinguer/nodejs/uploads`: imagens servidas em `/uploads`.
- `hostinguer/public_html`: build do frontend Vite.

O `.htaccess` de `public_html` deve manter as diretivas `PassengerAppRoot`,
`PassengerStartupFile` e `PassengerBaseURI` geradas pela Hostinger. Nao use
nele a regra de SPA que redireciona toda URL inexistente para `index.html`.
Essa regra captura `/api`, `/uploads` e `/health` antes do Express.

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

Depois do deploy, confirme no Gerenciador de Arquivos que o `.htaccess`
continua com as diretivas Passenger e sem `RewriteRule . /index.html [L]`.
O proprio Express entrega `public_html/index.html` nas rotas do React.

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

## Modulo de enderecos

Antes de publicar o backend com a pagina "Meus enderecos", execute no
phpMyAdmin o arquivo:

- `hostinguer/ATUALIZACAO_BANCO_ENDERECOS_MYSQL.sql`

Ele cria as tabelas `estados`, `cidades` e `enderecos_usuario`. Depois envie a
pasta `hostinguer/nodejs` atualizada e reinicie a aplicacao Node.js.

## Pesquisa de satisfacao

Antes de publicar o backend com a pesquisa de satisfacao, execute no
phpMyAdmin o arquivo:

- `hostinguer/ATUALIZACAO_BANCO_AVALIACOES_MYSQL.sql`

Ele cria a tabela `avaliacoes`, usada no detalhe do pedido e nos indicadores
de satisfacao do painel administrativo. Depois envie a pasta
`hostinguer/nodejs` atualizada e reinicie a aplicacao Node.js.

## Comportamento de usuarios

Antes de publicar o backend com o painel de comportamento, execute no
phpMyAdmin o arquivo:

- `hostinguer/ATUALIZACAO_BANCO_ANALYTICS_MYSQL.sql`

Ele cria a tabela `analytics_comportamento`, usada para registrar visualizacoes,
cliques, hovers e tempo de permanencia. Depois envie as pastas
`hostinguer/nodejs` e `hostinguer/public_html` atualizadas e reinicie a
aplicacao Node.js.

## Testes

Depois de reiniciar o app Node, acesse:

- `https://www.trespescadoresstore.com.br/health`
- `https://www.trespescadoresstore.com.br/api/categorias`
- `https://www.trespescadoresstore.com.br/uploads/Banner/Aparecida.png`

Se `/health` retornar `503`, o Node esta caindo no runtime. Verifique `stderr.log` no painel da Hostinger.
Se `/health` retornar HTML, remova do `.htaccess` a regra
`RewriteRule . /index.html [L]` e reinicie a aplicacao Node.
