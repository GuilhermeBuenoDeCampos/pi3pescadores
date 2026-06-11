import { useEffect, useState, useMemo } from 'react';
import { FiBarChart2, FiClock, FiDollarSign, FiGrid, FiLogOut, FiArrowLeft, FiRefreshCw, FiUser, FiChevronLeft, FiShoppingCart } from 'react-icons/fi';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import { clearAuthSession, getAuthUser } from '../services/api';
import { obterPaginasPorUsuario, obterHeatmapPorUsuarioPagina } from '../services/analytics';
import styles from './ComportamentoDetalhado.module.css';

function ComportamentoUsuario() {
  const navigate = useNavigate();
  const { usuarioId } = useParams();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageHeatmap, setPageHeatmap] = useState(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [periodo, setPeriodo] = useState(90);
  const [error, setError] = useState('');

  const selectedPage = searchParams.get('pagina') || '';

  useEffect(() => {
    let mounted = true;
    async function loadUserPages() {
      setLoadingPages(true);
      setError('');

      try {
        const data = await obterPaginasPorUsuario(usuarioId, periodo);
        if (!mounted) return;
        setStats(data.usuario);
        setPages(data.paginas || []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Erro ao carregar páginas do usuário.');
        setPages([]);
      } finally {
        if (mounted) setLoadingPages(false);
      }
    }

    loadUserPages();
    return () => {
      mounted = false;
    };
  }, [usuarioId, periodo]);

  useEffect(() => {
    let mounted = true;
    async function loadHeatmap() {
      if (!selectedPage) {
        setPageHeatmap(null);
        return;
      }

      setLoadingHeatmap(true);
      setError('');

      try {
        const data = await obterHeatmapPorUsuarioPagina(usuarioId, selectedPage, periodo);
        if (!mounted) return;
        setPageHeatmap(data);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Erro ao carregar heatmap do usuário.');
        setPageHeatmap(null);
      } finally {
        if (mounted) setLoadingHeatmap(false);
      }
    }

    loadHeatmap();
    return () => {
      mounted = false;
    };
  }, [usuarioId, selectedPage, periodo]);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const maxPoint = useMemo(() => {
    if (!pageHeatmap?.pontos || pageHeatmap.pontos.length === 0) return 1;
    return Math.max(...pageHeatmap.pontos.map((item) => item.total));
  }, [pageHeatmap]);

  const userLabel = stats?.nome || stats?.email || 'Usuário';

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
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin/comportamento')}><FiClock /> Comportamento</button>
          <span className={styles.navLabel}>Insights</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin/faturamento-completo')}><FiDollarSign /> Faturamento</button>
          <button className={styles.navItem} type="button" onClick={() => navigate('/admin/carrinho-abandono')}><FiShoppingCart /> Abandono</button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <FiUser />
            <div>
              <strong>{getAuthUser()?.nome || getAuthUser()?.email || 'Administrador'}</strong>
              <span>{getAuthUser()?.tipo_usuario || 'admin'}</span>
            </div>
          </div>
          <button className={styles.logoutButton} type="button" onClick={handleLogout}>
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.header}>
          <button className={styles.backButton} type="button" onClick={() => navigate('/admin/comportamento')}>
            <FiArrowLeft /> Voltar
          </button>
          <div>
            <h1>Histórico do usuário</h1>
            <p>Veja todas as páginas acessadas por {userLabel} e os pontos de maior interação.</p>
          </div>
          <select value={periodo} onChange={(event) => setPeriodo(Number(event.target.value))} className={styles.periodSelect}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </header>

        {error && <div className={styles.emptyText}>{error}</div>}

        <section className={styles.statsGrid} aria-label="Perfil do usuário">
          <article className={styles.statCard}>
            <span>Nome</span>
            <strong>{loadingPages ? '--' : stats?.nome || '—'}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Email</span>
            <strong>{loadingPages ? '--' : stats?.email || '—'}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Tipo</span>
            <strong>{loadingPages ? '--' : stats?.tipo_usuario || '—'}</strong>
          </article>
          <article className={styles.statCard}>
            <span>Páginas acessadas</span>
            <strong>{loadingPages ? '--' : pages.length}</strong>
          </article>
          <article className={`${styles.statCard} ${styles.statCardHighlight}`}>
            <span>Modo</span>
            <strong>{selectedPage ? 'Heatmap de página' : 'Páginas do usuário'}</strong>
          </article>
        </section>

        <section className={styles.tablePanel}>
          <div className={styles.panelHeader}>
            <h2>{selectedPage ? `Heatmap: ${selectedPage}` : 'Páginas acessadas'}</h2>
            <span>{loadingPages ? 'Carregando...' : `${pages.length} páginas`}</span>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Página</th>
                  <th>Visualizações</th>
                  <th>Tempo total</th>
                  <th>Tempo médio</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pages.length === 0 && !loadingPages ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyText}>
                      Nenhuma página registrada para este usuário no período selecionado.
                    </td>
                  </tr>
                ) : (
                  pages.map((page) => (
                    <tr key={page.pagina} className={styles.clickableRow}>
                      <td>{page.pagina}</td>
                      <td>{page.total_visualizacoes}</td>
                      <td>{page.tempo_total_segundos}s</td>
                      <td>{page.tempo_medio_segundos}s</td>
                      <td>
                        <button
                          className={styles.pageActionButton}
                          type="button"
                          onClick={() => navigate(`/admin/comportamento/usuario/${usuarioId}?pagina=${encodeURIComponent(page.pagina)}`)}
                        >
                          Ver heatmap
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedPage && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Heatmap de cliques e permanência</h2>
                <p>Regiões onde o usuário passou mais tempo e clicou com mais frequência.</p>
              </div>
              {loadingHeatmap && <FiRefreshCw className={styles.loadingIcon} />}
            </div>

            {pageHeatmap ? (
              <>
                <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                  <article className={styles.statCard}>
                    <span>Total de eventos</span>
                    <strong>{pageHeatmap.resumo.total_eventos}</strong>
                  </article>
                  <article className={styles.statCard}>
                    <span>Visualizações</span>
                    <strong>{pageHeatmap.resumo.visualizacoes}</strong>
                  </article>
                  <article className={styles.statCard}>
                    <span>Cliques</span>
                    <strong>{pageHeatmap.resumo.cliques}</strong>
                  </article>
                  <article className={styles.statCard}>
                    <span>Tempo total</span>
                    <strong>{pageHeatmap.resumo.tempo_total_segundos}s</strong>
                  </article>
                  <article className={styles.statCard}>
                    <span>Tempo médio</span>
                    <strong>{pageHeatmap.resumo.tempo_medio_segundos}s</strong>
                  </article>
                </div>

                <div className={styles.heatmapCanvas}>
                  {pageHeatmap.pontos.length === 0 ? (
                    <p className={styles.emptyText}>Não há pontos de clique/hover registrados para esta página.</p>
                  ) : (
                    <>
                      <div className={styles.heatmapLegendContainer}>
                        <div className={styles.heatmapLegendRow}>
                          <h4>Legenda de Intensidade</h4>
                          <div className={styles.intensityLegend}>
                            <div className={styles.intensityItem}>
                              <span className={styles.intensityBox} style={{ background: '#ef4444' }} />
                              <span>Muito alta (80-100%)</span>
                            </div>
                            <div className={styles.intensityItem}>
                              <span className={styles.intensityBox} style={{ background: '#f97316' }} />
                              <span>Alta (60-79%)</span>
                            </div>
                            <div className={styles.intensityItem}>
                              <span className={styles.intensityBox} style={{ background: '#eab308' }} />
                              <span>Média (40-59%)</span>
                            </div>
                            <div className={styles.intensityItem}>
                              <span className={styles.intensityBox} style={{ background: '#84cc16' }} />
                              <span>Baixa (20-39%)</span>
                            </div>
                            <div className={styles.intensityItem}>
                              <span className={styles.intensityBox} style={{ background: '#22c55e' }} />
                              <span>Muito baixa (0-19%)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles.heatmapTabsContainer}>
                        <div className={styles.heatmapTab}>
                          <h4 className={styles.heatmapTabTitle}>🖱️ Cliques</h4>
                          <div className={styles.heatmapFrame}>
                            {pageHeatmap.pontos.filter(p => p.tipo === 'click').length === 0 ? (
                              <p className={styles.emptyText}>Sem cliques registrados.</p>
                            ) : (
                              pageHeatmap.pontos
                                .filter(p => p.tipo === 'click')
                                .slice(0, 100)
                                .map((point, index) => {
                                  const left = point.largura_tela ? (point.coordenada_x / point.largura_tela) * 100 : 50;
                                  const top = point.altura_tela ? (point.coordenada_y / point.altura_tela) * 100 : 50;
                                  const maxClickPoints = Math.max(...pageHeatmap.pontos.filter(p => p.tipo === 'click').map(p => p.total), 1);
                                  const intensity = (point.total / maxClickPoints) * 100;
                                  let color;
                                  if (intensity >= 80) color = '#ef4444';
                                  else if (intensity >= 60) color = '#f97316';
                                  else if (intensity >= 40) color = '#eab308';
                                  else if (intensity >= 20) color = '#84cc16';
                                  else color = '#22c55e';

                                  const size = Math.max(12, Math.min(48, Math.round((intensity / 100) * 40)));
                                  return (
                                    <span
                                      key={`click-${index}-${point.coordenada_x}-${point.coordenada_y}`}
                                      className={styles.heatmapPoint}
                                      style={{
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        width: `${size}px`,
                                        height: `${size}px`,
                                        background: color,
                                        opacity: 0.8,
                                      }}
                                      title={`${point.total} clique${point.total !== 1 ? 's' : ''}`}
                                    />
                                  );
                                })
                            )}
                          </div>
                        </div>

                        <div className={styles.heatmapTab}>
                          <h4 className={styles.heatmapTabTitle}>👆 Hover</h4>
                          <div className={styles.heatmapFrame}>
                            {pageHeatmap.pontos.filter(p => p.tipo === 'hover').length === 0 ? (
                              <p className={styles.emptyText}>Sem hovers registrados.</p>
                            ) : (
                              pageHeatmap.pontos
                                .filter(p => p.tipo === 'hover')
                                .slice(0, 100)
                                .map((point, index) => {
                                  const left = point.largura_tela ? (point.coordenada_x / point.largura_tela) * 100 : 50;
                                  const top = point.altura_tela ? (point.coordenada_y / point.altura_tela) * 100 : 50;
                                  const maxHoverPoints = Math.max(...pageHeatmap.pontos.filter(p => p.tipo === 'hover').map(p => p.total), 1);
                                  const intensity = (point.total / maxHoverPoints) * 100;
                                  let color;
                                  if (intensity >= 80) color = '#3b82f6';
                                  else if (intensity >= 60) color = '#06b6d4';
                                  else if (intensity >= 40) color = '#10b981';
                                  else if (intensity >= 20) color = '#8b5cf6';
                                  else color = '#ec4899';

                                  const size = Math.max(12, Math.min(48, Math.round((intensity / 100) * 40)));
                                  return (
                                    <span
                                      key={`hover-${index}-${point.coordenada_x}-${point.coordenada_y}`}
                                      className={styles.heatmapPoint}
                                      style={{
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        width: `${size}px`,
                                        height: `${size}px`,
                                        background: color,
                                        opacity: 0.7,
                                      }}
                                      title={`${point.total} hover${point.total !== 1 ? 's' : ''}`}
                                    />
                                  );
                                })
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className={styles.panelHeader} style={{ marginTop: '20px' }}>
                  <h3>Elementos mais clicados / hover</h3>
                </div>
                <div className={styles.heatmapStats}>
                  {pageHeatmap.elementos.length === 0 ? (
                    <p className={styles.emptyText}>Não há elementos identificados para esta página.</p>
                  ) : (
                    <div className={styles.elementsGrid}>
                      {pageHeatmap.elementos.map((item, index) => {
                        const isClick = item.tipo === 'click';
                        return (
                          <div key={`${item.tipo}-${item.elemento || index}`} className={styles.elementCard}>
                            <div className={styles.elementBadge} style={{ background: isClick ? '#fecaca' : '#bfdbfe' }}>
                              {isClick ? '🖱️ Clique' : '👆 Hover'}
                            </div>
                            <strong>{item.elemento || 'elemento desconhecido'}</strong>
                            <span>{item.total} vez{item.total !== 1 ? 'es' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              !loadingHeatmap && <p className={styles.emptyText}>Selecione uma página para ver o mapa de calor.</p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default ComportamentoUsuario;
