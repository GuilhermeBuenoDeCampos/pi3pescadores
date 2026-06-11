import { useEffect, useState } from 'react';
import { FiBarChart2, FiClock, FiDollarSign, FiGrid, FiLogOut, FiPackage, FiRefreshCw, FiShoppingCart, FiUser, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import { clearAuthSession, getAuthUser } from '../services/api';
import { obterTempoPorPagina, obterEstatisticasComportamento, obterUsuariosPorMes } from '../services/analytics';
import styles from './ComportamentoDetalhado.module.css';

function ComportamentoDetalhado() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [stats, setStats] = useState(null);
  const [pages, setPages] = useState([]);
  const [usuariosPorMes, setUsuariosPorMes] = useState([]);
  const [periodo, setPeriodo] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [statsData, pagesData, usuariosData] = await Promise.all([
          obterEstatisticasComportamento(periodo).catch(() => null),
          obterTempoPorPagina(periodo).catch(() => []),
          obterUsuariosPorMes(90).catch(() => []),
        ]);

        if (mounted) {
          setStats(statsData);
          setPages(pagesData?.paginas || pagesData || []);
          setUsuariosPorMes(usuariosData || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadData();
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

  const maxTime = pages.length > 0 ? Math.max(...pages.map(p => p.tempo_medio_segundos)) : 1;

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <main className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Três Pescadores Store" className={styles.logo} />
          <div>
            <strong>Três Pescadores</strong>
            <span>Painel administrativo</span>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Navegação administrativa">
          <span className={styles.navLabel}>Operação</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin')}><FiGrid /> Dashboard</button>
          <button className={styles.navItem} type="button" onClick={() => navigate('/estoque')}><FiPackage /> Estoque</button>
          <button className={styles.navItem} type="button" onClick={() => navigate('/vendas')}><FiBarChart2 /> Vendas</button>
          <span className={styles.navLabel}>Indicadores</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin/faturamento-completo')}><FiDollarSign /> Faturamento</button>
          <button className={`${styles.navItem} ${styles.navItemActive}`} type="button"><FiClock /> Comportamento</button>
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
            <h1>Comportamento do Usuário</h1>
            <p>Mapeamento de navegação para identificar dificuldades e melhorar a experiência.</p>
          </div>
          <select value={periodo} onChange={(event) => setPeriodo(Number(event.target.value))} className={styles.periodSelect}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </header>

        <section className={styles.statsGrid} aria-label="Estatísticas de comportamento">
          <article className={styles.statCard}>
            <span>Sessões únicas</span>
            <strong>{loading ? '--' : stats?.sessoes_unicas || 0}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Páginas visitadas</span>
            <strong>{loading ? '--' : stats?.total_page_views || 0}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Cliques</span>
            <strong>{loading ? '--' : stats?.total_clicks || 0}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Hovers</span>
            <strong>{loading ? '--' : stats?.total_hovers || 0}</strong>
          </article>
          <article className={`${styles.statCard} ${styles.statCardHighlight}`}>
            <span>Tempo médio/página</span>
            <strong>
              {loading
                ? '--'
                : stats?.tempo_medio_por_pagina_segundos
                  ? `${stats.tempo_medio_por_pagina_segundos}s`
                  : '0s'}
            </strong>
          </article>
        </section>

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Tempo médio por página</h2>
              {loading && <FiRefreshCw className={styles.loadingIcon} />}
            </div>
            <div className={styles.pageList}>
              {pages.length === 0 && (
                <p className={styles.emptyText}>
                  Nenhum dado disponível ainda. Os dados serão coletados à medida que os usuários navegarem no site.
                </p>
              )}
              {pages.map((p, i) => (
                <div key={i} className={styles.pageRow}>
                  <span className={styles.pageName}>{p.pagina}</span>
                  <span className={styles.pageBarTrack}>
                    <span
                      className={styles.pageBarFill}
                      style={{ width: `${(p.tempo_medio_segundos / maxTime) * 100}%` }}
                    />
                  </span>
                  <span className={styles.pageTime}>{p.tempo_medio_segundos}s</span>
                  <span className={styles.pageCount}>{p.total_visualizacoes} visitas</span>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Heatmap de interações</h2>
            </div>
            <p className={styles.heatmapHint}>
              Os cliques e hovers são registrados com coordenadas para identificar as regiões de maior interesse em cada página.
              Acesse a página específica para visualizar o heatmap detalhado.
            </p>
            <div className={styles.heatmapLegend}>
              <span className={styles.heatmapDot} style={{ background: '#ef4444' }} /> Alta intensidade
              <span className={styles.heatmapDot} style={{ background: '#f97316' }} /> Média
              <span className={styles.heatmapDot} style={{ background: '#eab308' }} /> Baixa
            </div>
          </article>
        </section>

        <section className={styles.usersSection}>
          <div className={styles.panelHeader}>
            <h2>Usuários que acessaram o site</h2>
            {!loading && <span className={styles.monthCount}>{usuariosPorMes.reduce((acc, m) => acc + m.usuarios.length, 0)} total</span>}
          </div>
          {usuariosPorMes.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? 'Carregando...' : 'Nenhum usuário identificado no período. Os dados são coletados quando usuários logados navegam no site.'}
            </p>
          )}
          {usuariosPorMes.map((mes) => (
            <details key={mes.mes} className={styles.monthGroup} open>
              <summary className={styles.monthSummary}>
                <span className={styles.monthLabel}>
                  {new Date(mes.mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <span className={styles.monthCount}>{mes.usuarios.length} usuários</span>
              </summary>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Email</th>
                      <th>Último acesso</th>
                      <th>Total de eventos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mes.usuarios.map((u) => (
                      <tr
                        key={u.usuario_id || u.email}
                        className={u.usuario_id ? styles.clickableRow : ''}
                        onClick={() => u.usuario_id && navigate(`/admin/comportamento/usuario/${u.usuario_id}`)}
                        role={u.usuario_id ? 'button' : undefined}
                        tabIndex={u.usuario_id ? 0 : undefined}
                      >
                        <td>{u.nome || '—'}</td>
                        <td>{u.email}</td>
                        <td>{new Date(u.ultimo_acesso).toLocaleString('pt-BR')}</td>
                        <td>{u.total_eventos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </section>

        {pages.length > 0 && (
          <section className={styles.tablePanel}>
            <div className={styles.panelHeader}>
              <h2>Todas as páginas</h2>
              <span>{pages.length} páginas</span>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Página</th>
                    <th>Tempo médio</th>
                    <th>Visualizações</th>
                    <th>Engajamento</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p, i) => (
                    <tr key={i}>
                      <td>{p.pagina}</td>
                      <td>{p.tempo_medio_segundos}s</td>
                      <td>{p.total_visualizacoes}</td>
                      <td>
                        <span className={styles.engagementBar}>
                          <span style={{ width: `${(p.tempo_medio_segundos / maxTime) * 100}%` }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default ComportamentoDetalhado;
