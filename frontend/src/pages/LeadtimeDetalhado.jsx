import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  FiArrowLeft,
  FiBarChart2,
  FiClock,
  FiGrid,
  FiLogOut,
  FiPackage,
  FiRefreshCw,
  FiTruck,
  FiUser,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import { clearAuthSession, getAuthUser } from '../services/api';
import { obterLeadtimePorPeriodo, obterMediaLeadtime } from '../services/leadtime';
import styles from './LeadtimeDetalhado.module.css';

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Tooltip);

const etapaLabels = {
  visitante_carrinho: 'Entrada -> carrinho',
  carrinho_confirmado: 'Carrinho -> confirmado',
  confirmado_preparando: 'Confirmado -> preparando',
  preparando_enviado: 'Preparando -> enviado',
  enviado_concluido: 'Enviado -> concluido',
};

const etapaCampos = [
  ['visitante_carrinho', 'visitante', 'carrinho'],
  ['carrinho_confirmado', 'carrinho', 'confirmado'],
  ['confirmado_preparando', 'confirmado', 'preparando'],
  ['preparando_enviado', 'preparando', 'enviado'],
  ['enviado_concluido', 'enviado', 'concluido'],
];

function formatDurationFromHours(value) {
  const totalMinutes = Math.max(0, Math.round(Number(value || 0) * 60));

  if (totalMinutes < 60) {
    return `${totalMinutes}min`;
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function diffHours(start, end) {
  if (!start || !end) return null;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function formatDate(value) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getPedidoInfo(item) {
  return item?.pedido || {};
}

function LeadtimeDetalhado() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [media, setMedia] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [periodo, setPeriodo] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [mediaData, periodoData] = await Promise.all([
          obterMediaLeadtime(),
          obterLeadtimePorPeriodo(periodo),
        ]);

        if (mounted) {
          setMedia(mediaData);
          setRegistros(Array.isArray(periodoData) ? periodoData : []);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      mounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [periodo]);

  const etapas = etapaCampos.map(([key]) => {
    const detalhe = media?.detalhes_por_etapa?.[key];
    return {
      key,
      label: etapaLabels[key],
      horas: Number(detalhe?.horas || media?.por_etapa?.[key] || 0),
      total: Number(detalhe?.total || 0),
      value: detalhe?.label || formatDurationFromHours(media?.por_etapa?.[key]),
    };
  });

  const chartData = useMemo(() => ({
    labels: etapas.map((etapa) => etapa.label),
    datasets: [
      {
        label: 'Media em horas',
        data: etapas.map((etapa) => etapa.horas),
        backgroundColor: ['#10182c', '#5366aa', '#08936f', '#f3d870', '#536073'],
        borderRadius: 8,
      },
    ],
  }), [media]);

  const tableRows = registros.map((item) => {
    const pedido = getPedidoInfo(item);
    const usuario = pedido?.usuario || {};
    const etapaValues = Object.fromEntries(
      etapaCampos.map(([key, start, end]) => [key, diffHours(item[start], item[end])])
    );

    return {
      id: item.id,
      pedido: pedido.numero_pedido || `Pedido #${item.pedido_id}`,
      cliente: usuario.nome || usuario.email || 'Cliente nao identificado',
      status: pedido.status || 'sem status',
      criado: item.created_at,
      etapaValues,
    };
  });

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <main className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Tres Pescadores Store" className={styles.logo} />
          <div>
            <strong>Tres Pescadores</strong>
            <span>Painel administrativo</span>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Navegacao administrativa">
          <span className={styles.navLabel}>Operacao</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin')}><FiGrid /> Dashboard</button>
          <button className={styles.navItem} type="button" onClick={() => navigate('/estoque')}><FiPackage /> Estoque</button>
          <button className={styles.navItem} type="button" onClick={() => navigate('/vendas')}><FiTruck /> Vendas</button>
          <span className={styles.navLabel}>Indicadores</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin/faturamento-completo')}><FiBarChart2 /> Faturamento</button>
          <button className={`${styles.navItem} ${styles.navItemActive}`} type="button"><FiClock /> Lead time</button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <FiUser />
            <div>
              <strong>{user?.nome || user?.email || 'Administrador'}</strong>
              <span>{user?.role || 'admin'}</span>
            </div>
          </div>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.header}>
          <button className={styles.backButton} type="button" onClick={() => navigate('/admin')}>
            <FiArrowLeft /> Voltar
          </button>
          <div>
            <h1>Lead time detalhado</h1>
            <p>Tempo medio entre entrada, carrinho, confirmacao, preparo, envio e conclusao.</p>
          </div>
          <select value={periodo} onChange={(event) => setPeriodo(Number(event.target.value))} className={styles.periodSelect}>
            <option value={1}>Ultimo mes</option>
            <option value={3}>Ultimos 3 meses</option>
            <option value={6}>Ultimos 6 meses</option>
            <option value={12}>Ultimos 12 meses</option>
          </select>
        </header>

        <section className={styles.summaryGrid} aria-label="Resumo de lead time">
          <article className={styles.heroCard}>
            <span>Tempo medio total</span>
            <strong>{loading ? '--' : media?.media_geral_label || formatDurationFromHours(media?.media_geral_horas)}</strong>
            <small>{loading ? 'Carregando...' : `${media?.total_pedidos || 0} pedidos analisados`}</small>
          </article>
          {etapas.slice(0, 4).map((etapa) => (
            <article className={styles.metricCard} key={etapa.key}>
              <span>{etapa.label}</span>
              <strong>{loading ? '--' : etapa.value}</strong>
              <small>{etapa.total} registros usados</small>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Media por etapa</h2>
              {loading && <FiRefreshCw className={styles.loadingIcon} />}
            </div>
            <div className={styles.chartBox}>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (value) => `${value}h` },
                      grid: { color: 'rgba(16, 24, 44, 0.08)' },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Amostra por etapa</h2>
            </div>
            <div className={styles.stageList}>
              {etapas.map((etapa) => (
                <div key={etapa.key}>
                  <span>{etapa.label}</span>
                  <strong>{etapa.total}</strong>
                  <small>{etapa.value}</small>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <h2>Pedidos no periodo</h2>
            <span>{tableRows.length} registros</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>{'Entrada -> carrinho'}</th>
                  <th>{'Carrinho -> confirmado'}</th>
                  <th>{'Confirmado -> preparando'}</th>
                  <th>{'Preparando -> enviado'}</th>
                  <th>{'Enviado -> concluido'}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan="9" className={styles.emptyCell}>
                      {loading ? 'Carregando registros...' : 'Nenhum lead time encontrado no periodo.'}
                    </td>
                  </tr>
                )}
                {tableRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.pedido}</td>
                    <td>{row.cliente}</td>
                    <td><span className={styles.statusBadge}>{row.status}</span></td>
                    <td>{formatDate(row.criado)}</td>
                    {etapaCampos.map(([key]) => (
                      <td key={key}>
                        {row.etapaValues[key] === null ? '--' : formatDurationFromHours(row.etapaValues[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LeadtimeDetalhado;
