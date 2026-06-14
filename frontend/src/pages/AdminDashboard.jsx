import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { FiHelpCircle, FiLink, FiRefreshCw, FiShoppingCart, FiStar, FiSettings, FiX, FiXCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import AdminSidebar from '../components/AdminSidebar';
import nsaVerde from '../assets/logo/nsa-verde.png';
import nsaAmarelo from '../assets/logo/nsa-amarelo.png';
import nsaVermelho from '../assets/logo/nsa-vermelho.png';
import { apiFetch, fetchCrossSell, fetchKpiSatisfacao, fetchMediaAcuracidade, fetchPalavrasMaisPesquisadas, fetchTaxaCancelamento, fetchTaxaRecompraAnual, getAuthToken, API_URL, BACKEND_URL } from '../services/api';
import faturamentoBaixoImg from '../assets/admin/faturamentobaixo.jpg';
import faturamentoMedioImg from '../assets/admin/faturamentomedio.jpg';
import faturamentoAltoImg from '../assets/admin/faturamentoalto.png';
import recompraVermelhoImg from '../assets/admin/recompravermelho.png';
import recompraAmareloImg from '../assets/admin/recompraamarelo.png';
import recompraVerdeImg from '../assets/admin/recompraverde.png';
import ticketBaixoImg from '../assets/admin/ticketbaixo.png';
import ticketMedioImg from '../assets/admin/ticketmedio.png';
import ticketAltoImg from '../assets/admin/ticketalto.png';
import palavrasPesquisadasImg from '../assets/admin/palavraspesquisadas.png';
import visitanteBaixoImg from '../assets/admin/visitantebaixo.png';
import visitanteMedioImg from '../assets/admin/visitantemedio.png';
import visitanteAltoImg from '../assets/admin/visitantealto.png';
import conversaoBaixaImg from '../assets/admin/SBruim.png';
import conversaoMediaImg from '../assets/admin/SBnormal.png';
import conversaoAltaImg from '../assets/admin/conversao-alta.png';
import saoPedroImg from '../assets/admin/saopedro.png';
import basilicaImg from '../assets/admin/basilica-aparecida.jpg';
import abandonoBomImg from '../assets/admin/abandono-bom.png';
import abandonoRegularImg from '../assets/admin/abandono-regular.png';
import abandonoRuimImg from '../assets/admin/abandono-ruim.png';
import crossSellBomImg from '../assets/admin/cross-sell-bom.png';
import crossSellRegularImg from '../assets/admin/cross-sell-regular.png';
import crossSellRuimImg from '../assets/admin/cross-sell-ruim.png';
import cancelamentoBomImg from '../assets/admin/cancelamento-bom.png';
import cancelamentoRegularImg from '../assets/admin/cancelamento-regular.png';
import cancelamentoRuimImg from '../assets/admin/cancelamento-ruim.png';
import satisfacaoBomImg from '../assets/admin/satisfacao-bom.png';
import satisfacaoRegularImg from '../assets/admin/satisfacao-regular.png';
import satisfacaoRuimImg from '../assets/admin/satisfacao-ruim.png';
import { obterTaxaConversao } from '../services/visitanteEvento';
import { obterKpiConfig } from '../services/kpiConfig';
import { obterMediaLeadtime } from '../services/leadtime';
import { fetchCarrinhoAbandonoDashboard } from '../services/carrinhoAbandonoService';
import KpiConfigModal from '../components/KpiConfigModal';
import { obterTempoPorPagina, obterPaginasEngajamento, obterEstatisticasComportamento } from '../services/analytics';
import styles from './AdminDashboard.module.css';

ChartJS.register(
  ArcElement,
  Legend,
  Tooltip
);

const chartColors = {
  navy: '#10182c',
  blue: '#5366aa',
  slate: '#536073',
  sky: '#98c7f2',
  gold: '#f3d870',
  teal: '#08936f',
  softTeal: '#c8ded6',
  grid: 'rgba(16, 24, 44, 0.08)',
};

const kpiCalculations = {
  faturamento: {
    title: 'Faturamento mensal',
    description: 'Soma o valor total dos pedidos com status confirmado, preparando, enviado ou concluído criados no mês atual.',
  },
  ticket: {
    title: 'Ticket médio mensal',
    description: 'Divide a receita total pela quantidade de vendas com status confirmado, preparando, enviado ou concluído criadas no mês exibido no card.',
  },
  recompra: {
    title: 'Taxa de recompra',
    description: 'Divide a quantidade de clientes com mais de uma compra pela quantidade total de clientes que compraram no ano atual e multiplica por 100.',
  },
  pesquisas: {
    title: 'Palavras mais pesquisadas',
    description: 'Agrupa as buscas registradas por palavra e ordena da maior para a menor quantidade de pesquisas.',
  },
  conversao: {
    title: 'Taxa de conversão',
    description: 'Divide a quantidade de pedidos confirmados pela quantidade de visitantes únicos da home no mês e multiplica por 100.',
  },
  visitantes: {
    title: 'Visitantes únicos',
    description: 'Conta uma vez cada usuário logado ou, para visitantes sem login, cada IP que acessou a home durante o mês.',
  },
  acuracidade: {
    title: 'Acuracidade média',
    description: 'Para cada auditoria, calcula 100 menos o percentual da diferença absoluta entre o estoque físico e o registrado. O card exibe a média dos produtos auditados.',
  },
  leadtime: {
    title: 'Lead time medio',
    description: 'Calcula a media entre os horarios registrados no funil: entrada no site, primeiro item no carrinho, pagamento confirmado, preparando, enviado e concluido.',
  },
  comportamento: {
    title: 'Comportamento do Usuário',
    description: 'Monitora o tempo medio de permanencia por pagina, total de cliques e hover, para identificar dificuldades na navegacao e pontos de maior engajamento.',
  },
  abandono: {
    title: 'Taxa de abandono de carrinho',
    description: 'Divide a quantidade de carrinhos abandonados pelo total de carrinhos dos ultimos 30 dias e multiplica por 100. Um carrinho ativo e marcado como abandonado depois de 24 horas sem atividade.',
  },
  crossSell: {
    title: 'Cross-sell',
    description: 'Analisa pedidos confirmados, em preparacao, enviados ou concluidos. Cada par de produtos diferentes conta uma vez por pedido, e as combinacoes sao ordenadas pela quantidade de compras em que apareceram juntas.',
  },
  cancelamento: {
    title: 'Taxa de cancelamento',
    description: 'Divide a quantidade de pedidos cancelados pelo total de pedidos criados no mes atual e multiplica por 100. Todos os status entram no total do periodo.',
  },
  satisfacao: {
    title: 'Media de satisfacao',
    description: 'Calcula a media geral das notas registradas nas avaliacoes dos clientes, considerando a escala de 1 a 5.',
  },
};

function CalculationHelpButton({ calculation, onOpen, withSettings = false }) {
  return (
    <button
      className={`${styles.calculationHelpButton} ${withSettings ? styles.calculationHelpButtonWithSettings : ''}`}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(calculation);
      }}
      title={`Como ${calculation.title.toLowerCase()} é calculado`}
      aria-label={`Mostrar como ${calculation.title.toLowerCase()} é calculado`}
    >
      <FiHelpCircle size={18} />
    </button>
  );
}

function KpiSettingsButton({ title, onOpen }) {
  return (
    <button
      className={styles.kpiSettingsButton}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      title={title}
      aria-label={title}
    >
      <FiSettings size={18} />
    </button>
  );
}

function CalculationHelpModal({ calculation, onClose }) {
  if (!calculation) return null;

  return (
    <div className={styles.calculationOverlay} onClick={onClose}>
      <div
        className={styles.calculationModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculation-help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className={styles.calculationCloseButton} type="button" onClick={onClose} aria-label="Fechar explicação">
          <FiX size={18} />
        </button>
        <FiHelpCircle className={styles.calculationModalIcon} size={24} />
        <h2 id="calculation-help-title">{calculation.title}</h2>
        <p>{calculation.description}</p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [accuracy, setAccuracy] = useState(null);
  const [loadingAccuracy, setLoadingAccuracy] = useState(true);
  const [accuracyError, setAccuracyError] = useState('');
  const [topSearches, setTopSearches] = useState([]);
  const [loadingSearches, setLoadingSearches] = useState(true);
  const [taxaConversao, setTaxaConversao] = useState([]);
  const [loadingTaxaConversao, setLoadingTaxaConversao] = useState(true);
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);
  const [loadingFaturamento, setLoadingFaturamento] = useState(true);
  const [taxaRecompra, setTaxaRecompra] = useState(null);
  const [loadingTaxaRecompra, setLoadingTaxaRecompra] = useState(true);
  const [ticketMedio, setTicketMedio] = useState(null);
  const [loadingTicketMedio, setLoadingTicketMedio] = useState(true);
  const [leadtime, setLeadtime] = useState(null);
  const [loadingLeadtime, setLoadingLeadtime] = useState(true);
  const [kpiConfig, setKpiConfig] = useState(null);
  const [satisfactionKpis, setSatisfactionKpis] = useState(null);
  const [loadingSatisfaction, setLoadingSatisfaction] = useState(true);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showRecompraModal, setShowRecompraModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showVisitanteModal, setShowVisitanteModal] = useState(false);
  const [showConversaoModal, setShowConversaoModal] = useState(false);
  const [showAbandonoModal, setShowAbandonoModal] = useState(false);
  const [showCancelamentoModal, setShowCancelamentoModal] = useState(false);
  const [showSatisfacaoModal, setShowSatisfacaoModal] = useState(false);
  const [showCombagemModal, setShowCombagemModal] = useState(false);
  const [calculationHelp, setCalculationHelp] = useState(null);
  const [behaviorStats, setBehaviorStats] = useState(null);
  const [loadingBehavior, setLoadingBehavior] = useState(true);
  const [behaviorPages, setBehaviorPages] = useState([]);
  const [cartAbandonment, setCartAbandonment] = useState(null);
  const [loadingCartAbandonment, setLoadingCartAbandonment] = useState(true);
  const [crossSell, setCrossSell] = useState(null);
  const [loadingCrossSell, setLoadingCrossSell] = useState(true);
  const [cancellationRate, setCancellationRate] = useState(null);
  const [loadingCancellationRate, setLoadingCancellationRate] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoadingAccuracy(true);
        setLoadingSearches(true);
        setLoadingTaxaConversao(true);
        setLoadingFaturamento(true);
        setLoadingTaxaRecompra(true);
        setLoadingTicketMedio(true);
        setLoadingLeadtime(true);
        setLoadingSatisfaction(true);
        setLoadingBehavior(true);
        setLoadingCartAbandonment(true);
        setLoadingCrossSell(true);
        setLoadingCancellationRate(true);
        setAccuracyError('');
        
        const authToken = getAuthToken();
        const faturamentoHeaders = {
          'Content-Type': 'application/json',
        };
        
        if (authToken) {
          faturamentoHeaders['Authorization'] = `Bearer ${authToken}`;
        }

        const [
          accuracyData,
          searchesData,
          taxaData,
          faturamentoData,
          taxaRecompraData,
          ticketMedioData,
          leadtimeData,
          configData,
          satisfactionData,
          behaviorStatsData,
          behaviorPagesData,
          cartAbandonmentData,
          crossSellData,
          cancellationRateData,
        ] = await Promise.all([
          fetchMediaAcuracidade(),
          fetchPalavrasMaisPesquisadas(5),
          obterTaxaConversao(),
          // Usa apiFetch para aplicar o redirecionamento global em caso de 401.
          apiFetch(`${API_URL}/pedidos/admin/faturamento-mensal?meses=12`, {
            headers: faturamentoHeaders,
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Erro ao carregar faturamento: ${res.status}`);
            }
            return res.json();
          }).then(data => {
            return data.data || [];
          }).catch(err => {
            return [];
          }),
          fetchTaxaRecompraAnual().catch(() => null),
          // Usa apiFetch para aplicar o redirecionamento global em caso de 401.
          apiFetch(`${API_URL}/pedidos/admin/ticket-medio`, {
            headers: faturamentoHeaders,
          }).then(res => {
            if (!res.ok) {
              throw new Error(`Erro ao carregar ticket médio: ${res.status}`);
            }
            return res.json();
          }).then(data => {
            return data.data || null;
          }).catch(err => {
            return null;
          }),
          obterMediaLeadtime().catch(() => null),
          obterKpiConfig(),
          fetchKpiSatisfacao().catch(() => null),
          obterEstatisticasComportamento().catch(() => null),
          obterTempoPorPagina().catch(() => []),
          fetchCarrinhoAbandonoDashboard().catch(() => null),
          fetchCrossSell(5).catch(() => null),
          fetchTaxaCancelamento().catch(() => null),
        ]);

        if (isMounted) {
          setAccuracy(accuracyData);
          setTopSearches(searchesData);
          setTaxaConversao(taxaData || []);
          setFaturamentoMensal(faturamentoData);
          setTaxaRecompra(taxaRecompraData);
          setTicketMedio(ticketMedioData);
          setLeadtime(leadtimeData);
          setKpiConfig(configData);
          setSatisfactionKpis(satisfactionData);
          setBehaviorStats(behaviorStatsData);
          setBehaviorPages(behaviorPagesData?.paginas || behaviorPagesData || []);
          setCartAbandonment(cartAbandonmentData);
          setCrossSell(crossSellData);
          setCancellationRate(cancellationRateData);
        }
      } catch (error) {
        if (isMounted) {
          setAccuracyError(error.message);
          console.error('Erro ao carregar dados do dashboard:', error);
        }
      } finally {
        if (isMounted) {
          setLoadingAccuracy(false);
          setLoadingSearches(false);
          setLoadingTaxaConversao(false);
          setLoadingFaturamento(false);
          setLoadingTaxaRecompra(false);
          setLoadingTicketMedio(false);
          setLoadingLeadtime(false);
          setLoadingSatisfaction(false);
          setLoadingBehavior(false);
          setLoadingCartAbandonment(false);
          setLoadingCrossSell(false);
          setLoadingCancellationRate(false);
        }
      }
    }

    loadDashboardData();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData();
      }
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const accuracyValue = Math.max(0, Math.min(100, Number(accuracy?.media_acuracidade || 0)));
  const topSearch = topSearches[0];
  const ticketMedioFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(ticketMedio?.ticketMedioNumerico || 0));

  const ticketBaixo = Number(kpiConfig?.ticketbaixo || 75);
  const ticketAlto = Number(kpiConfig?.ticketalto || 200);
  const ticketValor = Number(ticketMedio?.ticketMedioNumerico || 0);
  const faturamentoValor = Number(
    faturamentoMensal?.[faturamentoMensal.length - 1]?.faturamento || 0
  );
  const recompraValor = Number(taxaRecompra?.taxa || 0);

  let imagemTicket = ticketMedioImg;
  if (ticketValor < ticketBaixo) {
    imagemTicket = ticketBaixoImg;
  } else if (ticketValor > ticketAlto) {
    imagemTicket = ticketAltoImg;
  }
  
  // Pegar a taxa de conversão do mês mais recente
  const taxaMesAtual = taxaConversao.length > 0 ? taxaConversao[0] : null;
  const conversaoValor = Number(taxaMesAtual?.taxa_conversao || 0);
  const conversaoBaixa = Number(kpiConfig?.conversaobaixa || 2);
  const conversaoAlta = Number(kpiConfig?.conversaoalta || 8);
  let imagemConversao = conversaoMediaImg;
  if (conversaoValor < conversaoBaixa) {
    imagemConversao = conversaoBaixaImg;
  } else if (conversaoValor > conversaoAlta) {
    imagemConversao = conversaoAltaImg;
  }

  const visitantesValor = Number(taxaMesAtual?.visitantes_unicos || 0);
  const visitanteBaixo = Number(kpiConfig?.visitantebaixo || 100);
  const visitanteAlto = Number(kpiConfig?.visitantealto || 500);
  let imagemVisitante = visitanteMedioImg;
  if (visitantesValor < visitanteBaixo) {
    imagemVisitante = visitanteBaixoImg;
  } else if (visitantesValor > visitanteAlto) {
    imagemVisitante = visitanteAltoImg;
  }

  const formatLeadtimeDuration = (value) => {
    const hours = Number(value || 0);
    const totalMinutes = Math.max(0, Math.round(hours * 60));

    if (totalMinutes < 60) {
      return `${totalMinutes}min`;
    }

    const days = Math.floor(totalMinutes / 1440);
    const hoursRemainder = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return `${days}d ${hoursRemainder}h`;
    }

    return minutes > 0 ? `${hoursRemainder}h ${minutes}min` : `${hoursRemainder}h`;
  };

  // Determine color and image based on accuracy percentage
  const getAccuracyMetrics = (value) => {
    if (value >= 95) {
      return {
        color: '#27ae60',
        image: nsaVerde,
        label: 'Excelente',
      };
    } else if (value >= 90 && value < 95) {
      return {
        color: '#f39c12',
        image: nsaAmarelo,
        label: 'Bom',
      };
    } else {
      return {
        color: '#e74c3c',
        image: nsaVermelho,
        label: 'Alerta',
      };
    }
  };

  const accuracyMetrics = getAccuracyMetrics(accuracyValue);

  // Determinar a imagem de fundo baseada no faturamento
  const getFaturamentoBackgroundImage = () => {
    if (!kpiConfig || !faturamentoMensal || faturamentoMensal.length === 0) {
      return faturamentoMedioImg;
    }

    const currentRevenue = parseFloat(faturamentoMensal[faturamentoMensal.length - 1]?.faturamento || 0);
    const baixo = parseFloat(kpiConfig.faturamento_baixo);
    const alto = parseFloat(kpiConfig.faturamento_alto);

    if (currentRevenue < baixo) {
      return faturamentoBaixoImg;
    } else if (currentRevenue > alto) {
      return faturamentoAltoImg;
    } else {
      return faturamentoMedioImg;
    }
  };

  const getRecompraBackgroundImage = () => {
    if (!kpiConfig || !taxaRecompra) {
      return recompraAmareloImg;
    }

    const currentRate = Number(taxaRecompra?.taxa || 0);
    const baixo = Number(kpiConfig.recomprabaixa ?? 20);
    const alto = Number(kpiConfig.recompraalta ?? 50);

    if (currentRate < baixo) {
      return recompraVermelhoImg;
    } else if (currentRate > alto) {
      return recompraVerdeImg;
    } else {
      return recompraAmareloImg;
    }
  };

  const revenueData = useMemo(() => {
    if (!faturamentoMensal || faturamentoMensal.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Faturamento',
            data: [],
            borderColor: chartColors.navy,
            backgroundColor: 'rgba(16, 24, 44, 0.08)',
            pointBackgroundColor: chartColors.navy,
            pointBorderColor: chartColors.navy,
            pointRadius: 4,
            tension: 0.35,
            fill: true,
          },
        ],
      };
    }

    return {
      labels: faturamentoMensal.map(item => {
        const [mes, ano] = item.mes.split('/');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${meses[parseInt(mes) - 1]} ${ano.slice(-2)}`;
      }),
      datasets: [
        {
          label: 'Faturamento',
          data: faturamentoMensal.map(item => parseFloat(item.faturamento)),
          borderColor: chartColors.navy,
          backgroundColor: 'rgba(16, 24, 44, 0.08)',
          pointBackgroundColor: chartColors.navy,
          pointBorderColor: chartColors.navy,
          pointRadius: 4,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [faturamentoMensal]);

  const funnelData = useMemo(() => ({
    labels: ['Visitantes', 'Adicoes', 'Checkout', 'Compras'],
    datasets: [
      {
        data: [61, 25, 9, 5],
        backgroundColor: [chartColors.navy, chartColors.slate, chartColors.sky, chartColors.gold],
        borderColor: '#ffffff',
        borderWidth: 3,
      },
    ],
  }), []);

  const conversionRateData = useMemo(() => {
    if (!taxaConversao || taxaConversao.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Taxa de conversão',
          data: [],
          borderColor: chartColors.teal,
          backgroundColor: 'rgba(8, 147, 111, 0.08)',
          pointBackgroundColor: chartColors.teal,
          pointBorderColor: chartColors.teal,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true,
        }],
      };
    }

    const reversed = [...taxaConversao].reverse();
    return {
      labels: reversed.map(item => {
        const date = new Date(item.mes);
        return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: 'Taxa de conversão (%)',
          data: reversed.map(item => item.taxa_conversao),
          borderColor: chartColors.teal,
          backgroundColor: 'rgba(8, 147, 111, 0.08)',
          pointBackgroundColor: chartColors.teal,
          pointBorderColor: chartColors.teal,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [taxaConversao]);

  const productData = useMemo(() => ({
    labels: ['Vela de Soja', 'Ima Aparecida', 'Vela de Mirra', 'Vela de Incenso', 'Terco Oliveira', 'Terco Madeira'],
    datasets: [
      {
        label: 'Unidades vendidas',
        data: [100, 42, 36, 31, 24, 18],
        backgroundColor: 'rgba(16, 24, 44, 0)',
        borderColor: 'rgba(16, 24, 44, 0)',
        borderWidth: 0,
        borderRadius: 0,
      },
    ],
  }), []);

  const satisfactionAverage = Number(satisfactionKpis?.mediaGeral || 0);
  const satisfactionTotal = Number(satisfactionKpis?.totalAvaliacoes || 0);
  const abandonmentValue = Number(cartAbandonment?.taxaAbandono || 0);
  const cancellationValue = Number(cancellationRate?.taxaCancelamento || 0);
  const combagemValue = Number(crossSell?.topCombinacao?.pedidosJuntos || 0);
  const combagemBaixa = Number(kpiConfig?.combagembaixa ?? 2);
  const combagemAlta = Number(kpiConfig?.combagemalta ?? 5);
  const abandonoBaixo = Number(kpiConfig?.abandonobaixa ?? 30);
  const abandonoAlto = Number(kpiConfig?.abandonoalta ?? 60);
  const cancelamentoBaixo = Number(kpiConfig?.cancelamentobaixa ?? 5);
  const cancelamentoAlto = Number(kpiConfig?.cancelamentoalta ?? 15);
  const satisfacaoBaixa = Number(kpiConfig?.satisfacaobaixa ?? 3);
  const satisfacaoAlta = Number(kpiConfig?.satisfacaoalta ?? 4);

  let imagemAbandono = abandonoRegularImg;
  if (!loadingCartAbandonment && cartAbandonment) {
    if (abandonmentValue < abandonoBaixo) {
      imagemAbandono = abandonoBomImg;
    } else if (abandonmentValue > abandonoAlto) {
      imagemAbandono = abandonoRuimImg;
    }
  }

  let imagemCrossSell = crossSellRegularImg;
  if (!loadingCrossSell && crossSell?.topCombinacao) {
    if (combagemValue < combagemBaixa) {
      imagemCrossSell = crossSellRuimImg;
    } else if (combagemValue > combagemAlta) {
      imagemCrossSell = crossSellBomImg;
    }
  }

  let imagemCancelamento = cancelamentoRegularImg;
  if (!loadingCancellationRate && cancellationRate) {
    if (cancellationValue < cancelamentoBaixo) {
      imagemCancelamento = cancelamentoBomImg;
    } else if (cancellationValue > cancelamentoAlto) {
      imagemCancelamento = cancelamentoRuimImg;
    }
  }

  let imagemSatisfacao = satisfacaoRegularImg;
  if (!loadingSatisfaction && satisfactionTotal > 0) {
    if (satisfactionAverage < satisfacaoBaixa) {
      imagemSatisfacao = satisfacaoRuimImg;
    } else if (satisfactionAverage > satisfacaoAlta) {
      imagemSatisfacao = satisfacaoBomImg;
    }
  }

  const getLowerIsBetterClass = (value, low, high) => {
    if (value < Number(low)) return styles.kpiLevelGood;
    if (value > Number(high)) return styles.kpiLevelCritical;
    return styles.kpiLevelWarning;
  };

  const getHigherIsBetterClass = (value, low, high) => {
    if (value < Number(low)) return styles.kpiLevelCritical;
    if (value > Number(high)) return styles.kpiLevelGood;
    return styles.kpiLevelWarning;
  };

  const abandonmentLevel = getLowerIsBetterClass(
    abandonmentValue,
    abandonoBaixo,
    abandonoAlto
  );
  const cancellationLevel = getLowerIsBetterClass(
    cancellationValue,
    cancelamentoBaixo,
    cancelamentoAlto
  );
  const satisfactionLevel = loadingSatisfaction || satisfactionTotal === 0
    ? styles.kpiLevelWarning
    : getHigherIsBetterClass(satisfactionAverage, satisfacaoBaixa, satisfacaoAlta);
  const combagemLevel = loadingCrossSell || !crossSell?.topCombinacao
    ? styles.kpiLevelWarning
    : getHigherIsBetterClass(combagemValue, combagemBaixa, combagemAlta);
  const faturamentoLevel = getHigherIsBetterClass(
    faturamentoValor,
    kpiConfig?.faturamento_baixo ?? 500,
    kpiConfig?.faturamento_alto ?? 5000
  );
  const ticketLevel = getHigherIsBetterClass(ticketValor, ticketBaixo, ticketAlto);
  const recompraLevel = getHigherIsBetterClass(
    recompraValor,
    kpiConfig?.recomprabaixa ?? 20,
    kpiConfig?.recompraalta ?? 50
  );
  const conversaoLevel = getHigherIsBetterClass(conversaoValor, conversaoBaixa, conversaoAlta);
  const visitantesLevel = getHigherIsBetterClass(visitantesValor, visitanteBaixo, visitanteAlto);
  const accuracyLevel = accuracyValue >= 95
    ? styles.kpiLevelGood
    : accuracyValue >= 90
      ? styles.kpiLevelWarning
      : styles.kpiLevelCritical;
  const informationalLevel = styles.kpiLevelWarning;
  const accuracyData = useMemo(() => ({
    labels: ['Acuracidade media', 'Diferenca'],
    datasets: [
      {
        data: [accuracyValue, 100 - accuracyValue],
        backgroundColor: [accuracyMetrics.color, '#bfc5c8'],
        borderColor: ['#ffffff', '#ffffff'],
        borderWidth: 2,
        cutout: '68%',
      },
    ],
  }), [accuracyValue, accuracyMetrics.color]);

  return (
    <main className={styles.page}>
      <AdminSidebar />

      <section className={styles.shell}>
        <header className={styles.hero}>
          <img src={logo} alt="Tres Pescadores Store" />
          <div>
            <h1>Painel Administrativo</h1>
            <p>Visao geral e gestao rapida</p>
          </div>
        </header>

        <section className={styles.metricsGrid} aria-label="Indicadores do painel">
          <section className={styles.kpiGrid} aria-label="Indicadores principais">
          <article 
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${faturamentoLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/faturamento-completo')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/faturamento-completo');
              }
            }}
            style={{
              backgroundImage: `url(${getFaturamentoBackgroundImage()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Overlay para escurecer a imagem */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            {/* Engrenagem */}
            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowKpiModal(true);
              }}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Configurar faturamento"
            >
              <FiSettings size={18} color="#10182c" />
            </button>
            {/* Conteúdo do card */}
            <CalculationHelpButton calculation={kpiCalculations.faturamento} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Faturamento mensal</span>
              <strong>
                {loadingFaturamento ? 'Carregando...' : `R$ ${
                  faturamentoMensal && faturamentoMensal.length > 0
                    ? faturamentoMensal[faturamentoMensal.length - 1]?.faturamento || '0,00'
                    : '0,00'
                }`}
              </strong>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${ticketLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/vendas')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/vendas');
              }
            }}
            style={{
              backgroundImage: `url(${imagemTicket})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowTicketModal(true);
              }}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Configurar limites do ticket médio"
            >
              <FiSettings size={18} color="#10182c" />
            </button>
            <CalculationHelpButton calculation={kpiCalculations.ticket} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
            <span>Ticket médio - {ticketMedio?.mesReferencia || 'mês atual'}</span>
            <strong>{loadingTicketMedio ? 'Carregando...' : ticketMedioFormatado}</strong>
            {ticketMedio && (
              <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '-8px' }}>
                {ticketMedio.total_vendas} vendas confirmadas
              </small>
            )}
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${recompraLevel}`}
            style={{
              backgroundImage: `url(${getRecompraBackgroundImage()})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            <button
              onClick={() => setShowRecompraModal(true)}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Configurar recompra"
            >
              <FiSettings size={18} color="#10182c" />
            </button>

            <CalculationHelpButton calculation={kpiCalculations.recompra} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Taxa de recompra</span>
              <strong>
                {loadingTaxaRecompra
                  ? 'Carregando...'
                  : `${Number(taxaRecompra?.taxa || 0).toFixed(2).replace('.', ',')}%`}
              </strong>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.searchKpi} ${informationalLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/palavras-pesquisadas')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/palavras-pesquisadas');
              }
            }}
            style={{
              backgroundImage: `url(${palavrasPesquisadasImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            <CalculationHelpButton calculation={kpiCalculations.pesquisas} onOpen={setCalculationHelp} />
            <div className={styles.revenueKpiContent}>
              <span>Palavras mais pesquisadas</span>
              <strong>{loadingSearches ? 'Carregando...' : topSearch ? 'Top 3 buscas' : 'Sem dados'}</strong>
              <div className={styles.searchList}>
                {topSearches.slice(0, 3).map((item) => (
                  <small key={item.palavra}>
                    <span>{item.palavra}</span>
                    <b>{item.total}</b>
                  </small>
                ))}
              </div>
            </div>
          </article>
          </section>

          <section className={styles.conversionSection} aria-label="Indicadores operacionais">
          <article
            className={`${styles.kpiCard} ${conversaoLevel}`}
            style={{
              backgroundImage: `url(${imagemConversao})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowConversaoModal(true);
              }}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Configurar taxa de conversao"
            >
              <FiSettings size={18} color="#10182c" />
            </button>

            <CalculationHelpButton calculation={kpiCalculations.conversao} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Taxa de conversao</span>
              <strong>{loadingTaxaConversao ? 'Carregando...' : `${conversaoValor.toFixed(2).replace('.', ',')}%`}</strong>
              {taxaMesAtual && (
                <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '-8px' }}>
                  {taxaMesAtual.visitantes_unicos} visitantes | {taxaMesAtual.pedidos_confirmados} pedidos
                </small>
              )}
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${visitantesLevel}`}
            style={{
              backgroundImage: `url(${imagemVisitante})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            <button
              onClick={() => setShowVisitanteModal(true)}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Configurar visitantes"
            >
              <FiSettings size={18} color="#10182c" />
            </button>

            <CalculationHelpButton calculation={kpiCalculations.visitantes} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Visitantes unicos (mes)</span>
              <strong>
                {loadingTaxaConversao ? 'Carregando...' : taxaMesAtual?.visitantes_unicos ?? 0}
              </strong>
              {taxaMesAtual && (
                <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '-8px' }}>
                  IPs unicos que visitaram home
                </small>
              )}
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.leadtimeKpi} ${informationalLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/leadtime')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/leadtime');
              }
            }}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(16, 24, 44, 0.9) 0%, rgba(16, 24, 44, 0.72) 54%, rgba(8, 147, 111, 0.34) 100%), url(${saoPedroImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CalculationHelpButton calculation={kpiCalculations.leadtime} onOpen={setCalculationHelp} />
            <div className={`${styles.revenueKpiContent} ${styles.leadtimeContent}`}>
              <div className={styles.leadtimeSummary}>
                <span>Lead time medio</span>
                <strong>
                  {loadingLeadtime
                    ? 'Carregando...'
                    : leadtime?.media_geral_label || formatLeadtimeDuration(leadtime?.media_geral_horas)}
                </strong>
                <small>
                  {loadingLeadtime
                    ? 'Calculando etapas'
                    : `${leadtime?.total_pedidos || 0} pedidos analisados`}
                </small>
              </div>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.abandonmentKpi} ${abandonmentLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/carrinho-abandono')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/carrinho-abandono');
              }
            }}
            style={{
              backgroundImage: `url(${imagemAbandono})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <div className={styles.abandonmentKpiOverlay} aria-hidden="true" />
            <FiShoppingCart className={styles.abandonmentKpiIcon} aria-hidden="true" />
            <KpiSettingsButton title="Configurar limites da taxa de abandono" onOpen={() => setShowAbandonoModal(true)} />
            <CalculationHelpButton calculation={kpiCalculations.abandono} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Taxa de abandono</span>
              <strong>
                {loadingCartAbandonment
                  ? 'Carregando...'
                  : `${abandonmentValue.toFixed(1).replace('.', ',')}%`}
              </strong>
              <small>
                {loadingCartAbandonment
                  ? 'Consultando ultimos 30 dias'
                  : `${cartAbandonment?.carrinhosAbandonados || 0} de ${cartAbandonment?.totalCarrinhos || 0} carrinhos`}
              </small>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.crossSellKpi} ${combagemLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/cross-sell')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/cross-sell');
              }
            }}
            style={{
              backgroundImage: `url(${imagemCrossSell})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <div className={styles.crossSellKpiOverlay} aria-hidden="true" />
            <FiLink className={styles.crossSellKpiIcon} aria-hidden="true" />
            <KpiSettingsButton title="Configurar limites de combagem" onOpen={() => setShowCombagemModal(true)} />
            <CalculationHelpButton calculation={kpiCalculations.crossSell} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Cross-sell</span>
              <strong className={styles.crossSellPair}>
                {loadingCrossSell
                  ? 'Carregando...'
                  : crossSell?.topCombinacao
                    ? `${crossSell.topCombinacao.produtoA.nome} + ${crossSell.topCombinacao.produtoB.nome}`
                    : 'Sem combinacoes'}
              </strong>
              <small>
                {loadingCrossSell
                  ? 'Analisando pedidos'
                  : crossSell?.topCombinacao
                    ? `${crossSell.topCombinacao.pedidosJuntos} pedidos juntos`
                    : 'Aguardando pedidos com varios produtos'}
              </small>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.cancellationKpi} ${cancellationLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/vendas?status=cancelado')}
            onKeyDown={(event) => {
              if (event.currentTarget !== event.target) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/vendas?status=cancelado');
              }
            }}
            style={{
              backgroundImage: `url(${imagemCancelamento})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <div className={styles.cancellationKpiOverlay} aria-hidden="true" />
            <FiXCircle className={styles.cancellationKpiIcon} aria-hidden="true" />
            <KpiSettingsButton title="Configurar limites da taxa de cancelamento" onOpen={() => setShowCancelamentoModal(true)} />
            <CalculationHelpButton calculation={kpiCalculations.cancelamento} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Taxa de cancelamento</span>
              <strong>
                {loadingCancellationRate
                  ? 'Carregando...'
                  : `${cancellationValue.toFixed(1).replace('.', ',')}%`}
              </strong>
              <small>
                {loadingCancellationRate
                  ? 'Consultando pedidos'
                  : `${cancellationRate?.pedidosCancelados || 0} de ${cancellationRate?.totalPedidos || 0} pedidos no mes`}
              </small>
            </div>
          </article>
          <article
            className={`${styles.kpiCard} ${styles.clickableKpiCard} ${styles.satisfactionKpi} ${satisfactionLevel}`}
            role="link"
            tabIndex={0}
            onClick={() => navigate('/admin/satisfacao')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/admin/satisfacao');
              }
            }}
            style={{
              backgroundImage: `url(${imagemSatisfacao})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <div className={styles.satisfactionKpiOverlay} aria-hidden="true" />
            <FiStar className={styles.satisfactionKpiIcon} aria-hidden="true" />
            <KpiSettingsButton title="Configurar limites da media de satisfacao" onOpen={() => setShowSatisfacaoModal(true)} />
            <CalculationHelpButton calculation={kpiCalculations.satisfacao} onOpen={setCalculationHelp} withSettings />
            <div className={styles.revenueKpiContent}>
              <span>Media de satisfacao</span>
              <strong>{loadingSatisfaction ? 'Carregando...' : `${satisfactionAverage.toFixed(1)} / 5`}</strong>
              <small>{loadingSatisfaction ? 'Consultando avaliacoes' : `${satisfactionTotal} avaliacoes registradas`}</small>
            </div>
          </article>
          <article className={`${styles.accuracyCard} ${accuracyLevel}`}>
            <CalculationHelpButton calculation={kpiCalculations.acuracidade} onOpen={setCalculationHelp} />
            <div className={styles.accuracyHeader}>
              <div className={styles.headerContent}>
                <div>
                  <h2>Acuracidade</h2>
                  <span>{accuracy?.total_auditorias || 0} produtos auditados</span>
                </div>
                <img src={accuracyMetrics.image} alt={accuracyMetrics.label} className={styles.headerNsaImage} />
              </div>
              {loadingAccuracy && <FiRefreshCw className={styles.loadingIcon} />}
            </div>
            <div className={styles.accuracyChart}>
              <Doughnut
                data={accuracyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.label}: ${Number(context.raw).toFixed(2)}%`,
                      },
                    },
                  },
                }}
              />
              <div className={styles.accuracyValue}>
                <strong>{loadingAccuracy ? '--' : `${accuracyValue.toFixed(2)}%`}</strong>
                <span>Acuracidade media</span>
              </div>
            </div>
            {accuracyError && <p className={styles.errorText}>{accuracyError}</p>}
          </article>
          </section>
        </section>

        <section className={styles.dashboardGrid}>
          <article className={`${styles.behaviorCard} ${informationalLevel}`}
            style={{
              backgroundColor: 'transparent',
              color: '#ffffff',
              '--bg-url': `url(${basilicaImg})`,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/admin/comportamento')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/comportamento'); } }}
            role="button"
            tabIndex={0}
            aria-label="Ver detalhes de comportamento do usuário"
          >
            <div className={styles.behaviorHeader}>
              <span>Comportamento do Usuário</span>
            </div>
            <div className={styles.behaviorMetrics}>
              <div className={styles.behaviorMetric}>
                <strong>
                  {loadingBehavior
                    ? '...'
                    : behaviorStats?.tempo_medio_por_pagina_segundos
                      ? `${behaviorStats.tempo_medio_por_pagina_segundos}s`
                      : '0s'}
                </strong>
                <span>Tempo médio/página</span>
              </div>
              <div className={styles.behaviorMetric}>
                <strong>
                  {loadingBehavior ? '...' : behaviorStats?.sessoes_unicas || 0}
                </strong>
                <span>Sessões</span>
              </div>
              <div className={styles.behaviorMetric}>
                <strong>
                  {loadingBehavior ? '...' : behaviorStats?.total_clicks || 0}
                </strong>
                <span>Cliques</span>
              </div>
              <div className={styles.behaviorMetric}>
                <strong>
                  {loadingBehavior ? '...' : behaviorStats?.total_page_views || 0}
                </strong>
                <span>Páginas vistas</span>
              </div>
            </div>
            {!loadingBehavior && behaviorPages.length > 0 && (
              <div className={styles.behaviorPagesList}>
                <span className={styles.behaviorPagesLabel}>Páginas com maior tempo:</span>
                {behaviorPages.slice(0, 4).map((p, i) => (
                  <div key={i} className={styles.behaviorPageItem}>
                    <span className={styles.behaviorPageName}>{p.pagina}</span>
                    <span className={styles.behaviorPageTime}>{p.tempo_medio_segundos}s</span>
                    <span className={styles.behaviorPageBar}>
                      <span style={{ width: `${Math.min(100, (p.tempo_medio_segundos / Math.max(...behaviorPages.slice(0, 4).map(x => x.tempo_medio_segundos))) * 100)}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            <CalculationHelpButton calculation={kpiCalculations.comportamento} onOpen={setCalculationHelp} />
          </article>

        </section>
      </section>

      <KpiConfigModal
        isOpen={showKpiModal}
        onClose={() => setShowKpiModal(false)}
        config={kpiConfig}
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showRecompraModal}
        onClose={() => setShowRecompraModal(false)}
        config={kpiConfig}
        type="recompra"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        config={kpiConfig}
        type="ticket"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showVisitanteModal}
        onClose={() => setShowVisitanteModal(false)}
        config={kpiConfig}
        type="visitante"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showConversaoModal}
        onClose={() => setShowConversaoModal(false)}
        config={kpiConfig}
        type="conversao"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showAbandonoModal}
        onClose={() => setShowAbandonoModal(false)}
        config={kpiConfig}
        type="abandono"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showCancelamentoModal}
        onClose={() => setShowCancelamentoModal(false)}
        config={kpiConfig}
        type="cancelamento"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showSatisfacaoModal}
        onClose={() => setShowSatisfacaoModal(false)}
        config={kpiConfig}
        type="satisfacao"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <KpiConfigModal
        isOpen={showCombagemModal}
        onClose={() => setShowCombagemModal(false)}
        config={kpiConfig}
        type="combagem"
        onConfigUpdated={(updated) => setKpiConfig(updated)}
      />
      <CalculationHelpModal calculation={calculationHelp} onClose={() => setCalculationHelp(null)} />
    </main>
  );
}

export default AdminDashboard;
