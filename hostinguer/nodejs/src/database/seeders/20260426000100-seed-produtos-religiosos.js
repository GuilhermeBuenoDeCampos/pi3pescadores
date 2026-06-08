'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Criar categorias
      const categorias = await queryInterface.bulkInsert(
        'categoria',
        [
          {
            nome: 'Imagens',
            descricao: 'Estatuas e imagens religiosas para altares',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
          {
            nome: 'Terços',
            descricao: 'Terços artesanais em diversos materiais',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
          {
            nome: 'Bíblias',
            descricao: 'Edições de bíblias para estudo e devoção',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
          {
            nome: 'Crucifixos',
            descricao: 'Crucifixos em madeira, metal e outros materiais',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
          {
            nome: 'Velas',
            descricao: 'Velas perfumadas para momentos de oração',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
          {
            nome: 'Livros',
            descricao: 'Livros de espiritualidade e reflexão',
            id_categoria_pai: null,
            criado_em: new Date(),
            atualizado_em: new Date(),
          },
        ],
        { transaction, returning: true }
      );

      // Buscar IDs das categorias
      const cats = await queryInterface.sequelize.query(
        'SELECT id, nome FROM categoria WHERE nome IN (?, ?, ?, ?, ?, ?)',
        {
          replacements: ['Imagens', 'Terços', 'Bíblias', 'Crucifixos', 'Velas', 'Livros'],
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const categoriaMap = {};
      cats.forEach(cat => {
        categoriaMap[cat.nome] = cat.id;
      });

      // Criar produtos
      const produtos = [
        {
          nome: 'Imagem de Nossa Senhora',
          descricao: 'Estatua delicada em porcelana branca, perfeita para altares domésticos e momentos de oração.',
          preco_custo: 45.00,
          preco_venda: 89.00,
          peso: 0.800,
          altura: 25.0,
          largura: 12.0,
          profundidade: 10.0,
          id_categoria: categoriaMap['Imagens'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Imagem de Jesus Cristo',
          descricao: 'Figura religiosa em gesso, ideal para altares e capelas. Acabamento detalhado com pintura artesanal.',
          preco_custo: 55.00,
          preco_venda: 119.99,
          peso: 1.200,
          altura: 30.0,
          largura: 15.0,
          profundidade: 12.0,
          id_categoria: categoriaMap['Imagens'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Imagem de Santo Antônio',
          descricao: 'Estatueta em resina com base de madeira. Perfeita para casa ou negócio.',
          preco_custo: 40.00,
          preco_venda: 79.99,
          peso: 0.600,
          altura: 20.0,
          largura: 10.0,
          profundidade: 8.0,
          id_categoria: categoriaMap['Imagens'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Terço de Madeira',
          descricao: 'Terço artesanal com contas em madeira natural, ideal para orações diárias e momentos de devoção.',
          preco_custo: 12.00,
          preco_venda: 29.99,
          peso: 0.050,
          altura: null,
          largura: null,
          profundidade: null,
          id_categoria: categoriaMap['Terços'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Terço de Cristal',
          descricao: 'Terço elegante com contas em cristal facetado. Acompanha crucifixo em metal dourado.',
          preco_custo: 35.00,
          preco_venda: 79.99,
          peso: 0.080,
          altura: null,
          largura: null,
          profundidade: null,
          id_categoria: categoriaMap['Terços'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Terço de Oliveira',
          descricao: 'Terço feito com contas de oliveira sagrada de Israel. Muito especial para colecionadores.',
          preco_custo: 60.00,
          preco_venda: 149.99,
          peso: 0.100,
          altura: null,
          largura: null,
          profundidade: null,
          id_categoria: categoriaMap['Terços'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Bíblia Sagrada Clássica',
          descricao: 'Edição clássica com capa elegante e texto em fonte legível, perfeita para estudos e meditação.',
          preco_custo: 45.00,
          preco_venda: 85.50,
          peso: 0.800,
          altura: 24.0,
          largura: 16.0,
          profundidade: 3.5,
          id_categoria: categoriaMap['Bíblias'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Bíblia de Estudo Anotada',
          descricao: 'Versão com notas explicativas e referências. Ideal para aprofundar no estudo das escrituras.',
          preco_custo: 75.00,
          preco_venda: 159.99,
          peso: 1.500,
          altura: 24.0,
          largura: 17.0,
          profundidade: 4.0,
          id_categoria: categoriaMap['Bíblias'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Bíblia de Bolso',
          descricao: 'Edição compacta e portátil. Perfeita para levar para a igreja ou passeios.',
          preco_custo: 20.00,
          preco_venda: 39.99,
          peso: 0.200,
          altura: 14.0,
          largura: 10.0,
          profundidade: 1.5,
          id_categoria: categoriaMap['Bíblias'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Crucifixo de Madeira',
          descricao: 'Crucifixo esculpido em madeira maciça, com acabamento natural e tratado.',
          preco_custo: 25.00,
          preco_venda: 59.99,
          peso: 0.400,
          altura: 30.0,
          largura: 18.0,
          profundidade: 2.0,
          id_categoria: categoriaMap['Crucifixos'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Crucifixo Metálico Dourado',
          descricao: 'Crucifixo em metal com banho em ouro. Elegante e durador para altares e paredes.',
          preco_custo: 45.00,
          preco_venda: 99.99,
          peso: 0.600,
          altura: 35.0,
          largura: 20.0,
          profundidade: 2.5,
          id_categoria: categoriaMap['Crucifixos'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Crucifixo de Prata',
          descricao: 'Crucifixo em metal com acabamento prateado. Trabalho artesanal refinado.',
          preco_custo: 65.00,
          preco_venda: 149.99,
          peso: 0.800,
          altura: 40.0,
          largura: 22.0,
          profundidade: 3.0,
          id_categoria: categoriaMap['Crucifixos'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Vela Aromatizada Incenso',
          descricao: 'Vela de parafina com aroma de incenso. Ideal para criar ambiente espiritual.',
          preco_custo: 8.00,
          preco_venda: 19.99,
          peso: 0.250,
          altura: 12.0,
          largura: 8.0,
          profundidade: 8.0,
          id_categoria: categoriaMap['Velas'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Vela Aromatizada Mirra',
          descricao: 'Vela em gel com aroma de mirra. Duração prolongada, aproximadamente 40 horas.',
          preco_custo: 15.00,
          preco_venda: 34.99,
          peso: 0.450,
          altura: 15.0,
          largura: 10.0,
          profundidade: 10.0,
          id_categoria: categoriaMap['Velas'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Vela de Soja Frankincenso',
          descricao: 'Vela ecológica feita com soja. Aroma puro de frankincenso para meditação.',
          preco_custo: 18.00,
          preco_venda: 44.99,
          peso: 0.500,
          altura: 14.0,
          largura: 9.0,
          profundidade: 9.0,
          id_categoria: categoriaMap['Velas'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Livro: O Poder da Oração',
          descricao: 'Reflexões e ensinamentos sobre o poder transformador da oração na vida cristã.',
          preco_custo: 30.00,
          preco_venda: 59.99,
          peso: 0.400,
          altura: 21.0,
          largura: 14.0,
          profundidade: 1.5,
          id_categoria: categoriaMap['Livros'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Livro: Meditações Diárias',
          descricao: 'Meditações e reflexões para cada dia do ano. Perfeito para momentos de introspecção.',
          preco_custo: 25.00,
          preco_venda: 49.99,
          peso: 0.380,
          altura: 20.0,
          largura: 13.0,
          profundidade: 1.8,
          id_categoria: categoriaMap['Livros'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
        {
          nome: 'Livro: Vida dos Santos',
          descricao: 'Histórias inspiradoras sobre santos e santas da Igreja Católica. Edição ilustrada.',
          preco_custo: 40.00,
          preco_venda: 79.99,
          peso: 0.800,
          altura: 24.0,
          largura: 17.0,
          profundidade: 2.0,
          id_categoria: categoriaMap['Livros'],
          ativo: true,
          criado_em: new Date(),
          atualizado_em: new Date(),
        },
      ];

      const produtosInseridos = await queryInterface.bulkInsert(
        'produto',
        produtos,
        { transaction, returning: true }
      );

      // Buscar os IDs dos produtos inseridos
      const produtoIds = await queryInterface.sequelize.query(
        'SELECT id, nome FROM produto ORDER BY id DESC LIMIT ?',
        {
          replacements: [produtos.length],
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const produtoMap = {};
      produtoIds.forEach(p => {
        produtoMap[p.nome] = p.id;
      });

      // Criar imagens para os produtos
      const imagens = [
        // Imagens
        {
          id_produto: produtoMap['Imagem de Nossa Senhora'],
          url: 'https://images.unsplash.com/photo-1531891437562-43032c46a3c8?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Imagem de Jesus Cristo'],
          url: 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Imagem de Santo Antônio'],
          url: 'https://images.unsplash.com/photo-1507568177056-8be46a4dbf74?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        // Terços
        {
          id_produto: produtoMap['Terço de Madeira'],
          url: 'https://images.unsplash.com/photo-1522324147653-e26b7a0d7f42?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Terço de Cristal'],
          url: 'https://images.unsplash.com/photo-1511203466129-824e631920d8?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Terço de Oliveira'],
          url: 'https://images.unsplash.com/photo-1507409426913-abf06409ecc5?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        // Bíblias
        {
          id_produto: produtoMap['Bíblia Sagrada Clássica'],
          url: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Bíblia de Estudo Anotada'],
          url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Bíblia de Bolso'],
          url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        // Crucifixos
        {
          id_produto: produtoMap['Crucifixo de Madeira'],
          url: 'https://images.unsplash.com/photo-1578605140619-9f8abcb3c90d?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Crucifixo Metálico Dourado'],
          url: 'https://images.unsplash.com/photo-1550255684-fc77233e2a66?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Crucifixo de Prata'],
          url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        // Velas
        {
          id_produto: produtoMap['Vela Aromatizada Incenso'],
          url: 'https://images.unsplash.com/photo-1602191953-9a6b2b8f8d1b?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Vela Aromatizada Mirra'],
          url: 'https://images.unsplash.com/photo-1602191953-9a6b2b8f8d1b?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Vela de Soja Frankincenso'],
          url: 'https://images.unsplash.com/photo-1602191953-9a6b2b8f8d1b?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        // Livros
        {
          id_produto: produtoMap['Livro: O Poder da Oração'],
          url: 'https://images.unsplash.com/photo-1507842217343-583f20270319?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Livro: Meditações Diárias'],
          url: 'https://images.unsplash.com/photo-1507842217343-583f20270319?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
        {
          id_produto: produtoMap['Livro: Vida dos Santos'],
          url: 'https://images.unsplash.com/photo-1507842217343-583f20270319?auto=format&fit=crop&w=900&q=80',
          criado_em: new Date(),
        },
      ];

      await queryInterface.bulkInsert('produto_imagens', imagens, { transaction });

      // Adicionar movimentações de estoque (entrada)
      const movimentacoes = produtos.map((produto, index) => ({
        id_produto: produtoIds[index].id,
        tipo: 'entrada',
        quantidade: Math.floor(Math.random() * 50) + 20,
        motivo: 'compra',
        created_at: new Date(),
      }));

      await queryInterface.bulkInsert('estoque_movimentacoes', movimentacoes, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Deletar na ordem correta (dependências primeiro)
      await queryInterface.bulkDelete('estoque_movimentacoes', {}, { transaction });
      await queryInterface.bulkDelete('produto_imagens', {}, { transaction });
      await queryInterface.bulkDelete('produto', {}, { transaction });
      await queryInterface.bulkDelete('categoria', {}, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
