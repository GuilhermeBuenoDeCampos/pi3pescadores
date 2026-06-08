-- Migration inicial do banco de dados
-- Cria as tabelas categoria, produto, produto_imagens e estoque_movimentacoes.

CREATE TABLE IF NOT EXISTS categoria (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(180) NOT NULL,
    descricao TEXT,
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0,
    preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0,
    peso NUMERIC(10, 3),
    altura NUMERIC(10, 3),
    largura NUMERIC(10, 3),
    profundidade NUMERIC(10, 3),
    id_categoria BIGINT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_produto_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_produto_preco_custo CHECK (preco_custo >= 0),
    CONSTRAINT chk_produto_preco_venda CHECK (preco_venda >= 0),
    CONSTRAINT chk_produto_peso CHECK (peso IS NULL OR peso >= 0),
    CONSTRAINT chk_produto_altura CHECK (altura IS NULL OR altura >= 0),
    CONSTRAINT chk_produto_largura CHECK (largura IS NULL OR largura >= 0),
    CONSTRAINT chk_produto_profundidade CHECK (profundidade IS NULL OR profundidade >= 0)
);

CREATE TABLE IF NOT EXISTS produto_imagens (
    id BIGSERIAL PRIMARY KEY,
    id_produto BIGINT NOT NULL,
    url TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_produto_imagens_produto
        FOREIGN KEY (id_produto)
        REFERENCES produto (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    id_produto BIGINT NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    quantidade INTEGER NOT NULL,
    motivo VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_estoque_movimentacoes_produto
        FOREIGN KEY (id_produto)
        REFERENCES produto (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_estoque_movimentacoes_tipo CHECK (tipo IN ('entrada', 'saida')),
    CONSTRAINT chk_estoque_movimentacoes_quantidade CHECK (quantidade > 0),
    CONSTRAINT chk_estoque_movimentacoes_motivo CHECK (motivo IN ('compra', 'venda', 'ajuste'))
);

CREATE OR REPLACE FUNCTION atualizar_timestamp_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_produto_atualiza_timestamp ON produto;

CREATE TRIGGER trg_produto_atualiza_timestamp
BEFORE UPDATE ON produto
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp_atualizado_em();

DROP TRIGGER IF EXISTS trg_categoria_atualiza_timestamp ON categoria;

CREATE TRIGGER trg_categoria_atualiza_timestamp
BEFORE UPDATE ON categoria
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp_atualizado_em();
