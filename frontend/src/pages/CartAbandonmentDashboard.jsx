import { useEffect, useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FiCheckCircle, FiFilter, FiPercent, FiShoppingCart, FiXCircle } from 'react-icons/fi';
import AdminSidebar from '../components/AdminSidebar';
import CartAbandonmentMetricCard from '../components/CartAbandonmentMetricCard';
import { EmptyState, ErrorState, LoadingState } from '../components/CartAbandonmentStates';
import {
  fetchCarrinhoAbandonoDashboard,
  fetchCarrinhoAbandonoMensal,
} from '../services/carrinhoAbandonoService';
import styles from './CartAbandonmentDashboard.module.css';

ChartJS.register(CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip);

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return formatLocalDate(date);
}

function getToday() {
  return formatLocalDate(new Date());
}

function CartAbandonmentDashboard() {
  const [draftFilters, setDraftFilters] = useState({
    dataInicio: getDefaultStartDate(),
    dataFim: getToday(),
  });
  const [filters, setFilters] = useState(draftFilters);
  const [dashboard, setDashboard] = useState(null);
  const [mensal, setMensal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const year = filters.dataFim
          ? Number(filters.dataFim.slice(0, 4))
          : new Date().getFullYear();
        const [dashboardData, mensalData] = await Promise.all([
          fetchCarrinhoAbandonoDashboard(filters),
          fetchCarrinhoAbandonoMensal(year),
        ]);

        if (isMounted) {
          setDashboard(dashboardData);
          setMensal(Array.isArray(mensalData) ? mensalData : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError);
          setDashboard(null);
          setMensal([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const metrics = useMemo(() => {
    const data = dashboard || {};

    return [
      {
        label: 'Total de carrinhos',
        value: data.totalCarrinhos ?? 0,
        icon: FiShoppingCart,
      },
      {
        label: 'Finalizados',
        value: data.carrinhosFinalizados ?? 0,
        icon: FiCheckCircle,
        tone: 'success',
      },
      {
        label: 'Abandonados',
        value: data.carrinhosAbandonados ?? 0,
        icon: FiXCircle,
        tone: 'danger',
      },
      {
        label: 'Taxa de abandono',
        value: formatPercent(data.taxaAbandono),
        icon: FiPercent,
        tone: 'warning',
      },
    ];
  }, [dashboard]);

  const chartData = useMemo(() => ({
    labels: mensal.map((item) => item.mes),
    datasets: [
      {
        label: 'Taxa de abandono',
        data: mensal.map((item) => Number(item.taxa || 0)),
        borderColor: '#08936f',
        backgroundColor: 'rgba(8, 147, 111, 0.12)',
        pointBackgroundColor: '#08936f',
        pointBorderColor: '#08936f',
        pointRadius: 4,
        tension: 0.35,
        fill: true,
      },
    ],
  }), [mensal]);

  const hasData = Number(dashboard?.totalCarrinhos || 0) > 0;

  function handleSubmit(event) {
    event.preventDefault();
    setFilters(draftFilters);
  }

  return (
    <div className={styles.container}>
      <AdminSidebar />
      <div className={styles.mainArea}>
        <header className={styles.topBar}>
          <div>
            <h1>Abandono de carrinho</h1>
            <p>Monitore carrinhos ativos, finalizados e abandonados por periodo.</p>
          </div>
        </header>

      <form className={styles.filters} onSubmit={handleSubmit}>
        <label>
          Data inicial
          <input
            type="date"
            value={draftFilters.dataInicio}
            onChange={(event) => setDraftFilters((current) => ({ ...current, dataInicio: event.target.value }))}
          />
        </label>
        <label>
          Data final
          <input
            type="date"
            value={draftFilters.dataFim}
            onChange={(event) => setDraftFilters((current) => ({ ...current, dataFim: event.target.value }))}
          />
        </label>
        <button type="submit">
          <FiFilter size={16} />
          Filtrar
        </button>
      </form>

      {loading ? <LoadingState /> : null}
      {!loading && error ? <ErrorState message={error?.message} /> : null}
      {!loading && !error && !hasData ? <EmptyState /> : null}

      {!loading && !error && hasData ? (
        <>
          <section className={styles.metricsGrid}>
            {metrics.map((metric) => (
              <CartAbandonmentMetricCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
              />
            ))}
          </section>

          <section className={styles.chartBlock}>
            <div className={styles.chartHeader}>
              <h2>Evolucao mensal</h2>
              <span>{dashboard?.periodo?.dataInicio} a {dashboard?.periodo?.dataFim}</span>
            </div>
            <div className={styles.chartCanvas}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => formatPercent(context.raw),
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      min: 0,
                      max: 100,
                      ticks: { callback: (value) => `${value}%` },
                      grid: { color: 'rgba(15, 23, 42, 0.08)' },
                    },
                  },
                }}
              />
            </div>
          </section>
        </>
      ) : null}
      </div>
    </div>
  );
}

export default CartAbandonmentDashboard;
