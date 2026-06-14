import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { fetchKpiSatisfacao } from '../services/api';
import AdminSidebar from '../components/AdminSidebar';
import styles from './SatisfacaoDetalhada.module.css';

ChartJS.register(
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip
);

const criteria = [
  ['Facilidade para encontrar o produto', 'atendimento'],
  ['Experiencia geral de compra', 'experiencia'],
  ['Probabilidade de comprar novamente', 'preco'],
  ['Qualidade dos produtos recebidos', 'qualidade'],
  ['Prazo de entrega', 'entrega'],
];

function SatisfacaoDetalhada() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      setData(await fetchKpiSatisfacao());
    } catch (err) {
      setError(err.message || 'Nao foi possivel carregar os dados de satisfacao.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const average = Number(data?.mediaGeral || 0);
  const total = Number(data?.totalAvaliacoes || 0);
  const distribution = data?.distribuicao || {};
  const radar = data?.radar || {};

  const radarData = useMemo(() => ({
    labels: criteria.map(([label]) => label),
    datasets: [{
      label: 'Satisfacao media',
      data: criteria.map(([, key]) => Number(radar[key] || 0)),
      borderColor: '#08936f',
      backgroundColor: 'rgba(8, 147, 111, 0.24)',
      pointBackgroundColor: '#08936f',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      borderWidth: 3,
    }],
  }), [radar]);

  const distributionData = useMemo(() => ({
    labels: ['5 estrelas', '4 estrelas', '3 estrelas', '2 estrelas', '1 estrela'],
    datasets: [{
      label: 'Avaliacoes',
      data: [5, 4, 3, 2, 1].map((score) => Number(distribution[score] || 0)),
      backgroundColor: ['#08936f', '#405394', '#5366aa', '#98c7f2', '#d8e8df'],
      borderRadius: 7,
      borderSkipped: false,
    }],
  }), [distribution]);

  return (
    <main className={styles.container}>
      <AdminSidebar />

      <section className={styles.mainArea}>
        <header className={styles.header}>
          <button className={styles.backButton} type="button" onClick={() => navigate('/admin')}>
            <FiArrowLeft /> Voltar
          </button>
          <div>
            <h1>Satisfacao dos clientes</h1>
            <p>Media geral, distribuicao das notas e desempenho por criterio.</p>
          </div>
          <button className={styles.refreshButton} type="button" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? styles.loadingIcon : ''} />
            Atualizar
          </button>
        </header>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <section className={styles.summaryGrid} aria-label="Resumo de satisfacao">
          <article className={styles.heroCard}>
            <span>Media geral</span>
            <strong>{loading ? '--' : `${average.toFixed(1)} / 5`}</strong>
            <small>{loading ? 'Carregando...' : `${total} avaliacoes registradas`}</small>
          </article>
          {criteria.map(([label, key]) => (
            <article className={styles.metricCard} key={key}>
              <span>{label}</span>
              <strong>{loading ? '--' : `${Number(radar[key] || 0).toFixed(1)} / 5`}</strong>
              <small>Media das avaliacoes</small>
            </article>
          ))}
        </section>

        <section className={styles.chartsGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Satisfacao por criterio</h2>
                <span>Comparativo das medias avaliadas</span>
              </div>
            </div>
            <div className={styles.chartBox}>
              <Radar
                data={radarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => `${Number(ctx.parsed.r).toFixed(1)} / 5` } },
                  },
                  scales: {
                    r: {
                      min: 0,
                      max: 5,
                      ticks: { stepSize: 1, backdropColor: 'transparent', callback: (value) => `${value}/5` },
                      grid: { color: 'rgba(8, 147, 111, 0.28)' },
                      angleLines: { color: 'rgba(8, 147, 111, 0.2)' },
                      pointLabels: { color: '#344054', font: { size: 12, weight: '700' } },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Media geral e distribuicao</h2>
                <span>{total} avaliacoes no total</span>
              </div>
            </div>
            <div className={styles.chartBox}>
              <Bar
                data={distributionData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(16, 24, 44, 0.08)' } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

export default SatisfacaoDetalhada;
