import { useEffect, useMemo, useState } from 'react';
import {
  ArcElement,
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
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import { FiArrowLeft, FiLogOut, FiPackage, FiRefreshCw, FiUser, FiUsers, FiSettings } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo/logo.png';
import nsaVerde from '../assets/logo/nsa-verde.png';
import nsaAmarelo from '../assets/logo/nsa-amarelo.png';
import nsaVermelho from '../assets/logo/nsa-vermelho.png';
import { apiFetch, clearAuthSession, fetchMediaAcuracidade, fetchPalavrasMaisPesquisadas, fetchTaxaRecompraAnual, getAuthUser, getAuthToken, API_URL, BACKEND_URL } from '../services/api';
import clockTowerBar from '../assets/admin/clock-tower-bar.png';
import cableCarPoint from '../assets/admin/cable-car-point.png';
import faturamentoBaixoImg from '../assets/admin/faturamentobaixo.jpg';
import faturamentoMedioImg from '../assets/admin/faturamentomedio.jpg';
import faturamentoAltoImg from '../assets/admin/faturamentoalto.png';
import recompraVermelhoImg from '../assets/admin/recompravermelho.png';
import recompraAmareloImg from '../assets/admin/recompraamarelo.png';
import recompraVerdeImg from '../assets/admin/recompraverde.png';
import { obterTaxaConversao } from '../services/visitanteEvento';
import { obterKpiConfig } from '../services/kpiConfig';
import KpiConfigModal from '../components/KpiConfigModal';
import styles from './AdminDashboard.module.css';

ChartJS.register(
  ArcElement,
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

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        boxWidth: 14,
        color: '#5a5a5a',
        font: { size: 11 },
      },
    },
  },
};

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawFlame(ctx, x, y, size, intensity) {
  const flameColors = intensity < 0.2
    ? {
        middle: '#ff6a45',
        edge: '#c62828',
        glow: 'rgba(255, 95, 72, 0.58)',
        glowSoft: 'rgba(255, 95, 72, 0.22)',
        stroke: 'rgba(131, 35, 30, 0.26)',
      }
    : intensity > 0.9
      ? {
          middle: '#9eea8f',
          edge: '#2f9d59',
          glow: 'rgba(104, 218, 128, 0.55)',
          glowSoft: 'rgba(104, 218, 128, 0.2)',
          stroke: 'rgba(38, 111, 67, 0.24)',
        }
      : {
          middle: '#ffd978',
          edge: '#f4a43d',
          glow: 'rgba(255, 210, 98, 0.58)',
          glowSoft: 'rgba(255, 210, 98, 0.22)',
          stroke: 'rgba(140, 88, 21, 0.24)',
        };

  const glow = ctx.createRadialGradient(x, y + size * 0.16, size * 0.12, x, y + size * 0.16, size * 1.45);
  glow.addColorStop(0, flameColors.glow);
  glow.addColorStop(0.45, flameColors.glowSoft);
  glow.addColorStop(1, 'rgba(255, 210, 98, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + size * 0.2, size * 1.35, 0, Math.PI * 2);
  ctx.fill();

  const flameGradient = ctx.createLinearGradient(x, y - size * 0.9, x, y + size * 0.85);
  flameGradient.addColorStop(0, '#fff7b8');
  flameGradient.addColorStop(0.42, flameColors.middle);
  flameGradient.addColorStop(1, flameColors.edge);

  ctx.fillStyle = flameGradient;
  ctx.strokeStyle = flameColors.stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.9);
  ctx.bezierCurveTo(x + size * 0.62, y - size * 0.1, x + size * 0.48, y + size * 0.55, x, y + size * 0.86);
  ctx.bezierCurveTo(x - size * 0.56, y + size * 0.5, x - size * 0.48, y - size * 0.1, x, y - size * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 230, 0.92)';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.09, y + size * 0.05, size * 0.18, size * 0.42, 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawCandle(ctx, x, lineY, baseY, width, valueRatio) {
  const minBodyHeight = 24;
  const bodyWidth = width;
  const bodyX = x - bodyWidth / 2;
  const availableHeight = Math.max(minBodyHeight, baseY - lineY);

  const flameSize = Math.max(12, Math.min(22, availableHeight * 0.1));
  const wickHeight = Math.max(10, Math.min(18, availableHeight * 0.06));
  const candleTop = lineY;
  const bodyHeight = Math.max(minBodyHeight, baseY - candleTop);
  const flameCenterY = candleTop - wickHeight - flameSize * 0.5;

  ctx.save();
  ctx.shadowColor = 'rgba(95, 63, 25, 0.2)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  const baseGradient = ctx.createLinearGradient(bodyX, baseY - 12, bodyX, baseY + 8);
  baseGradient.addColorStop(0, '#9f6729');
  baseGradient.addColorStop(0.5, '#f4ca75');
  baseGradient.addColorStop(1, '#7c4718');
  ctx.fillStyle = baseGradient;
  roundedRect(ctx, bodyX - bodyWidth * 0.18, baseY - 13, bodyWidth * 1.36, 16, 8);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(bodyX, candleTop, bodyX + bodyWidth, candleTop);
  bodyGradient.addColorStop(0, '#b77a32');
  bodyGradient.addColorStop(0.14, '#ffe5aa');
  bodyGradient.addColorStop(0.48, '#fff2c9');
  bodyGradient.addColorStop(0.78, '#e0a34d');
  bodyGradient.addColorStop(1, '#8a541e');
  ctx.fillStyle = bodyGradient;
  roundedRect(ctx, bodyX, candleTop, bodyWidth, bodyHeight, 9);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(120, 77, 27, 0.34)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, bodyX + 1, candleTop + 1, bodyWidth - 2, bodyHeight - 2, 8);
  ctx.stroke();

  ctx.fillStyle = 'rgba(119, 70, 23, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, candleTop + 2, bodyWidth * 0.43, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffdf98';
  roundedRect(ctx, bodyX + bodyWidth * 0.1, candleTop - 3, bodyWidth * 0.8, 8, 5);
  ctx.fill();

  ctx.strokeStyle = '#332414';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(x, candleTop - 2);
  ctx.quadraticCurveTo(x + 2, candleTop - wickHeight * 0.5, x, candleTop - wickHeight);
  ctx.stroke();

  ctx.fillStyle = 'rgba(143, 80, 28, 0.26)';
  roundedRect(ctx, bodyX + bodyWidth * 0.14, candleTop + 4, bodyWidth * 0.12, Math.max(14, bodyHeight * 0.18), 6);
  ctx.fill();
  if (bodyHeight > 62) {
    roundedRect(ctx, bodyX + bodyWidth * 0.72, candleTop + 8, bodyWidth * 0.12, Math.max(12, bodyHeight * 0.12), 6);
    ctx.fill();
  }

  drawFlame(ctx, x, flameCenterY, flameSize, valueRatio);
  ctx.restore();
}

const revenueCandlesPlugin = {
  id: 'revenueCandles',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    const yScale = chart.scales.y;
    const dataset = chart.data.datasets[0];

    if (!meta?.data?.length || !yScale || !dataset?.data?.length) {
      return;
    }

    const values = dataset.data.map(Number);
    const maxValue = Math.max(...values);
    const baseY = yScale.getPixelForValue(yScale.min);
    const slotWidth = chart.chartArea.width / values.length;
    const candleWidth = Math.max(20, Math.min(46, slotWidth * 0.28));

    chart.ctx.save();
    meta.data.forEach((point, index) => {
      const value = values[index];
      const valueRatio = maxValue > 0 ? value / maxValue : 0;
      drawCandle(chart.ctx, point.x, point.y, baseY - 4, candleWidth, valueRatio);
    });
    chart.ctx.restore();
  },
};

function createTowerBarsPlugin(imageSrc) {
  const image = new Image();
  image.src = imageSrc;

  return {
    id: 'towerBars',
    beforeInit(chart) {
      image.onload = () => chart.draw();
    },
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const yScale = chart.scales.y;

      if (!meta?.data?.length || !yScale || !image.complete || image.naturalWidth === 0) {
        return;
      }

      const baseY = yScale.getPixelForValue(yScale.min);
      const sourceX = image.naturalWidth * 0.1;
      const sourceY = 0;
      const sourceWidth = image.naturalWidth * 0.8;
      const sourceHeight = image.naturalHeight;
      const sourceRatio = sourceWidth / sourceHeight;

      chart.ctx.save();
      meta.data.forEach((bar) => {
        const barHeight = Math.max(0, baseY - bar.y);
        const towerHeight = barHeight * 0.92;
        const towerWidth = towerHeight * sourceRatio;
        const towerX = bar.x - towerWidth / 2;
        const towerY = baseY - towerHeight;

        chart.ctx.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          towerX,
          towerY,
          towerWidth,
          towerHeight
        );
      });
      chart.ctx.restore();
    },
  };
}

function createCableCarPointsPlugin(imageSrc) {
  const image = new Image();
  image.src = imageSrc;

  return {
    id: 'cableCarPoints',
    beforeInit(chart) {
      image.onload = () => chart.draw();
    },
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);

      if (!meta?.data?.length || !image.complete || image.naturalWidth === 0) {
        return;
      }

      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const pointHeight = Math.max(46, Math.min(82, chart.chartArea.height * 0.3));
      const pointWidth = pointHeight * sourceRatio;

      chart.ctx.save();
      meta.data.forEach((point) => {
        chart.ctx.drawImage(
          image,
          point.x - pointWidth / 2,
          point.y,
          pointWidth,
          pointHeight
        );
      });
      chart.ctx.restore();
    },
  };
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
  const [kpiConfig, setKpiConfig] = useState(null);
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [showRecompraModal, setShowRecompraModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

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
        setAccuracyError('');
        
        const authToken = getAuthToken();
        const faturamentoHeaders = {
          'Content-Type': 'application/json',
        };
        
        if (authToken) {
          faturamentoHeaders['Authorization'] = `Bearer ${authToken}`;
        }

        const [accuracyData, searchesData, taxaData, faturamentoData, taxaRecompraData, ticketMedioData, configData] = await Promise.all([
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
          obterKpiConfig(),
        ]);

        if (isMounted) {
          setAccuracy(accuracyData);
          setTopSearches(searchesData);
          setTaxaConversao(taxaData || []);
          setFaturamentoMensal(faturamentoData);
          setTaxaRecompra(taxaRecompraData);
          setTicketMedio(ticketMedioData);
          setKpiConfig(configData);
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
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
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

  let imagemTicket = '';
  if (ticketValor < ticketBaixo) {
    imagemTicket = `${BACKEND_URL}/uploads/img/cesto-vazio.jpeg`;
  } else if (ticketValor <= ticketAlto) {
    imagemTicket = `${BACKEND_URL}/uploads/img/cesto-medio.jpeg`;
  } else {
    imagemTicket = `${BACKEND_URL}/uploads/img/cesto-cheio.jpeg`;
  }
  
  // Pegar a taxa de conversão do mês mais recente
  const taxaMesAtual = taxaConversao.length > 0 ? taxaConversao[0] : null;

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

  const towerBarsPlugin = useMemo(() => createTowerBarsPlugin(clockTowerBar), []);
  const cableCarPointsPlugin = useMemo(() => createCableCarPointsPlugin(cableCarPoint), []);

  const satisfactionData = useMemo(() => ({
    labels: ['Atendimento', 'Entrega', 'Qualidade', 'Preco', 'Experiencia'],
    datasets: [
      {
        label: 'Satisfacao',
        data: [0.75, 0.78, 0.92, 0.68, 0.82],
        borderColor: '#a7824f',
        backgroundColor: 'rgba(167, 130, 79, 0.22)',
        pointBackgroundColor: '#a7824f',
      },
    ],
  }), []);

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
      <section className={styles.shell}>
        <header className={styles.hero}>
          <img src={logo} alt="Tres Pescadores Store" />
          <div>
            <h1>Painel Administrativo</h1>
            <p>Visao geral e gestao rapida</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <FiUser size={14} />
              {getAuthUser()?.nome || 'Usuário'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#5366aa', background: '#f0f2f8', border: 'none', cursor: 'pointer',
                }}
              >
                <FiArrowLeft size={14} />
                Voltar
              </button>
              <Link
                to="/admin/usuarios"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#fff', background: '#5366aa',
                  boxShadow: '0 8px 20px rgba(83,102,170,0.25)',
                  textDecoration: 'none',
                }}
              >
                <FiUsers size={14} />
                Gerenciar Usuários
              </Link>
              <Link
                to="/estoque"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#08936f', background: '#e6f5f0',
                  textDecoration: 'none',
                }}
              >
                <FiPackage size={14} />
                Gerenciar Estoque
              </Link>
              <button
                onClick={() => { clearAuthSession(); navigate('/login'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#b91c1c', background: '#fef2f2', border: 'none', cursor: 'pointer',
                }}
              >
                <FiLogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </header>

        <section className={styles.kpiGrid} aria-label="Indicadores principais">
          <article 
            className={styles.kpiCard}
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
              onClick={() => setShowKpiModal(true)}
              style={{
                position: 'absolute',
                top: 12,
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
            className={styles.kpiCard}
            style={{
              position: 'relative',
              background: ticketValor > 0
                ? `linear-gradient(rgba(83, 102, 170, 0.72), rgba(83, 102, 170, 0.72)), url("${imagemTicket}") center / cover`
                : undefined,
            }}
          >
            <button
              onClick={() => setShowTicketModal(true)}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(255,255,255,0.2)', border: 'none',
                borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 4, color: '#fff',
              }}
              title="Configurar limites do ticket médio"
            >
              <FiSettings size={16} />
            </button>
            <span>Ticket médio</span>
            <strong>{loadingTicketMedio ? 'Carregando...' : ticketMedioFormatado}</strong>
            {ticketMedio && (
              <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px' }}>
                {ticketMedio.total_vendas} vendas confirmadas
              </small>
            )}
          </article>
          <article
            className={styles.kpiCard}
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
                top: 12,
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

            <div className={styles.revenueKpiContent}>
              <span>Taxa de recompra</span>
              <strong>
                {loadingTaxaRecompra
                  ? 'Carregando...'
                  : `${Number(taxaRecompra?.taxa || 0).toFixed(2).replace('.', ',')}%`}
              </strong>
            </div>
          </article>
          <article className={`${styles.kpiCard} ${styles.searchKpi}`}>
            <span>Palavras mais pesquisadas</span>
            <strong>{loadingSearches ? 'Carregando...' : topSearch?.palavra || 'Sem dados'}</strong>
            <div className={styles.searchList}>
              {topSearches.slice(0, 4).map((item) => (
                <small key={item.palavra}>
                  <span>{item.palavra}</span>
                  <b>{item.total}</b>
                </small>
              ))}
            </div>
          </article>
        </section>

        <section className={styles.conversionSection} aria-label="Taxa de conversão">
          <article className={styles.kpiCard}>
            <span>Taxa de conversão</span>
            <strong>
              {loadingTaxaConversao ? 'Carregando...' : `${taxaMesAtual?.taxa_conversao ?? 0}%`}
            </strong>
            {taxaMesAtual && (
              <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px' }}>
                {taxaMesAtual.visitantes_unicos} visitantes | {taxaMesAtual.pedidos_confirmados} pedidos
              </small>
            )}
          </article>
          <article className={styles.kpiCard}>
            <span>Visitantes únicos (mês)</span>
            <strong>
              {loadingTaxaConversao ? 'Carregando...' : taxaMesAtual?.visitantes_unicos ?? 0}
            </strong>
            {taxaMesAtual && (
              <small style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px' }}>
                IPs únicos que visitaram home
              </small>
            )}
          </article>
          <article className={styles.chartBlock}>
            <h2>Taxa de conversão por mês</h2>
            <div className={styles.chartCanvas}>
              {loadingTaxaConversao ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  Carregando dados...
                </div>
              ) : (
                <Line
                  data={conversionRateData}
                  options={{
                    ...commonOptions,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false } },
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` },
                        grid: { color: chartColors.grid },
                      },
                    },
                  }}
                />
              )}
            </div>
          </article>
        </section>

        <section className={styles.dashboardGrid}>
          <article className={`${styles.chartBlock} ${styles.wide}`}>
            <h2>Faturamento ao longo do tempo</h2>
            <div className={`${styles.chartCanvas} ${styles.revenueChartCanvas}`}>
              <Line
                data={revenueData}
                options={{
                  ...commonOptions,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      min: 0,
                      max: 26000,
                      ticks: { callback: (value) => `R$ ${value}` },
                      grid: { color: chartColors.grid },
                    },
                  },
                }}
                plugins={[revenueCandlesPlugin]}
              />
            </div>
          </article>

          <article className={styles.chartBlock}>
            <h2>Funil de conversao</h2>
            <div className={styles.chartCanvas}>
              <Doughnut data={funnelData} options={commonOptions} />
            </div>
          </article>

          <article className={`${styles.chartBlock} ${styles.productChart}`}>
            <h2>Produtos mais vendidos</h2>
            <div className={styles.chartCanvas}>
              <Bar
                data={productData}
                options={{
                  ...commonOptions,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 12, minRotation: 12 } },
                    y: { beginAtZero: true, grid: { color: chartColors.grid } },
                  },
                }}
                plugins={[towerBarsPlugin]}
              />
            </div>
          </article>

          <article className={`${styles.chartBlock} ${styles.wide}`}>
            <h2>Taxa de conversão por mês</h2>
            <div className={styles.chartCanvas}>
              {loadingTaxaConversao ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  Carregando dados...
                </div>
              ) : (
                <Line
                  data={conversionRateData}
                  options={{
                    ...commonOptions,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: { display: false } },
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { callback: (value) => `${value}%` },
                        grid: { color: chartColors.grid },
                      },
                    },
                  }}
                  plugins={[cableCarPointsPlugin]}
                />
              )}
            </div>
          </article>

          <article className={styles.chartBlock}>
            <h2>Satisfacao</h2>
            <div className={styles.chartCanvas}>
              <Radar
                data={satisfactionData}
                options={{
                  ...commonOptions,
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      min: 0,
                      max: 1,
                      ticks: { stepSize: 0.2, backdropColor: 'transparent' },
                      grid: { color: chartColors.grid },
                      angleLines: { color: chartColors.grid },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={styles.accuracyCard}>
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
    </main>
  );
}

export default AdminDashboard;
