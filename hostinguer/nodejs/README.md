# Backend

Esta pasta concentra a API do projeto.

Aqui ficam o servidor Express, as regras de negocio, o acesso ao banco de dados e os endpoints usados pelo frontend.

## Stack

- Express
- Sequelize
- MySQL

## Como subir

1. Crie um arquivo `.env` na pasta `backend` com base no `.env.example`.
2. Ajuste `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `PORT`.
3. Rode as migrations:
   - `npm run db:migrate`
4. Rode o seeder opcionalmente:
   - `npm run db:seed`
5. Inicie o servidor:
   - `npm start`

## Testes

- Execute os testes unitarios com:
  - `npm test`

## Endpoints principais

- `GET /health`
- `GET /api/categorias`
- `GET /api/categorias/:id`
- `POST /api/categorias`
- `GET /api/produtos`
- `GET /api/produtos/:id`
- `POST /api/produtos`
- `POST /api/produtos/:id/imagens`
- `POST /api/produtos/:id/movimentacoes`
