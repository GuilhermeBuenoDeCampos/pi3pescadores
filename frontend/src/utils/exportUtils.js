import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const allColumns = [
  { key: 'tipo_usuario', label: 'Tipo', w: 26 },
  { key: 'nome', label: 'Nome', w: 52 },
  { key: 'email', label: 'E-mail', w: 62 },
  { key: 'telefone', label: 'Telefone', w: 34 },
  { key: 'cpf', label: 'CPF', w: 34 },
  { key: 'created_at', label: 'Cadastro', w: 30 },
];

function isEmptyValue(val) {
  return val === null || val === undefined || val === '' || val === '—';
}

function getActiveColumns(users) {
  return allColumns.filter(col => {
    if (col.key === 'tipo_usuario' || col.key === 'nome' || col.key === 'email') return true;
    return users.some(u => !isEmptyValue(u[col.key]));
  });
}

function getColWidths(cols) {
  return cols.map(c => c.w);
}

function maskTelefone(val) {
  if (!val) return '—';
  const nums = val.replace(/\D/g, '');
  if (nums.length === 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  if (nums.length === 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  if (nums.length > 6) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6, 10)}`;
  if (nums.length > 2) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length > 0) return `(${nums}`;
  return val;
}

function maskCpf(val) {
  if (!val) return '—';
  const nums = val.replace(/\D/g, '');
  if (nums.length === 11) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  if (nums.length > 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  if (nums.length > 6) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  if (nums.length > 3) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  return nums;
}

function mapRow(user, cols) {
  const tipoMap = { admin: 'Admin', cliente: 'Cliente', funcionario: 'Funcionário' };
  const row = {
    tipo_usuario: tipoMap[user.tipo_usuario] || user.tipo_usuario,
    nome: user.nome,
    email: user.email,
  };
  cols.forEach(c => {
    if (!row.hasOwnProperty(c.key)) {
      if (c.key === 'telefone') row.telefone = maskTelefone(user.telefone);
      else if (c.key === 'cpf') row.cpf = maskCpf(user.cpf);
      else if (c.key === 'created_at') row.created_at = formatDate(user.created_at);
    }
  });
  return row;
}

export function exportToXLSX(users, filename = 'usuarios.xlsx') {
  const cols = getActiveColumns(users);
  const data = users.map(u => mapRow(u, cols));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export function exportToPDF(users, filename = 'usuarios.pdf', options = {}) {
  const { logoBase64, userName, userType } = options;
  const cols = getActiveColumns(users);
  const colW = getColWidths(cols);
  const data = users.map(u => mapRow(u, cols));
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const rowH = 7;
  const marginX = 10;
  const headerH = 8;
  const topY = 36;
  const bottomMargin = 10;
  const footerY = pageH - 12;
  const maxY = pageH - bottomMargin;
  let y = topY;
  let pageStartY = topY;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', marginX, 6, 14, 14);
    doc.setFont('Comic Sans MS', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('3 Pescadores Store', marginX + 7, 24, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(61, 78, 143);
  doc.text('RELATÓRIO DE USUÁRIOS', pageW / 2, 13, { align: 'center' });

  function drawFooter() {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const now = new Date().toLocaleString('pt-BR');
    let footerText = `Gerado em: ${now}  |  Total: ${users.length} usuário${users.length !== 1 ? 's' : ''}`;
    if (userName && userType) {
      const tipoMap = { admin: 'Admin', funcionario: 'Funcionário', cliente: 'Cliente' };
      footerText += `  |  ${userName} (${tipoMap[userType] || userType})`;
    }
    doc.text(footerText, marginX, footerY);
  }

  function newPage() {
    drawGrid(pageStartY, y);
    drawFooter();
    doc.addPage();
    y = topY;
    pageStartY = topY;
    drawHeader();
    y += headerH;
  }

  const gridWidth = colW.reduce((a, b) => a + b, 0);

  function drawHeader() {
    doc.setFillColor(61, 78, 143);
    doc.roundedRect(marginX, y - headerH + 1, gridWidth, headerH, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let cx = marginX + 1;
    cols.forEach((col, i) => {
      doc.text(col.label, cx + 1, y - 2);
      cx += colW[i];
    });
    doc.setFont('helvetica', 'normal');
  }

  function drawRow(row, isEven) {
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y - rowH + 1, gridWidth, rowH, 'F');
    }
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(7.5);
    let cx = marginX + 1;
    cols.forEach((col, i) => {
      const val = String(row[col.key] ?? '');
      doc.text(val, cx + 1, y - 2);
      cx += colW[i];
    });
    y += rowH;
  }

  function drawGrid(fromY, untilY) {
    doc.setDrawColor(212, 218, 228);
    doc.setLineWidth(0.2);
    const bottomY = untilY - rowH;
    const gridRight = marginX + colW.reduce((a, b) => a + b, 0);
    const gridTop = fromY - 4;
    let cx = marginX;
    for (let i = 0; i <= cols.length; i++) {
      doc.line(cx, gridTop, cx, bottomY);
      cx += colW[i] || 0;
    }
    doc.line(marginX, bottomY, gridRight, bottomY);
  }

  drawHeader();
  y += headerH;

  data.forEach((item, i) => {
    if (y + rowH > maxY) {
      newPage();
    }
    drawRow(item, i % 2 === 0);
  });

  drawGrid(pageStartY, y);
  drawFooter();

  doc.save(filename);
}

export function exportToSVG(users, filename = 'usuarios.svg') {
  const cols = getActiveColumns(users);
  const data = users.map(u => mapRow(u, cols));
  const colW = getColWidths(cols);
  const totalColW = colW.reduce((a, b) => a + b, 0);
  const cellW = 800;
  const cellH = 28;
  const headerH = 32;
  const svgColW = cols.map((_, i) => cellW * (colW[i] / totalColW));
  const totalW = svgColW.reduce((a, b) => a + b, 0);
  const tableH = headerH + data.length * cellH;
  const pad = 24;
  const titleH = 56;
  const totalH = pad + titleH + tableH + pad;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW + pad * 2}" height="${totalH}" viewBox="0 0 ${totalW + pad * 2} ${totalH}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${pad}" y="${pad + 20}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333">Relatório de Usuários</text>
  <text x="${pad}" y="${pad + 38}" font-family="Arial, sans-serif" font-size="11" fill="#666">Gerado em: ${new Date().toLocaleString('pt-BR')}  |  Total: ${users.length} usuários</text>
  <g transform="translate(${pad}, ${pad + titleH})">
    <rect x="0" y="0" width="${totalW}" height="${headerH}" fill="#3d4e8f" rx="3"/>
`;

  let cx = 0;
  svgColW.forEach((w, i) => {
    svg += `    <text x="${cx + w / 2}" y="${headerH / 2 + 5}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">${escapeXml(cols[i].label)}</text>\n`;
    cx += w;
  });

  data.forEach((row, ri) => {
    const y = headerH + ri * cellH;
    const bg = ri % 2 === 0 ? '#f8fafc' : '#ffffff';
    svg += `    <rect x="0" y="${y}" width="${totalW}" height="${cellH}" fill="${bg}"/>\n`;
    let cx2 = 8;
    cols.forEach((col, ci) => {
      const val = String(row[col.key] ?? '');
      const colWidth = svgColW[ci];
      const maxLen = Math.floor((colWidth - 16) / 6.5);
      const truncVal = val.length > maxLen ? val.slice(0, Math.max(maxLen - 1, 1)) + '…' : val;
      svg += `    <text x="${cx2}" y="${y + cellH / 2 + 4}" font-family="Arial, sans-serif" font-size="11" fill="#334155">${escapeXml(truncVal)}</text>\n`;
      cx2 += colWidth;
    });
  });

  for (let i = 0; i <= data.length; i++) {
    const y = headerH + i * cellH;
    svg += `    <line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>\n`;
  }
  cx = 0;
  for (let i = 0; i <= cols.length; i++) {
    svg += `    <line x1="${cx}" y1="0" x2="${cx}" y2="${headerH + data.length * cellH}" stroke="#e2e8f0" stroke-width="1"/>\n`;
    cx += svgColW[i] || 0;
  }

  svg += `  </g>
</svg>`;

  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
