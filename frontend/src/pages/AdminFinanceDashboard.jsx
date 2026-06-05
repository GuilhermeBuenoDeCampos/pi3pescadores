import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { FiArrowLeft, FiDownload, FiEdit, FiCheck, FiX } from 'react-icons/fi';
import { clearAuthSession, fetchCategorias, fetchFaturamentoMensal, fetchFinanceDashboard, fetchProdutosMaisVendidos, fetchVendasPorPeriodo } from '../services/api';
import styles from './AdminFinanceDashboard.module.css';

const defaultFilter = { period: 'month' };
const metaStorageKey = 'meta_financeira_override';
const periodOptions = [
  { key: 'day', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
  { key: 'custom', label: 'Personalizado' },
];
const categoryColors = ['#5366aa', '#08936f', '#f3d870', '#98c7f2', '#e0aaff', '#f093b8'];

function buildDashboardQuery(filter, customRange) {
  const query = { ...filter };

  if (filter.period === 'custom') {
    query.start = customRange.start;
    query.end = customRange.end;
  }

  return query;
}

function formatCurrency(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercent(value) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `${number.toFixed(1)}%`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildProductCsv(products) {
  const header = ['Produto', 'Unidades vendidas', 'Receita'];
  const rows = products.map((product) => [
    product.nome,
    product.unidades_vendidas ?? product.quantidade ?? 0,
    Number(product.receita ?? product.faturamento ?? 0).toFixed(2),
  ]);
  return [header, ...rows];
}

function AdminFinanceDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState(defaultFilter);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const monthlyRef = useRef(null);
  const [metaEditMode, setMetaEditMode] = useState(false);
  const [metaDraft, setMetaDraft] = useState('');
  const [metaOverride, setMetaOverride] = useState(() => localStorage.getItem(metaStorageKey));

  const { data: summaryData } = useQuery({
    queryKey: ['dashboard-financeiro', filter, customRange],
    queryFn: () => fetchFinanceDashboard(buildDashboardQuery(filter, customRange)),
    keepPreviousData: true,
  });

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['dashboard-faturamento-mensal', filter, customRange],
    queryFn: () => fetchFaturamentoMensal(buildDashboardQuery(filter, customRange)),
    keepPreviousData: true,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['dashboard-produtos-mais-vendidos', filter, customRange],
    queryFn: () => fetchProdutosMaisVendidos(buildDashboardQuery(filter, customRange)),
    keepPreviousData: true,
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['dashboard-categorias', filter, customRange],
    queryFn: () => fetchCategorias(buildDashboardQuery(filter, customRange)),
    keepPreviousData: true,
  });

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['dashboard-vendas-por-periodo', filter, customRange],
    queryFn: () => fetchVendasPorPeriodo(buildDashboardQuery(filter, customRange)),
    keepPreviousData: true,
  });

  const handleFilterChange = (period) => {
    setFilter({ period });
  };

  const handleCustomRangeChange = (event) => {
    const { name, value } = event.target;
    setCustomRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleExportProducts = () => {
    if (!productsData?.length) return;

    const rows = buildProductCsv(productsData);
    downloadCsv('produtos-mais-vendidos.csv', rows);
  };

  const darkClass = darkMode ? styles.dark : styles.light;

  const dashboardCards = useMemo(() => [
    {
      label: 'Faturamento Mensal',
      value: formatCurrency(summaryData?.faturamento_total),
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(summaryData?.ticket_medio),
    },
    {
      label: 'Meta financeira',
      value: formatCurrency(Number(metaOverride || summaryData?.meta_financeira || 0)),
    },
  ], [metaOverride, summaryData]);

  function handleOpenMonthly() {
    try {
      const url = `/admin/financeiro?tab=faturamento-mensal`;
      navigate(url);
      if (monthlyRef.current) {
        setTimeout(() => {
          monthlyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          monthlyRef.current.classList.add(styles.highlight);
          setTimeout(() => monthlyRef.current && monthlyRef.current.classList.remove(styles.highlight), 1600);
        }, 300);
      }
    } catch (e) {
      // ignore
    }
  }

  function getConversionRate(summary) {
    if (!summary) return 'N/A';
    if (summary.taxa_conversao !== undefined && summary.taxa_conversao !== null) {
      return typeof summary.taxa_conversao === 'number' ? `${summary.taxa_conversao.toFixed(1)}%` : String(summary.taxa_conversao);
    }

    const total = Number(summary.pedidos?.total || 0);
    const pagos = Number(summary.pedidos?.pagos || 0);

    if (total > 0) {
      return `${((pagos / total) * 100).toFixed(1)}%`;
    }

    return 'N/A';
  }

  useEffect(() => {
    // handle URL param to open/scroll to faturamento mensal
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      if (tab === 'faturamento-mensal' && monthlyRef.current) {
        monthlyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        monthlyRef.current.classList.add(styles.highlight);
        setTimeout(() => monthlyRef.current && monthlyRef.current.classList.remove(styles.highlight), 1600);
      }
    } catch (e) {
      // ignore
    }
  }, [location.search]);

  useEffect(() => {
    const override = localStorage.getItem(metaStorageKey);
    if (override) {
      setMetaDraft(String(Number(override)));
    } else if (summaryData?.meta_financeira) {
      setMetaDraft(String(Number(summaryData.meta_financeira)));
    }
  }, [summaryData]);

  function handleStartEditMeta() {
    setMetaEditMode(true);
  }

  function handleCancelEditMeta() {
    const override = localStorage.getItem(metaStorageKey);
    if (override) setMetaDraft(String(Number(override)));
    else if (summaryData?.meta_financeira) setMetaDraft(String(Number(summaryData.meta_financeira)));
    setMetaEditMode(false);
  }

  function handleSaveMeta() {
    const value = Number(metaDraft) || 0;
    localStorage.setItem(metaStorageKey, String(value));
    setMetaOverride(String(value));
    setMetaEditMode(false);
  }

  return (
    <main className={`${styles.page} ${darkClass}`}>
      <section className={styles.topBar}>
        <div>
          <h1>Dashboard de Faturamento</h1>
          <p>Relatório financeiro detalhado para gestores.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.modeButton} type="button" onClick={() => setDarkMode((value) => !value)}>
            {darkMode ? 'Modo claro' : 'Modo escuro'}
          </button>
          <Link to="/admin" className={styles.backButton}>
            <FiArrowLeft /> Voltar ao painel
          </Link>
        </div>
      </section>

      <section className={styles.filterBar}>
        <div className={styles.periodButtons}>
          {periodOptions.map((period) => (
            <button
              type="button"
              key={period.key}
              className={filter.period === period.key ? styles.activeFilter : ''}
              onClick={() => handleFilterChange(period.key)}
            >
              {period.label}
            </button>
          ))}
        </div>
        {filter.period === 'custom' && (
          <div className={styles.customRange}>
            <label>
              Início
              <input type="date" name="start" value={customRange.start} onChange={handleCustomRangeChange} />
            </label>
            <label>
              Fim
              <input type="date" name="end" value={customRange.end} onChange={handleCustomRangeChange} />
            </label>
          </div>
        )}
      </section>

      <section className={styles.widgetsGrid}>
        {dashboardCards.map((card) => {
          if (card.label === 'Meta financeira') {
            return (
              <article className={styles.metricCard} key={card.label}>
                <span>{card.label}</span>
                {!metaEditMode ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>{card.value}</strong>
                    <button type="button" onClick={handleStartEditMeta} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label="Editar meta">
                      <FiEdit />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      className={styles.metaEditInput}
                      type="number"
                      value={metaDraft}
                      onChange={(e) => setMetaDraft(e.target.value)}
                      min={0}
                    />
                    <button type="button" onClick={handleSaveMeta} style={{ background: '#08936f', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: 8 }}>
                      <FiCheck />
                    </button>
                    <button type="button" onClick={handleCancelEditMeta} style={{ background: '#f3f4f6', border: 'none', padding: '8px 10px', borderRadius: 8 }}>
                      <FiX />
                    </button>
                  </div>
                )}
              </article>
            );
          }

          return (
            <article
              className={card.label === 'Faturamento Mensal' ? `${styles.metricCard} ${styles.monthlyCard}` : styles.metricCard}
              key={card.label}
              onClick={card.label === 'Faturamento Mensal' ? handleOpenMonthly : undefined}
              style={card.label === 'Faturamento Mensal' ? { cursor: 'pointer' } : undefined}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.chartBlock}>
          <div className={styles.chartHeader}>
            <h2>Evolução do faturamento</h2>
            <button type="button" className={styles.downloadButton} onClick={handleExportProducts}>
              <FiDownload /> Exportar CSV
            </button>
          </div>
          <div className={styles.chartCanvas}>
            {loadingRevenue ? (
              <div className={styles.skeletonChart}>Carregando gráfico...</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueData?.faturamento_diarriere || []} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5366aa" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#5366aa" stopOpacity={0.12} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="total" stroke="#5366aa" fill="url(#revenueGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={styles.chartBlock} ref={monthlyRef} data-testid="monthly-section">
          <div className={styles.chartHeader}>
            <h2>Faturamento Mensal e Indicadores</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Taxa de conversão</div>
                <div data-testid="conversion-rate" style={{ fontWeight: 800, fontSize: 18 }}>{getConversionRate(summaryData)}</div>
              </div>
              <button type="button" className={styles.downloadButton} onClick={handleExportProducts}>
                <FiDownload /> Exportar CSV
              </button>
            </div>
          </div>

          <div className={styles.chartCanvas}>
            {loadingRevenue ? (
              <div className={styles.skeletonChart}>Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueData?.faturamento_diarriere || []} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
                  <defs>
                    <linearGradient id="revenueGradientMonthly" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#08936f" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#08936f" stopOpacity={0.12} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="total" stroke="#08936f" fill="url(#revenueGradientMonthly)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={styles.chartBlock}>
          <h2>Produtos mais vendidos</h2>
          <div className={styles.chartCanvasSmall}>
            {loadingProducts ? (
              <div className={styles.skeletonChart}>Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={productsData || []} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="nome" tick={{ fill: '#6b7280', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Receita']} />
                  <Bar dataKey="receita" fill="#08936f" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Unidades vendidas</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {(productsData || []).map((p) => (
                    <tr key={p.id || p.nome}>
                      <td>{p.nome}</td>
                      <td>{p.unidades_vendidas ?? p.quantidade ?? 0}</td>
                      <td>{formatCurrency(p.receita ?? p.faturamento ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className={styles.chartBlock}>
          <h2>Categorias mais lucrativas</h2>
          <div className={styles.chartCanvasSmall}>
            {loadingCategories ? (
              <div className={styles.skeletonChart}>Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={categoriesData || []} dataKey="faturamento" nameKey="categoria" innerRadius={62} outerRadius={104} paddingAngle={3} stroke="transparent">
                    {(categoriesData || []).map((entry, index) => (
                      <Cell key={`cell-${entry.categoria}`} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={58} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <h2>Vendas por período e status</h2>
            <span>{summaryData?.periodo}</span>
          </div>
          <div className={styles.statusList}>
            <div>
              <strong>{summaryData?.pedidos?.pendentes ?? 0}</strong>
              <small>Pendentes</small>
            </div>
            <div>
              <strong>{summaryData?.pedidos?.pagos ?? 0}</strong>
              <small>Pagos</small>
            </div>
            <div>
              <strong>{summaryData?.pedidos?.cancelados ?? 0}</strong>
              <small>Cancelados</small>
            </div>
            <div>
              <strong>{formatPercent(summaryData?.crescimento_percentual)}</strong>
              <small>Crescimento</small>
            </div>
          </div>

          <div className={styles.paymentChart}>
            {loadingSales ? (
              <div className={styles.skeletonChart}>Carregando...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesData?.formas_pagamento || []} margin={{ top: 4, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="metodo_pagamento" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Faturamento']} />
                  <Line type="monotone" dataKey="faturamento" stroke="#5366aa" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Meio de pagamento</th>
                    <th>Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {(salesData?.formas_pagamento || []).map((f) => (
                    <tr key={f.metodo_pagamento || f.id}>
                      <td>{f.metodo_pagamento}</td>
                      <td>{formatCurrency(f.faturamento ?? f.total ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>
      <section className={styles.alertsGrid}>
        {(summaryData?.alertas || []).map((alert, index) => (
          <article key={index} className={styles.alertCard}>
            <strong>{alert.type === 'danger' ? 'Alerta' : 'Aviso'}</strong>
            <p>{alert.message}</p>
          </article>
        ))}
      </section>

      <section className={styles.footerActions}>
        <button type="button" className={styles.printButton} onClick={() => window.print()}>
          <FiDownload /> Imprimir relatório
        </button>
        <button type="button" className={styles.logoutButton} onClick={() => { clearAuthSession(); navigate('/login'); }}>
          Sair do admin
        </button>
      </section>
    </main>
  );
}

export default AdminFinanceDashboard;
