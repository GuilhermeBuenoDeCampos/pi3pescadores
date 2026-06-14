import { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiSearch, FiTrendingUp } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar';
import { fetchPalavrasMaisPesquisadas } from '../services/api';
import styles from './PalavrasPesquisadasDetalhado.module.css';

function PalavrasPesquisadasDetalhado() {
  const [palavras, setPalavras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const result = await fetchPalavrasMaisPesquisadas(20);

        if (mounted) {
          setPalavras(result);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || 'Nao foi possivel carregar as pesquisas.');
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

  const totalPesquisas = useMemo(
    () => palavras.reduce((total, item) => total + Number(item.total || 0), 0),
    [palavras]
  );
  const maiorTotal = Number(palavras[0]?.total || 0);

  return (
    <div className={styles.container}>
      <AdminSidebar />

      <main className={styles.mainArea}>
        <header className={styles.header}>
          <div>
            <h1>Palavras mais pesquisadas</h1>
            <p>Ranking dos termos buscados pelos clientes na loja.</p>
          </div>
          {loading && <FiRefreshCw className={styles.loadingIcon} aria-label="Carregando" />}
        </header>

        <section className={styles.summaryGrid}>
          <article className={styles.heroCard}>
            <FiTrendingUp aria-hidden="true" />
            <span>Termo mais pesquisado</span>
            <strong>{loading ? 'Carregando...' : palavras[0]?.palavra || 'Sem dados'}</strong>
            <small>{palavras[0] ? `${palavras[0].total} pesquisas` : 'Nenhuma pesquisa registrada'}</small>
          </article>

          <article className={styles.metricCard}>
            <FiSearch aria-hidden="true" />
            <span>Pesquisas no ranking</span>
            <strong>{loading ? '--' : totalPesquisas}</strong>
          </article>

          <article className={styles.metricCard}>
            <FiTrendingUp aria-hidden="true" />
            <span>Termos diferentes</span>
            <strong>{loading ? '--' : palavras.length}</strong>
          </article>
        </section>

        <section className={styles.rankingPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Ranking de pesquisas</h2>
              <p>Até 20 termos, ordenados da maior para a menor frequência.</p>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {!loading && !error && palavras.length === 0 && (
            <div className={styles.empty}>Nenhuma palavra pesquisada foi registrada.</div>
          )}

          {!error && palavras.length > 0 && (
            <div className={styles.ranking}>
              {palavras.map((item, index) => {
                const percentual = maiorTotal > 0 ? (Number(item.total) / maiorTotal) * 100 : 0;

                return (
                  <article className={styles.searchRow} key={item.palavra}>
                    <span className={styles.position}>{index + 1}</span>
                    <strong>{item.palavra}</strong>
                    <div className={styles.frequency}>
                      <strong>{item.total}</strong>
                      <span>pesquisas</span>
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
    </div>
  );
}

export default PalavrasPesquisadasDetalhado;
