import { useEffect, useMemo, useState, useRef } from 'react';
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
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  FiBarChart2, FiCreditCard, FiDownload, FiDollarSign,
  FiGrid, FiPackage, FiPieChart, FiTarget, FiTrendingUp, FiCalendar, FiTruck,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);
import { getAuthUser } from '../services/api';
import AdminSidebar from '../components/AdminSidebar';
import {
  obterResumoFaturamento,
  obterFaturamentoPorCategoria,
  obterTopProdutos,
  obterComparativoAnual,
  obterMetaRealizado,
  obterFaturamentoPorMetodoPagamento,
} from '../services/faturamentoCompleto';
import styles from './FaturamentoCompleto.module.css';

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Tooltip,
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
  red: '#e74c3c',
  orange: '#f39c12',
  green: '#27ae60',
  purple: '#8e44ad',
  pink: '#e91e63',
};

const paymentColors = {
  whatsapp: '#25D366',
  pix: '#08936f',
  cartao: '#5366aa',
  dinheiro: '#f39c12',
  boleto: '#8e44ad',
  outro: '#536073',
};

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getCurrentDateStr() {
  return new Date().toLocaleDateString('pt-BR');
}

function getCurrentDateTimeStr() {
  return new Date().toLocaleString('pt-BR');
}

function FaturamentoCompleto() {
  const navigate = useNavigate();
  const chartRef = useRef(null);

  const [resumo, setResumo] = useState(null);
  const [porCategoria, setPorCategoria] = useState(null);
  const [topProdutos, setTopProdutos] = useState([]);
  const [comparativo, setComparativo] = useState(null);
  const [metaRealizado, setMetaRealizado] = useState(null);
  const [porMetodo, setPorMetodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao-geral');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const [
          resumoData, categoriaData, topData, compData, metaData, metodoData,
        ] = await Promise.all([
          obterResumoFaturamento(),
          obterFaturamentoPorCategoria(),
          obterTopProdutos(10),
          obterComparativoAnual(),
          obterMetaRealizado(),
          obterFaturamentoPorMetodoPagamento(),
        ]);
        if (mounted) {
          setResumo(resumoData);
          setPorCategoria(categoriaData);
          setTopProdutos(topData);
          setComparativo(compData);
          setMetaRealizado(metaData);
          setPorMetodo(metodoData);
        }
      } catch (err) {
        console.error('Erro ao carregar faturamento completo:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const comparativoChartData = useMemo(() => {
    if (!comparativo?.meses) return { labels: [], datasets: [] };
    const [ano1, ano2] = comparativo.anos || [];
    return {
      labels: comparativo.meses.map(m => m.mes),
      datasets: [
        {
          label: String(ano1),
          data: comparativo.meses.map(m => m[`ano${ano1}`]),
          backgroundColor: chartColors.blue,
          borderRadius: 6,
        },
        {
          label: String(ano2),
          data: comparativo.meses.map(m => m[`ano${ano2}`]),
          backgroundColor: chartColors.teal,
          borderRadius: 6,
        },
      ],
    };
  }, [comparativo]);

  const categoriaChartData = useMemo(() => {
    if (!porCategoria?.categorias) return { labels: [], datasets: [] };
    const cores = [chartColors.blue, chartColors.teal, chartColors.gold, chartColors.sky, chartColors.orange, chartColors.purple, chartColors.red, chartColors.slate];
    return {
      labels: porCategoria.categorias.map(c => c.categoria),
      datasets: [{
        data: porCategoria.categorias.map(c => c.total),
        backgroundColor: porCategoria.categorias.map((_, i) => cores[i % cores.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
      }],
    };
  }, [porCategoria]);

  const metodoChartData = useMemo(() => {
    if (!porMetodo?.metodos) return { labels: [], datasets: [] };
    return {
      labels: porMetodo.metodos.map(m => m.label),
      datasets: [{
        data: porMetodo.metodos.map(m => m.total),
        backgroundColor: porMetodo.metodos.map(m => paymentColors[m.metodo] || chartColors.slate),
        borderColor: '#ffffff',
        borderWidth: 2,
      }],
    };
  }, [porMetodo]);

  const metaChartData = useMemo(() => {
    if (!metaRealizado?.dias) return { labels: [], datasets: [] };
    return {
      labels: metaRealizado.dias.map(d => `Dia ${d.dia}`),
      datasets: [
        {
          label: 'Faturamento diário',
          data: metaRealizado.dias.map(d => d.valor),
          backgroundColor: chartColors.blue,
          borderRadius: 4,
        },
        {
          label: 'Meta diária',
          data: metaRealizado.dias.map(() => metaRealizado.precisaDiaria),
          backgroundColor: 'rgba(8, 147, 111, 0.3)',
          borderRadius: 4,
        },
      ],
    };
  }, [metaRealizado]);

  const topProdChartData = useMemo(() => {
    if (!topProdutos.length) return { labels: [], datasets: [] };
    return {
      labels: topProdutos.slice(0, 5).map(p => p.nome_produto.length > 20 ? p.nome_produto.substring(0, 20) + '...' : p.nome_produto),
      datasets: [{
        label: 'Faturamento',
        data: topProdutos.slice(0, 5).map(p => p.total),
        backgroundColor: chartColors.teal,
        borderRadius: 6,
      }],
    };
  }, [topProdutos]);

  async function exportToExcel() {
    const ExcelJS = await import('exceljs');
    const Workbook = ExcelJS.Workbook || ExcelJS.default?.Workbook;
    const wb = new Workbook();
    wb.creator = getAuthUser()?.nome || 'Admin';
    wb.created = new Date();

    const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3D4E8F' } };
    const titleFont = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF3D4E8F' } };
    const subtitleFont = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    const moneyFmt = '#,##0.00;(#,##0.00)';
    const pctFmt = '0.00%';

    function addTitle(ws, title, subtitle) {
      ws.mergeCells('A1', 'F1');
      const cell = ws.getCell('A1');
      cell.value = title;
      cell.font = titleFont;
      if (subtitle) {
        ws.mergeCells('A2', 'F2');
        const sub = ws.getCell('A2');
        sub.value = subtitle;
        sub.font = subtitleFont;
      }
    }

    function styleHeader(row) {
      row.eachCell(c => {
        c.font = headerFont;
        c.fill = headerFill;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    }

    function styleBody(ws, startRow, endRow, colCount) {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = 1; c <= colCount; c++) {
          const cell = ws.getCell(r, c);
          cell.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
          };
          cell.alignment = { vertical: 'middle' };
        }
      }
    }

    // Sheet 1: Dashboard / Resumo
    const wsDash = wb.addWorksheet('Dashboard');
    addTitle(wsDash, 'Dashboard de Faturamento', `Gerado em ${getCurrentDateTimeStr()}`);

    const dashHeaders = ['Indicador', 'Valor', 'Detalhes'];
    const dashRow = wsDash.getRow(4);
    dashHeaders.forEach((h, i) => { dashRow.getCell(i + 1).value = h; });
    styleHeader(dashRow);

    const dashData = [
      ['Faturamento Hoje', formatCurrency(resumo?.hoje?.faturamento), `${resumo?.hoje?.pedidos || 0} pedidos | Ticket: ${formatCurrency(resumo?.hoje?.ticketMedio)}`],
      ['Faturamento Ontem', formatCurrency(resumo?.ontem?.faturamento), `${resumo?.ontem?.pedidos || 0} pedidos`],
      ['Faturamento Semana', formatCurrency(resumo?.semana?.faturamento), 'Últimos 7 dias'],
      ['Faturamento Mês Atual', formatCurrency(resumo?.mes?.faturamento), `${resumo?.mes?.pedidos || 0} pedidos | Ticket: ${formatCurrency(resumo?.mes?.ticketMedio)}`],
      ['Faturamento Mês Passado', formatCurrency(resumo?.mesPassado?.faturamento), 'Período anterior'],
      ['Fretes Mês Atual', formatCurrency(resumo?.frete?.mes), `Total geral: ${formatCurrency(resumo?.frete?.total)}`],
      ['Meta do Mês', formatCurrency(metaRealizado?.meta), `Realizado: ${metaRealizado?.percentual || 0}%`],
      ['Projetado', formatCurrency(metaRealizado?.projetado), `Média diária: ${formatCurrency(metaRealizado?.mediaDiaria)}`],
    ];
    dashData.forEach((row, i) => {
      const r = wsDash.getRow(5 + i);
      r.getCell(1).value = row[0];
      r.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
      r.getCell(2).value = row[1];
      r.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: 'FF08936F' } };
      r.getCell(3).value = row[2];
      r.getCell(3).font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    });
    styleBody(wsDash, 5, 4 + dashData.length, 3);
    wsDash.getColumn(1).width = 28;
    wsDash.getColumn(2).width = 22;
    wsDash.getColumn(3).width = 38;

    // Sheet 2: Top Produtos
    if (topProdutos.length) {
      const wsProd = wb.addWorksheet('Top Produtos');
      addTitle(wsProd, 'Top Produtos', 'Produtos que mais geraram receita');
      const prodHeaders = ['#', 'Produto', 'Qtd Vendida', 'Pedidos', 'Faturamento'];
      const prodRow = wsProd.getRow(4);
      prodHeaders.forEach((h, i) => { prodRow.getCell(i + 1).value = h; });
      styleHeader(prodRow);
      topProdutos.forEach((p, i) => {
        const r = wsProd.getRow(5 + i);
        r.getCell(1).value = i + 1;
        r.getCell(1).alignment = { horizontal: 'center' };
        r.getCell(2).value = p.nome_produto;
        r.getCell(3).value = p.quantidade_vendida;
        r.getCell(3).alignment = { horizontal: 'center' };
        r.getCell(4).value = p.pedidos;
        r.getCell(4).alignment = { horizontal: 'center' };
        r.getCell(5).value = p.total;
        r.getCell(5).numFmt = moneyFmt;
        r.getCell(5).font = { bold: true, name: 'Calibri', size: 10 };
      });
      styleBody(wsProd, 5, 4 + topProdutos.length, 5);
      wsProd.getColumn(1).width = 6;
      wsProd.getColumn(2).width = 40;
      wsProd.getColumn(3).width = 14;
      wsProd.getColumn(4).width = 12;
      wsProd.getColumn(5).width = 18;
    }

    // Sheet 3: Por Categoria
    if (porCategoria?.categorias?.length) {
      const wsCat = wb.addWorksheet('Por Categoria');
      addTitle(wsCat, 'Faturamento por Categoria', `Total: ${formatCurrency(porCategoria.totalGeral)}`);
      const catHeaders = ['Categoria', 'Qtd Vendida', 'Faturamento', '%'];
      const catRow = wsCat.getRow(4);
      catHeaders.forEach((h, i) => { catRow.getCell(i + 1).value = h; });
      styleHeader(catRow);
      porCategoria.categorias.forEach((c, i) => {
        const r = wsCat.getRow(5 + i);
        r.getCell(1).value = c.categoria;
        r.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
        r.getCell(2).value = c.quantidade;
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(3).value = c.total;
        r.getCell(3).numFmt = moneyFmt;
        r.getCell(4).value = c.percentual / 100;
        r.getCell(4).numFmt = pctFmt;
        r.getCell(4).alignment = { horizontal: 'center' };
      });
      styleBody(wsCat, 5, 4 + porCategoria.categorias.length, 4);
      wsCat.getColumn(1).width = 30;
      wsCat.getColumn(2).width = 14;
      wsCat.getColumn(3).width = 18;
      wsCat.getColumn(4).width = 12;
    }

    // Sheet 4: Forma de Pagamento
    if (porMetodo?.metodos?.length) {
      const wsMet = wb.addWorksheet('Forma Pagamento');
      addTitle(wsMet, 'Faturamento por Forma de Pagamento', `Total: ${formatCurrency(porMetodo.totalGeral)}`);
      const metHeaders = ['Método', 'Qtd', 'Faturamento', '%'];
      const metRow = wsMet.getRow(4);
      metHeaders.forEach((h, i) => { metRow.getCell(i + 1).value = h; });
      styleHeader(metRow);
      porMetodo.metodos.forEach((m, i) => {
        const r = wsMet.getRow(5 + i);
        r.getCell(1).value = m.label;
        r.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
        r.getCell(2).value = m.quantidade;
        r.getCell(2).alignment = { horizontal: 'center' };
        r.getCell(3).value = m.total;
        r.getCell(3).numFmt = moneyFmt;
        r.getCell(4).value = m.percentual / 100;
        r.getCell(4).numFmt = pctFmt;
        r.getCell(4).alignment = { horizontal: 'center' };
      });
      styleBody(wsMet, 5, 4 + porMetodo.metodos.length, 4);
      wsMet.getColumn(1).width = 22;
      wsMet.getColumn(2).width = 10;
      wsMet.getColumn(3).width = 18;
      wsMet.getColumn(4).width = 12;
    }

    // Sheet 5: Comparativo Anual
    if (comparativo?.meses?.length) {
      const wsComp = wb.addWorksheet('Comparativo Anual');
      const anos = comparativo.anos || [];
      addTitle(wsComp, 'Comparativo Anual', `${anos[0] || 'Ano anterior'} vs ${anos[1] || 'Ano atual'} | Variação: ${comparativo.variacao >= 0 ? '+' : ''}${comparativo.variacao}%`);
      const compHeaders = ['Mês', ...anos.map(a => `Ano ${a}`)];
      const compRow = wsComp.getRow(4);
      compHeaders.forEach((h, i) => { compRow.getCell(i + 1).value = h; });
      styleHeader(compRow);
      comparativo.meses.forEach((m, i) => {
        const r = wsComp.getRow(5 + i);
        r.getCell(1).value = m.mes;
        r.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
        anos.forEach((ano, j) => {
          const cell = r.getCell(2 + j);
          cell.value = m[`ano${ano}`];
          cell.numFmt = moneyFmt;
        });
      });
      const totalRowNum = 5 + comparativo.meses.length;
      const totalRow = wsComp.getRow(totalRowNum);
      totalRow.getCell(1).value = 'TOTAL';
      totalRow.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
      totalRow.eachCell(c => { c.font = { bold: true, name: 'Calibri', size: 10 }; });
      anos.forEach((ano, j) => {
        const cell = totalRow.getCell(2 + j);
        cell.value = comparativo.totais?.[`ano${ano}`] || 0;
        cell.numFmt = moneyFmt;
      });
      styleBody(wsComp, 5, totalRowNum, 1 + anos.length);
      wsComp.getColumn(1).width = 10;
      anos.forEach((_, j) => { wsComp.getColumn(2 + j).width = 18; });
    }

    const buf = await wb.xlsx.writeBuffer();
    downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'faturamento-completo.xlsx');
  }

  function exportToPDF() {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;

    const user = getAuthUser();

    // --- Header with logo and title ---
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', margin, 8, 28, 10);
      } catch (_) { /* silently ignore if image fails */ }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(61, 78, 143);
    doc.text('RELATÓRIO DE FATURAMENTO', pageW / 2, 13, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${getCurrentDateTimeStr()}`, pageW / 2, 19, { align: 'center' });

    let y = 26;

    // --- Resumo ---
    if (resumo) {
      doc.setDrawColor(61, 78, 143);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(61, 78, 143);
      doc.text('RESUMO', margin, y + 5);
      y += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      const resumoItems = [
        { label: 'Hoje', value: formatCurrency(resumo.hoje?.faturamento), detail: `${resumo.hoje?.pedidos || 0} pedidos | Ticket: ${formatCurrency(resumo.hoje?.ticketMedio)}` },
        { label: 'Ontem', value: formatCurrency(resumo.ontem?.faturamento), detail: `${resumo.ontem?.pedidos || 0} pedidos` },
        { label: 'Semana', value: formatCurrency(resumo.semana?.faturamento), detail: 'Últimos 7 dias' },
        { label: 'Mês Atual', value: formatCurrency(resumo.mes?.faturamento), detail: `${resumo.mes?.pedidos || 0} pedidos | Ticket: ${formatCurrency(resumo.mes?.ticketMedio)}` },
        { label: 'Mês Passado', value: formatCurrency(resumo.mesPassado?.faturamento), detail: 'Período anterior' },
        { label: 'Fretes', value: formatCurrency(resumo.frete?.mes), detail: `Total geral: ${formatCurrency(resumo.frete?.total)}` },
      ];

      const colW = (pageW - 2 * margin) / resumoItems.length;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      resumoItems.forEach((item, i) => {
        const x = margin + i * colW;
        doc.setTextColor(61, 78, 143);
        doc.text(item.label, x + colW / 2, y, { align: 'center' });
        doc.setTextColor(8, 147, 111);
        doc.setFontSize(9);
        doc.text(item.value, x + colW / 2, y + 4, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(item.detail, x + colW / 2, y + 8, { align: 'center' });
        doc.setFont('helvetica', 'bold');
      });
      y += 14;

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    }

    // --- Top Produtos ---
    if (topProdutos.length) {
      const topRows = topProdutos.slice(0, 10).map(p => [p.nome_produto, String(p.quantidade_vendida), `R$ ${p.total.toFixed(2)}`]);
      doc.autoTable({
        startY: y,
        head: [['Produto', 'Qtd Vendida', 'Faturamento']],
        body: topRows,
        theme: 'grid',
        headStyles: { fillColor: [61, 78, 143], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 30 } },
        didParseCell(data) {
          if (data.section === 'head') {
            data.cell.styles.halign = 'center';
          }
        },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // --- Por Categoria ---
    if (porCategoria?.categorias?.length) {
      if (y + 30 > pageH - 20) {
        doc.addPage();
        y = 15;
      }
      const catRows = porCategoria.categorias.map(c => [c.categoria, String(c.quantidade), `R$ ${c.total.toFixed(2)}`, `${c.percentual}%`]);
      doc.autoTable({
        startY: y,
        head: [['Categoria', 'Qtd', 'Faturamento', '%']],
        body: catRows,
        theme: 'grid',
        headStyles: { fillColor: [61, 78, 143], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 28 }, 3: { halign: 'center', cellWidth: 16 } },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // --- Por Método de Pagamento ---
    if (porMetodo?.metodos?.length) {
      if (y + 30 > pageH - 20) {
        doc.addPage();
        y = 15;
      }
      const metRows = porMetodo.metodos.map(m => [m.label, String(m.quantidade), `R$ ${m.total.toFixed(2)}`, `${m.percentual}%`]);
      doc.autoTable({
        startY: y,
        head: [['Método', 'Qtd', 'Total', '%']],
        body: metRows,
        theme: 'grid',
        headStyles: { fillColor: [61, 78, 143], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 28 }, 3: { halign: 'center', cellWidth: 16 } },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // --- Comparativo Anual ---
    if (comparativo?.meses?.length) {
      if (y + 30 > pageH - 20) {
        doc.addPage();
        y = 15;
      }
      const anos = comparativo.anos || [];
      const compHeaders = ['Mês', ...anos.map(a => `Ano ${a}`)];
      const compRows = comparativo.meses.map(m => {
        const row = [m.mes];
        anos.forEach(a => row.push(`R$ ${m[`ano${a}`].toFixed(2)}`));
        return row;
      });
      const totalRow = ['TOTAL'];
      anos.forEach(a => totalRow.push(`R$ ${(comparativo.totais?.[`ano${a}`] || 0).toFixed(2)}`));
      compRows.push(totalRow);

      doc.autoTable({
        startY: y,
        head: [compHeaders],
        body: compRows,
        theme: 'grid',
        headStyles: { fillColor: [61, 78, 143], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 20 } },
        foot: [[`Variação: ${comparativo.variacao >= 0 ? '+' : ''}${comparativo.variacao}%`, '', '', '']],
        footStyles: { fillColor: [240, 240, 240], fontSize: 7, fontStyle: 'bold' },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // --- Meta x Realizado ---
    if (metaRealizado) {
      if (y + 30 > pageH - 30) {
        doc.addPage();
        y = 15;
      }
      const metaRows = [
        ['Meta do Mês', formatCurrency(metaRealizado.meta)],
        ['Realizado', formatCurrency(metaRealizado.realizado)],
        ['Progresso', `${metaRealizado.percentual}%`],
        ['Projetado', formatCurrency(metaRealizado.projetado)],
        ['Valor Restante', formatCurrency(metaRealizado.valorRestante)],
        ['Média Diária', formatCurrency(metaRealizado.mediaDiaria)],
      ];
      doc.autoTable({
        startY: y,
        head: [['Indicador', 'Valor']],
        body: metaRows,
        theme: 'grid',
        headStyles: { fillColor: [61, 78, 143], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 60 }, 1: { halign: 'right', cellWidth: 40 } },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // --- Footer with user info ---
    const footerY = pageH - 10;
    doc.setDrawColor(61, 78, 143);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageW - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    let footerText = `Emitido por: ${user?.nome || 'Usuário não identificado'}`;
    if (user?.email) footerText += ` | Email: ${user.email}`;
    if (user?.tipo_usuario) footerText += ` | Perfil: ${user.tipo_usuario}`;
    doc.text(footerText, margin, footerY);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(156, 163, 175);
    doc.text(`Documento gerado em ${getCurrentDateTimeStr()} - Tres Pescadores Admin`, margin, footerY + 4);

    doc.save('faturamento-completo.pdf');
  }

  const sidebarItems = [
    { id: 'visao-geral', label: 'Visão Geral', icon: FiGrid },
    { id: 'comparativo', label: 'Comparativo Anual', icon: FiBarChart2 },
    { id: 'meta', label: 'Meta x Realizado', icon: FiTarget },
    { id: 'categorias', label: 'Por Categoria', icon: FiPieChart },
    { id: 'produtos', label: 'Top Produtos', icon: FiPackage },
    { id: 'pagamento', label: 'Forma Pagamento', icon: FiCreditCard },
  ];

  return (
    <div className={styles.container}>
      <AdminSidebar />

      <div className={styles.mainArea}>
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <p className={styles.breadcrumb}>Painel / Faturamento Completo</p>
            <h1>Faturamento Completo</h1>
            <div className={styles.subtitle}>Análise detalhada de receitas, metas e indicadores financeiros.</div>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.btn} ${styles.btnGreenLight}`} onClick={exportToExcel}>
              <FiDownload /> Excel
            </button>
            <button className={`${styles.btn} ${styles.btnBlue}`} onClick={exportToPDF}>
              <FiDownload /> PDF
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.tabBar}>
            {sidebarItems.map(item => (
              <button
                key={item.id}
                className={`${styles.tabButton} ${activeTab === item.id ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon /> {item.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className={styles.loadingState}>Carregando dados de faturamento...</div>
          ) : (
            <>
              {activeTab === 'visao-geral' && (
                <>
                  <section className={styles.kpiGrid} aria-label="Indicadores de faturamento">
                    <article className={`${styles.kpiCard} ${styles.kpiToday}`}>
                      <FiDollarSign className={styles.kpiIcon} />
                      <span>Faturamento hoje</span>
                      <strong>{formatCurrency(resumo?.hoje?.faturamento)}</strong>
                      <small>{resumo?.hoje?.pedidos || 0} pedidos | Ticket médio: {formatCurrency(resumo?.hoje?.ticketMedio)}</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiYesterday}`}>
                      <FiCalendar className={styles.kpiIcon} />
                      <span>Faturamento ontem</span>
                      <strong>{formatCurrency(resumo?.ontem?.faturamento)}</strong>
                      <small>{resumo?.ontem?.pedidos || 0} pedidos</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiWeek}`}>
                      <FiTrendingUp className={styles.kpiIcon} />
                      <span>Faturamento semana</span>
                      <strong>{formatCurrency(resumo?.semana?.faturamento)}</strong>
                      <small>últimos 7 dias</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiMonth}`}>
                      <FiDollarSign className={styles.kpiIcon} />
                      <span>Faturamento mês atual</span>
                      <strong>{formatCurrency(resumo?.mes?.faturamento)}</strong>
                      <small>{resumo?.mes?.pedidos || 0} pedidos | Ticket: {formatCurrency(resumo?.mes?.ticketMedio)}</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiLastMonth}`}>
                      <FiCalendar className={styles.kpiIcon} />
                      <span>Faturamento mês passado</span>
                      <strong>{formatCurrency(resumo?.mesPassado?.faturamento)}</strong>
                      <small>período anterior</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiShipping}`}>
                      <FiTruck className={styles.kpiIcon} />
                      <span>Fretes mês atual</span>
                      <strong>{formatCurrency(resumo?.frete?.mes)}</strong>
                      <small>Total geral: {formatCurrency(resumo?.frete?.total)}</small>
                    </article>
                    <article className={`${styles.kpiCard} ${styles.kpiPayment}`}>
                      <FiCreditCard className={styles.kpiIcon} />
                      <span>Formas de pagamento</span>
                      <strong>{porMetodo?.metodos?.length || 0}</strong>
                      <small>métodos ativos</small>
                    </article>
                  </section>

                  <section className={styles.chartsRow}>
                    <article className={styles.chartBlock}>
                      <h2><FiPieChart /> Faturamento por Categoria</h2>
                      <div className={styles.chartCanvas}>
                        <Doughnut
                          data={categoriaChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: { boxWidth: 12, color: '#5a5a5a', font: { size: 10 } },
                              },
                            },
                          }}
                        />
                      </div>
                    </article>
                    <article className={styles.chartBlock}>
                      <h2><FiCreditCard /> Forma de Pagamento</h2>
                      <div className={styles.chartCanvas}>
                        <Doughnut
                          data={metodoChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'right',
                                labels: { boxWidth: 12, color: '#5a5a5a', font: { size: 10 } },
                              },
                            },
                          }}
                        />
                      </div>
                    </article>
                  </section>

                  <section className={styles.topProductsPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2><FiPackage /> Top Produtos</h2>
                        <p className={styles.hint}>Os 10 produtos que mais geraram receita</p>
                      </div>
                    </div>
                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Produto</th>
                            <th>Qtd Vendida</th>
                            <th>Pedidos</th>
                            <th>Faturamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topProdutos.map((p, i) => (
                            <tr key={p.id_produto} className={styles.tableBodyRow}>
                              <td className={styles.rankCell}>
                                <span className={`${styles.rankBadge} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</span>
                              </td>
                              <td data-label="Produto">{p.nome_produto}</td>
                              <td data-label="Qtd">{formatNumber(p.quantidade_vendida)}</td>
                              <td data-label="Pedidos">{formatNumber(p.pedidos)}</td>
                              <td data-label="Faturamento"><strong>{formatCurrency(p.total)}</strong></td>
                            </tr>
                          ))}
                          {topProdutos.length === 0 && (
                            <tr><td colSpan="5" className={styles.emptyState}>Nenhum dado disponível.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'comparativo' && (
                <section className={styles.fullPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2><FiBarChart2 /> Comparativo Anual</h2>
                      <p className={styles.hint}>
                        {comparativo?.anos ? `${comparativo.anos[0]} vs ${comparativo.anos[1]}` : 'Carregando...'}
                      </p>
                    </div>
                    {comparativo && (
                      <div className={`${styles.variacaoBadge} ${comparativo.variacao >= 0 ? styles.variacaoPos : styles.variacaoNeg}`}>
                        {comparativo.variacao >= 0 ? '+' : ''}{comparativo.variacao}% vs ano anterior
                      </div>
                    )}
                  </div>
                  <div className={styles.comparativoResumo}>
                    {comparativo?.totais && comparativo?.anos && (
                      <>
                        <div className={styles.comparativoCard}>
                          <span>{comparativo.anos[0]}</span>
                          <strong>{formatCurrency(comparativo.totais[`ano${comparativo.anos[0]}`])}</strong>
                        </div>
                        <div className={styles.comparativoCard}>
                          <span>{comparativo.anos[1]}</span>
                          <strong>{formatCurrency(comparativo.totais[`ano${comparativo.anos[1]}`])}</strong>
                        </div>
                      </>
                    )}
                  </div>
                  <div className={styles.chartLarge}>
                    <Bar
                      data={comparativoChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: { boxWidth: 14, color: '#5a5a5a', font: { size: 11 } },
                          },
                        },
                        scales: {
                          x: { grid: { display: false } },
                          y: {
                            beginAtZero: true,
                            ticks: { callback: (v) => `R$ ${v}` },
                            grid: { color: 'rgba(16, 24, 44, 0.08)' },
                          },
                        },
                      }}
                    />
                  </div>
                </section>
              )}

              {activeTab === 'meta' && (
                <section className={styles.fullPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2><FiTarget /> Meta x Realizado</h2>
                      <p className={styles.hint}>Acompanhamento da meta mensal de faturamento</p>
                    </div>
                  </div>

                  {metaRealizado && (
                    <>
                      <div className={styles.metaCards}>
                        <div className={styles.metaCard}>
                          <span>Meta do mês</span>
                          <strong>{formatCurrency(metaRealizado.meta)}</strong>
                        </div>
                        <div className={styles.metaCard}>
                          <span>Realizado</span>
                          <strong>{formatCurrency(metaRealizado.realizado)}</strong>
                        </div>
                        <div className={styles.metaCard}>
                          <span>Projetado</span>
                          <strong>{formatCurrency(metaRealizado.projetado)}</strong>
                        </div>
                        <div className={styles.metaCard}>
                          <span>Faltam</span>
                          <strong>{formatCurrency(metaRealizado.valorRestante)}</strong>
                        </div>
                        <div className={styles.metaCard}>
                          <span>Média diária</span>
                          <strong>{formatCurrency(metaRealizado.mediaDiaria)}</strong>
                        </div>
                        <div className={styles.metaCard}>
                          <span>Precisão diária</span>
                          <strong>{formatCurrency(metaRealizado.precisaDiaria)}</strong>
                        </div>
                      </div>

                      <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                          <span>Progresso ({metaRealizado.diaAtual} de {metaRealizado.diasNoMes} dias)</span>
                          <strong>{metaRealizado.percentual}%</strong>
                        </div>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${Math.min(metaRealizado.percentual, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className={styles.chartLarge}>
                        <Bar
                          data={metaChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                labels: { boxWidth: 14, color: '#5a5a5a', font: { size: 11 } },
                              },
                            },
                            scales: {
                              x: { grid: { display: false } },
                              y: {
                                beginAtZero: true,
                                ticks: { callback: (v) => `R$ ${v}` },
                                grid: { color: 'rgba(16, 24, 44, 0.08)' },
                              },
                            },
                          }}
                        />
                      </div>

                      <div className={styles.tableContainer}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Dia</th>
                              <th>Faturamento</th>
                              <th>% da Meta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metaRealizado.dias.map(d => (
                              <tr key={d.dia} className={styles.tableBodyRow}>
                                <td data-label="Dia">Dia {d.dia}</td>
                                <td data-label="Faturamento">{formatCurrency(d.valor)}</td>
                                <td data-label="%">
                                  <span className={metaRealizado.meta > 0 && (d.valor / (metaRealizado.meta / metaRealizado.diasNoMes)) >= 1 ? styles.percPos : styles.percNeg}>
                                    {metaRealizado.meta > 0 ? ((d.valor / (metaRealizado.meta / metaRealizado.diasNoMes)) * 100).toFixed(1) : 0}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              )}

              {activeTab === 'categorias' && (
                <section className={styles.fullPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2><FiPieChart /> Faturamento por Categoria</h2>
                      <p className={styles.hint}>Distribuição da receita entre categorias de produtos</p>
                    </div>
                    <div className={styles.totalBadge}>
                      Total: {formatCurrency(porCategoria?.totalGeral)}
                    </div>
                  </div>

                  <div className={styles.chartsRow}>
                    <article className={styles.chartBlock}>
                      <div className={styles.chartCanvas}>
                        <Doughnut
                          data={categoriaChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'right', labels: { boxWidth: 12, color: '#5a5a5a', font: { size: 10 } } },
                            },
                          }}
                        />
                      </div>
                    </article>
                    <article className={styles.chartBlock}>
                      <div className={styles.tableContainer}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Categoria</th>
                              <th>Qtd</th>
                              <th>Faturamento</th>
                              <th>%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porCategoria?.categorias?.map(c => (
                              <tr key={c.id_categoria} className={styles.tableBodyRow}>
                                <td data-label="Categoria">{c.categoria}</td>
                                <td data-label="Qtd">{formatNumber(c.quantidade)}</td>
                                <td data-label="Faturamento"><strong>{formatCurrency(c.total)}</strong></td>
                                <td data-label="%">
                                  <div className={styles.percBar}>
                                    <div className={styles.percFill} style={{ width: `${c.percentual}%` }} />
                                    <span>{c.percentual}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                </section>
              )}

              {activeTab === 'produtos' && (
                <section className={styles.fullPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2><FiPackage /> Top Produtos</h2>
                      <p className={styles.hint}>Produtos que mais geraram receita</p>
                    </div>
                  </div>

                  <div className={styles.chartsRow}>
                    <article className={styles.chartBlock}>
                      <div className={styles.chartCanvas}>
                        <Bar
                          data={topProdChartData}
                          options={{
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: {
                                beginAtZero: true,
                                ticks: { callback: (v) => `R$ ${v}` },
                                grid: { color: 'rgba(16, 24, 44, 0.08)' },
                              },
                              y: { grid: { display: false } },
                            },
                          }}
                        />
                      </div>
                    </article>
                  </div>

                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Produto</th>
                          <th>Qtd Vendida</th>
                          <th>Pedidos</th>
                          <th>Faturamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProdutos.map((p, i) => (
                          <tr key={p.id_produto} className={styles.tableBodyRow}>
                            <td className={styles.rankCell}>
                              <span className={`${styles.rankBadge} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</span>
                            </td>
                            <td data-label="Produto">{p.nome_produto}</td>
                            <td data-label="Qtd">{formatNumber(p.quantidade_vendida)}</td>
                            <td data-label="Pedidos">{formatNumber(p.pedidos)}</td>
                            <td data-label="Faturamento"><strong>{formatCurrency(p.total)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'pagamento' && (
                <section className={styles.fullPanel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2><FiCreditCard /> Faturamento por Forma de Pagamento</h2>
                      <p className={styles.hint}>Distribuição da receita por método de pagamento</p>
                    </div>
                    <div className={styles.totalBadge}>
                      Total: {formatCurrency(porMetodo?.totalGeral)}
                    </div>
                  </div>

                  <div className={styles.chartsRow}>
                    <article className={styles.chartBlock}>
                      <div className={styles.chartCanvas}>
                        <Doughnut
                          data={metodoChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'right', labels: { boxWidth: 12, color: '#5a5a5a', font: { size: 10 } } },
                            },
                          }}
                        />
                      </div>
                    </article>
                    <article className={styles.chartBlock}>
                      <div className={styles.tableContainer}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Método</th>
                              <th>Qtd</th>
                              <th>Faturamento</th>
                              <th>%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porMetodo?.metodos?.map(m => (
                              <tr key={m.metodo} className={styles.tableBodyRow}>
                                <td data-label="Método">
                                  <span className={styles.metodoBadge} style={{ backgroundColor: (paymentColors[m.metodo] || '#536073') + '22', color: paymentColors[m.metodo] || '#536073' }}>
                                    {m.label}
                                  </span>
                                </td>
                                <td data-label="Qtd">{formatNumber(m.quantidade)}</td>
                                <td data-label="Faturamento"><strong>{formatCurrency(m.total)}</strong></td>
                                <td data-label="%">
                                  <div className={styles.percBar}>
                                    <div className={styles.percFill} style={{ width: `${m.percentual}%` }} />
                                    <span>{m.percentual}%</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default FaturamentoCompleto;
