import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiArrowLeft, FiCheckCircle, FiFilter, FiPercent, FiShoppingCart, FiXCircle } from 'react-icons/fi';
import CartAbandonmentMetricCard from '../components/CartAbandonmentMetricCard';
import { EmptyState, ErrorState, LoadingState } from '../components/CartAbandonmentStates';
import { useCarrinhoAbandono } from '../hooks/useCarrinhoAbandono';
import styles from './CartAbandonmentDashboard.module.css';

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function CartAbandonmentDashboard() {
  const [draftFilters, setDraftFilters] = useState({
    dataInicio: getDefaultStartDate(),
    dataFim: getToday(),
  });
  const [filters, setFilters] = useState(draftFilters);
  const { dashboard, mensal } = useCarrinhoAbandono(filters);

  const metrics = useMemo(() => {
    const data = dashboard.data || {};

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
  }, [dashboard.data]);

  function handleSubmit(event) {
    event.preventDefault();
    setFilters(draftFilters);
  }

  const isLoading = dashboard.isLoading || mensal.isLoading;
  const error = dashboard.error || mensal.error;
  const hasData = Number(dashboard.data?.totalCarrinhos || 0) > 0;
  const monthlyData = mensal.data || [];

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <Link to="/admin" className={styles.backButton}>
            <FiArrowLeft size={16} />
            Voltar
          </Link>
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

      {isLoading ? <LoadingState /> : null}
      {!isLoading && error ? <ErrorState message={error?.message} /> : null}
      {!isLoading && !error && !hasData ? <EmptyState /> : null}

      {!isLoading && !error && hasData ? (
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
              <span>{dashboard.data?.periodo?.dataInicio} a {dashboard.data?.periodo?.dataFim}</span>
            </div>
            <div className={styles.chartCanvas}>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={monthlyData} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${value}%`} width={44} />
                  <Tooltip formatter={(value) => [formatPercent(value), 'Taxa']} />
                  <Line type="monotone" dataKey="taxa" stroke="#08936f" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

export default CartAbandonmentDashboard;
