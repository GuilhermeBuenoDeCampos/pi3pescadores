# models

Define os modelos de dados da aplicação.

Os models representam entidades do banco e podem centralizar validações e relacionamentos.

Arquivos principais:
- `index.js`: instancia o Sequelize, carrega os models e aplica associacoes.
- `categoria.js`: categoria com auto-relacionamento (pai e filhas).
- `produto.js`: produto e relacao com categoria, imagens e movimentacoes.
- `produtoImagem.js`: imagens de produto.
- `estoqueMovimentacao.js`: historico de entradas e saidas de estoque.
