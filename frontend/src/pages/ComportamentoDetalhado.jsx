import { useEffect, useMemo, useRef, useState } from 'react';
import { FiBarChart2, FiClock, FiDollarSign, FiGrid, FiLogOut, FiPackage, FiRefreshCw, FiShoppingCart, FiUser, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import { clearAuthSession, getAuthUser } from '../services/api';
import { obterEstatisticasComportamento, obterHeatmap, obterTempoPorPagina, obterUsuariosPorMes } from '../services/analytics';
import styles from './ComportamentoDetalhado.module.css';

function HeatmapCanvas({ points }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(320, Math.round(rect.width));
      const height = Math.max(280, Math.round(width * 0.58));
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#10182c');
      background.addColorStop(0.58, '#25355f');
      background.addColorStop(1, '#405394');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      context.lineWidth = 1;
      for (let x = 0; x <= width; x += width / 12) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += height / 8) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const maxTotal = Math.max(1, ...points.map((point) => Number(point.total || 1)));
      context.globalCompositeOperation = 'screen';

      points.forEach((point) => {
        const sourceWidth = Number(point.largura_tela || 0);
        const sourceHeight = Number(point.altura_tela || 0);
        if (!sourceWidth || !sourceHeight) return;

        const x = Math.min(width, Math.max(0, (Number(point.coordenada_x) / sourceWidth) * width));
        const y = Math.min(height, Math.max(0, (Number(point.coordenada_y) / sourceHeight) * height));
        const intensity = Math.max(0.18, Number(point.total || 1) / maxTotal);
        const radius = 22 + intensity * 38;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

        gradient.addColorStop(0, `rgba(239, 68, 68, ${0.82 * intensity})`);
        gradient.addColorStop(0.28, `rgba(249, 115, 22, ${0.68 * intensity})`);
        gradient.addColorStop(0.58, `rgba(234, 179, 8, ${0.42 * intensity})`);
        gradient.addColorStop(1, 'rgba(234, 179, 8, 0)');

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      });

      context.globalCompositeOperation = 'source-over';
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);

    return () => observer.disconnect();
  }, [points]);

  return (
    <div className={styles.heatmapCanvasWrap} ref={containerRef}>
      <canvas ref={canvasRef} aria-label="Mapa de calor das interacoes no site" />
      {points.length === 0 && (
        <div className={styles.heatmapEmpty}>Nenhuma interacao registrada para este filtro.</div>
      )}
    </div>
  );
}

function ComportamentoDetalhado() {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [stats, setStats] = useState(null);
  const [pages, setPages] = useState([]);
  const [usuariosPorMes, setUsuariosPorMes] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [interactionType, setInteractionType] = useState('todos');
  const [periodo, setPeriodo] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [statsData, pagesData, usuariosData, heatmapData] = await Promise.all([
          obterEstatisticasComportamento(periodo).catch(() => null),
          obterTempoPorPagina(periodo).catch(() => []),
          obterUsuariosPorMes(90).catch(() => []),
          obterHeatmap(null, periodo).catch(() => []),
        ]);

        if (mounted) {
          setStats(statsData);
          setPages(pagesData?.paginas || pagesData || []);
          setUsuariosPorMes(usuariosData || []);
          setHeatmap(Array.isArray(heatmapData) ? heatmapData : []);
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
  const heatmapPages = useMemo(
    () => Array.from(new Set(heatmap.map((point) => point.pagina).filter(Boolean))).sort(),
    [heatmap]
  );
  const activeHeatmapPage = selectedPage && heatmapPages.includes(selectedPage)
    ? selectedPage
    : heatmapPages[0] || '';
  const filteredHeatmap = useMemo(
    () => heatmap.filter((point) => (
      point.pagina === activeHeatmapPage &&
      (interactionType === 'todos' || point.tipo === interactionType)
    )),
    [activeHeatmapPage, heatmap, interactionType]
  );
  const hotspots = useMemo(() => {
    const grouped = new Map();

    filteredHeatmap.forEach((point) => {
      const key = point.elemento || 'Elemento nao identificado';
      grouped.set(key, (grouped.get(key) || 0) + Number(point.total || 1));
    });

    return Array.from(grouped.entries())
      .map(([elemento, total]) => ({ elemento, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredHeatmap]);

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
              {loading && <FiRefreshCw className={styles.loadingIcon} />}
            </div>
            <div className={styles.heatmapControls}>
              <label>
                Página
                <select
                  value={activeHeatmapPage}
                  onChange={(event) => setSelectedPage(event.target.value)}
                  disabled={heatmapPages.length === 0}
                >
                  {heatmapPages.length === 0 && <option value="">Sem dados</option>}
                  {heatmapPages.map((page) => <option key={page} value={page}>{page}</option>)}
                </select>
              </label>
              <label>
                Interação
                <select value={interactionType} onChange={(event) => setInteractionType(event.target.value)}>
                  <option value="todos">Cliques e hovers</option>
                  <option value="click">Somente cliques</option>
                  <option value="hover">Somente hovers</option>
                </select>
              </label>
            </div>
            <HeatmapCanvas points={filteredHeatmap} />
            <div className={styles.heatmapLegend}>
              <span><i className={styles.heatmapDot} style={{ background: '#ef4444' }} /> Alta</span>
              <span><i className={styles.heatmapDot} style={{ background: '#f97316' }} /> Média</span>
              <span><i className={styles.heatmapDot} style={{ background: '#eab308' }} /> Baixa</span>
              <strong>{filteredHeatmap.reduce((total, point) => total + Number(point.total || 1), 0)} interações</strong>
            </div>
            {hotspots.length > 0 && (
              <div className={styles.hotspotList}>
                <span>Elementos mais acionados</span>
                {hotspots.map((item, index) => (
                  <div key={item.elemento}>
                    <b>{index + 1}</b>
                    <code>{item.elemento}</code>
                    <strong>{item.total}</strong>
                  </div>
                ))}
              </div>
            )}
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
                      <tr key={u.usuario_id}>
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
