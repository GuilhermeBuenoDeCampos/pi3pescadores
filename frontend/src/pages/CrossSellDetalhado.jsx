import { useEffect, useState } from 'react';
import { FiArrowLeft, FiBox, FiLink, FiRefreshCw, FiShoppingBag } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchCrossSell } from '../services/api';
import styles from './CrossSellDetalhado.module.css';

function CrossSellDetalhado() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const result = await fetchCrossSell(100);

        if (mounted) {
          setData(result);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Nao foi possivel carregar o cross-sell.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const combinacoes = data?.combinacoes || [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/admin')}>
          <FiArrowLeft /> Voltar
        </button>
        <div>
          <h1>Cross-sell</h1>
          <p>Produtos que aparecem juntos com maior frequencia em pedidos validos.</p>
        </div>
      </header>

      <section className={styles.summaryGrid}>
        <article className={styles.heroCard}>
          <FiLink />
          <span>Combinacao lider</span>
          <strong>
            {loading
              ? 'Carregando...'
              : data?.topCombinacao
                ? `${data.topCombinacao.produtoA.nome} + ${data.topCombinacao.produtoB.nome}`
                : 'Sem combinacoes'}
          </strong>
          <small>
            {data?.topCombinacao
              ? `${data.topCombinacao.pedidosJuntos} pedidos juntos`
              : 'Ainda nao existem pedidos com produtos diferentes'}
          </small>
        </article>

        <article className={styles.metricCard}>
          <FiShoppingBag />
          <span>Pedidos analisados</span>
          <strong>{loading ? '--' : data?.totalPedidosAnalisados || 0}</strong>
        </article>

        <article className={styles.metricCard}>
          <FiBox />
          <span>Pedidos com varios itens</span>
          <strong>{loading ? '--' : data?.pedidosComMultiplosItens || 0}</strong>
        </article>

        <article className={styles.metricCard}>
          <FiLink />
          <span>Combinacoes encontradas</span>
          <strong>{loading ? '--' : data?.combinacoesUnicas || 0}</strong>
        </article>
      </section>

      <section className={styles.rankingPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Itens mais comprados juntos</h2>
            <p>Cada par conta no maximo uma vez por pedido.</p>
          </div>
          {loading && <FiRefreshCw className={styles.loadingIcon} />}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && combinacoes.length === 0 && (
          <div className={styles.empty}>Nenhuma combinacao de produtos encontrada.</div>
        )}

        {!error && combinacoes.length > 0 && (
          <div className={styles.ranking}>
            {combinacoes.map((item, index) => {
              const percentual = data?.topCombinacao?.pedidosJuntos
                ? (item.pedidosJuntos / data.topCombinacao.pedidosJuntos) * 100
                : 0;

              return (
                <article className={styles.pairCard} key={`${item.produtoA.id}-${item.produtoB.id}`}>
                  <span className={styles.position}>{index + 1}</span>
                  <div className={styles.products}>
                    <strong>{item.produtoA.nome}</strong>
                    <FiLink aria-hidden="true" />
                    <strong>{item.produtoB.nome}</strong>
                  </div>
                  <div className={styles.frequency}>
                    <strong>{item.pedidosJuntos}</strong>
                    <span>pedidos</span>
                  </div>
                  <div className={styles.bar} aria-hidden="true">
                    <span style={{ width: `${percentual}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default CrossSellDetalhado;
