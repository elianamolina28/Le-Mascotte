/**
 * ReportGenerator.ts
 * Único utilitario para generar reportes PDF y Excel desde admin.tsx y empleado.tsx
 * Columnas: Producto, Categoría, Cantidad Entrada, Cantidad Salida, Stock Actual, Valor Compra, Valor Venta, Estado
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// ============================================================
// TYPES
// ============================================================
export type ReportRow = {
  name: string;
  category: string;
  cantidad_entrada: number;
  cantidad_salida: number;
  stock: number;
  valor_compra: number;
  valor_venta: number;
  status: string;
};

export type OrderReportRow = {
  orderId: string;
  date: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  products: string;
  total: number;
  status: string;
  paymentMethod: string;
  address?: string;
};

export type UserReportRow = {
  name: string;
  email: string;
  role: string;
  status: string;
};

export type ProveedorReportRow = {
  nombre: string;
  nit: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  estado: string;
};

export type TrendingReportRow = {
  name: string;
  category: string;
  stock: number;
  total_count: number;
  times_added?: number;
  unique_users?: number;
};

// ============================================================
// CONSTANTS
// ============================================================
const STORE = {
  name: 'Le Mascotte Pet Shop',
  address: 'CL. 73 sur #45-15, Ciudad Bolívar',
  phone: '+57 300 6977862',
  instagram: '@lemascotte.petshop',
};

const LOGO_SERVER_PATH = 'http://172.30.5.119/Mocap%20Le%20Mascotte.V4.2.0/ACCENT/IMG/logo.png';

// ============================================================
// HELPERS
// ============================================================
function fmtDate(): string {
  return new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function money(n: number): string {
  return '$' + (n || 0).toLocaleString('es-CO');
}

function esc(t: string): string {
  const a = '\x26';
  return t.replace(/[&<>"]/g, (m) =>
    m === '&' ? a + 'amp;' : m === '<' ? a + 'lt;' : m === '>' ? a + 'gt;' : a + 'quot;',
  );
}

function escHtml(t: string | undefined | null): string {
  if (!t) return '';
  return t
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

// ============================================================
// LOGO BASE64 (desde servidor XAMPP)
// ============================================================
let cachedLogo: string | null = null;

async function loadLogoBase64(): Promise<string> {
  if (cachedLogo) return cachedLogo;
  try {
    const resp = await fetch(LOGO_SERVER_PATH);
    const blob = await resp.blob();
    const b64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    cachedLogo = b64;
    return b64;
  } catch (err) {
    console.warn('[ReportGenerator] Logo Base64 falló:', err);
    return '';
  }
}

// ============================================================
// PDF – expo-print
// ============================================================
async function buildPdfHtml(rows: ReportRow[], title: string): Promise<string> {
  const logoB64 = await loadLogoBase64();

  const logoHtml = logoB64
    ? `<img src="${logoB64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  const trs = rows.map((r, i) => `
    <tr${i % 2 === 0 ? '' : ' style="background:#faf5f9;"'}>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;">${esc(r.name)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:#f0e8ff;color:#6b124f;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${esc(r.category)}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;">${r.cantidad_entrada}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;">${r.cantidad_salida}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${r.stock <= 0 ? '#f8d7da' : r.stock < 5 ? '#fff3cd' : '#d4edda'};color:${r.stock <= 0 ? '#721c24' : r.stock < 5 ? '#856404' : '#155724'};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${r.stock}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:right;font-weight:700;">${money(r.valor_compra)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:right;font-weight:700;color:#8d1c69;">${money(r.valor_venta)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${(r.status || '').toLowerCase().includes('dispon') ? '#d4edda' : '#f8d7da'};color:${(r.status || '').toLowerCase().includes('dispon') ? '#155724' : '#721c24'};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${esc(r.status || 'Disponible')}</span></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">${logoHtml}</td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${esc(STORE.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${esc(STORE.address)}<br/>
      📞 ${esc(STORE.phone)} &nbsp;|&nbsp; 📷 ${esc(STORE.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TITLE -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">📄 ${esc(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 ${fmtDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">📦 ${rows.length} producto${rows.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<!-- TABLE -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Producto</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Categoría</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Entrada</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Salida</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Stock</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Valor Compra</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Valor Venta</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Estado</th>
</tr>
</thead>
<tbody>${trs}</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${esc(STORE.name)}</span>
  <span>📍 ${esc(STORE.address)} &nbsp;|&nbsp; 📞 ${esc(STORE.phone)} &nbsp;|&nbsp; 📷 ${esc(STORE.instagram)}</span>
</div>

<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportToPdf(rows: ReportRow[], title: string): Promise<boolean> {
  try {
    const html = await buildPdfHtml(rows, title);

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${Date.now()}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    const result = await Print.printToFileAsync({ html, base64: false });
    if (!result?.uri) {
      await Print.printAsync({ html });
      return true;
    }

    const pdfName = `inventario_${Date.now()}.pdf`;
    const dest = new File(Paths.document, pdfName);
    const src = new File(result.uri);
    await src.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf' });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] PDF error:', error);
    return false;
  }
}

// ============================================================
// EXCEL – xlsx
// ============================================================
// ============================================================
// PDF – PEDIDOS
// ============================================================
async function buildOrderPdfHtml(rows: OrderReportRow[], title: string): Promise<string> {
  const logoB64 = await loadLogoBase64();

  const logoHtml = logoB64
    ? `<img src="${logoB64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  const trs = rows.map((r, i) => {
    const statusBg = (r.status || '').toLowerCase().includes('entreg') ? '#d4edda'
      : (r.status || '').toLowerCase().includes('envi') ? '#cce5ff'
      : (r.status || '').toLowerCase().includes('prepar') ? '#fff3cd'
      : (r.status || '').toLowerCase().includes('cancel') ? '#f8d7da'
      : '#e2e3e5';
    const statusColor = (r.status || '').toLowerCase().includes('entreg') ? '#155724'
      : (r.status || '').toLowerCase().includes('envi') ? '#004085'
      : (r.status || '').toLowerCase().includes('prepar') ? '#856404'
      : (r.status || '').toLowerCase().includes('cancel') ? '#721c24'
      : '#383d41';

    return `
    <tr${i % 2 === 0 ? '' : ' style="background:#faf5f9;"'}>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-weight:700;font-size:11px;">${escHtml(r.orderId)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:11px;">${escHtml(r.date)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:11px;font-weight:600;">${escHtml(r.clientName)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;color:#555;">${escHtml(r.clientEmail)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;max-width:180px;word-wrap:break-word;">${escHtml(r.products)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:right;font-weight:800;color:#8d1c69;font-size:12px;">${money(r.total)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${statusBg};color:${statusColor};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${escHtml(r.status || 'Pendiente')}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;font-size:10px;">${escHtml(r.paymentMethod)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">${logoHtml}</td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${escHtml(STORE.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${escHtml(STORE.address)}<br/>
      📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TITLE -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">📋 ${escHtml(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 ${fmtDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">📦 ${rows.length} pedido${rows.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<!-- TABLE -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Pedido</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Fecha</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Cliente</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Email</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Productos</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Total</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Estado</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Pago</th>
</tr>
</thead>
<tbody>${trs}</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${escHtml(STORE.name)}</span>
  <span>📍 ${escHtml(STORE.address)} &nbsp;|&nbsp; 📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}</span>
</div>

<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportOrdersToPdf(rows: OrderReportRow[], title: string): Promise<boolean> {
  try {
    const html = await buildOrderPdfHtml(rows, title);

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedidos_${Date.now()}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    const result = await Print.printToFileAsync({ html, base64: false });
    if (!result?.uri) {
      await Print.printAsync({ html });
      return true;
    }

    const pdfName = `pedidos_${Date.now()}.pdf`;
    const dest = new File(Paths.document, pdfName);
    const src = new File(result.uri);
    await src.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf' });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] PDF pedidos error:', error);
    return false;
  }
}

// ============================================================
// EXCEL – PEDIDOS
// ============================================================
export async function exportOrdersToExcel(rows: OrderReportRow[], title: string): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Fila 1: Nombre tienda
    data.push([STORE.name]);

    // Fila 2: Contacto
    data.push([`${STORE.address}  |  ${STORE.phone}  |  ${STORE.instagram}`]);

    // Fila 3: Vacía
    data.push([]);

    // Fila 4: Vacía
    data.push([]);

    // Fila 5: Encabezados
    data.push(['Pedido', 'Fecha', 'Cliente', 'Email', 'Productos', 'Total', 'Estado', 'Método de Pago']);

    // Filas de datos
    rows.forEach((r) => {
      data.push([
        r.orderId,
        r.date,
        r.clientName,
        r.clientEmail,
        r.products,
        r.total,
        r.status || 'Pendiente',
        r.paymentMethod,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 22 },  // Pedido
      { wch: 18 },  // Fecha
      { wch: 22 },  // Cliente
      { wch: 28 },  // Email
      { wch: 45 },  // Productos
      { wch: 14 },  // Total
      { wch: 14 },  // Estado
      { wch: 16 },  // Método de Pago
    ];

    // Border
    const thin = {
      top: { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left: { style: 'thin', color: { rgb: '999999' } },
      right: { style: 'thin', color: { rgb: '999999' } },
    };

    // Fila 1: Tienda – negrita 16, centrado, fusionado A1:H1
    const c1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[c1]) {
      ws[c1].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

    // Fila 2: Contacto – centrado, fusionado A2:H2
    const c2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[c2]) {
      ws[c2].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

    // Fila 5 (índice 4): Encabezados – fondo #4F4F4F, texto blanco, negrita, centrado
    const headers = ['Pedido', 'Fecha', 'Cliente', 'Email', 'Productos', 'Total', 'Estado', 'Método de Pago'];
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F4F4F' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thin,
        };
      }
    }

    // Filas de datos (desde índice 5)
    for (let r = 5; r < data.length; r++) {
      const bg = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          const isMoney = c === 5;
          const isCenter = c === 0 || c === 6 || c === 7;
          ws[ref].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(isMoney ? { color: { rgb: '8D1C69' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: isCenter ? 'center' : isMoney ? 'right' : 'left', vertical: 'center', wrapText: true },
            border: thin,
            ...(isMoney ? { numFmt: '$#,##0' } : {}),
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [
      { hpx: 30 }, // fila 0
      { hpx: 22 }, // fila 1
      { hpx: 10 }, // fila 2
      { hpx: 10 }, // fila 3
      { hpx: 32 }, // fila 4 (encabezados)
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

    // WEB
    if (Platform.OS === 'web') {
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedidos_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // NATIVO
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `pedidos_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(out);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] Excel pedidos error:', error);
    return false;
  }
}

export async function exportToExcel(rows: ReportRow[], title: string): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Fila 1: Nombre tienda (negrita 16, centrado)
    data.push([STORE.name]);

    // Fila 2: Contacto
    data.push([`${STORE.address}  |  ${STORE.phone}  |  ${STORE.instagram}`]);

    // Fila 3: Vacía
    data.push([]);

    // Fila 4: Vacía
    data.push([]);

    // Fila 5: Encabezados
    data.push(['Producto', 'Categoría', 'Cant. Entrada', 'Cant. Salida', 'Stock Actual', 'Valor Compra', 'Valor Venta', 'Estado']);

    // Filas de datos
    rows.forEach((r) => {
      data.push([
        r.name,
        r.category,
        r.cantidad_entrada,
        r.cantidad_salida,
        r.stock,
        r.valor_compra,
        r.valor_venta,
        r.status || 'Disponible',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 36 },  // Producto
      { wch: 20 },  // Categoría
      { wch: 14 },  // Cant. Entrada
      { wch: 14 },  // Cant. Salida
      { wch: 14 },  // Stock Actual
      { wch: 16 },  // Valor Compra
      { wch: 16 },  // Valor Venta
      { wch: 16 },  // Estado
    ];

    // Border
    const thin = {
      top: { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left: { style: 'thin', color: { rgb: '999999' } },
      right: { style: 'thin', color: { rgb: '999999' } },
    };

    // Fila 1: Tienda – negrita 16, centrado, fusionado A1:H1
    const c1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[c1]) {
      ws[c1].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

    // Fila 2: Contacto – centrado, fusionado A2:H2
    const c2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[c2]) {
      ws[c2].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

    // Fila 5 (índice 4): Encabezados – fondo #4F4F4F, texto blanco, negrita, centrado
    const headers = ['Producto', 'Categoría', 'Cant. Entrada', 'Cant. Salida', 'Stock Actual', 'Valor Compra', 'Valor Venta', 'Estado'];
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F4F4F' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thin,
        };
      }
    }

    // Filas de datos (desde índice 5)
    for (let r = 5; r < data.length; r++) {
      const bg = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          const isMoney = c === 5 || c === 6;
          const isCenter = c === 2 || c === 3 || c === 4 || c === 7;
          ws[ref].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(isMoney ? { color: { rgb: '8D1C69' }, bold: true } : {}),
              ...(c === 4 && ws[ref].v <= 0 ? { color: { rgb: 'E74C3C' }, bold: true } : {}),
              ...(c === 4 && ws[ref].v > 0 && ws[ref].v < 5 ? { color: { rgb: '856404' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: isCenter ? 'center' : isMoney ? 'right' : 'left', vertical: 'center' },
            border: thin,
            ...(isMoney ? { numFmt: '$#,##0' } : {}),
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [
      { hpx: 30 }, // fila 0
      { hpx: 22 }, // fila 1
      { hpx: 10 }, // fila 2
      { hpx: 10 }, // fila 3
      { hpx: 32 }, // fila 4 (encabezados)
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // WEB
    if (Platform.OS === 'web') {
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // NATIVO
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `inventario_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(out);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] Excel error:', error);
    return false;
  }
}

// ============================================================
// PDF – USUARIOS
// ============================================================
async function buildUsersPdfHtml(rows: UserReportRow[], title: string): Promise<string> {
  const logoB64 = await loadLogoBase64();

  const logoHtml = logoB64
    ? `<img src="${logoB64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  const trs = rows.map((r, i) => {
    const statusBg = (r.status || '').toLowerCase().includes('activo') ? '#d4edda'
      : (r.status || '').toLowerCase().includes('bloque') ? '#f8d7da'
      : '#e2e3e5';
    const statusColor = (r.status || '').toLowerCase().includes('activo') ? '#155724'
      : (r.status || '').toLowerCase().includes('bloque') ? '#721c24'
      : '#383d41';

    return `
    <tr${i % 2 === 0 ? '' : ' style="background:#faf5f9;"'}>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-weight:600;font-size:11px;">${escHtml(r.name)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;color:#555;">${escHtml(r.email)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:#f0e8ff;color:#6b124f;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${escHtml(r.role)}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${statusBg};color:${statusColor};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${escHtml(r.status || 'Activo')}</span></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">${logoHtml}</td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${escHtml(STORE.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${escHtml(STORE.address)}<br/>
      📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TITLE -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">👥 ${escHtml(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 ${fmtDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">👤 ${rows.length} usuario${rows.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<!-- TABLE -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Nombre</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Email</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Rol</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Estado</th>
</tr>
</thead>
<tbody>${trs}</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${escHtml(STORE.name)}</span>
  <span>📍 ${escHtml(STORE.address)} &nbsp;|&nbsp; 📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}</span>
</div>

<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportUsersToPdf(rows: UserReportRow[], title: string): Promise<boolean> {
  try {
    const html = await buildUsersPdfHtml(rows, title);

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios_${Date.now()}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    const result = await Print.printToFileAsync({ html, base64: false });
    if (!result?.uri) {
      await Print.printAsync({ html });
      return true;
    }

    const pdfName = `usuarios_${Date.now()}.pdf`;
    const dest = new File(Paths.document, pdfName);
    const src = new File(result.uri);
    await src.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf' });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] PDF usuarios error:', error);
    return false;
  }
}

// ============================================================
// EXCEL – USUARIOS
// ============================================================
export async function exportUsersToExcel(rows: UserReportRow[], title: string): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Fila 1: Nombre tienda
    data.push([STORE.name]);

    // Fila 2: Contacto
    data.push([`${STORE.address}  |  ${STORE.phone}  |  ${STORE.instagram}`]);

    // Fila 3: Vacía
    data.push([]);

    // Fila 4: Vacía
    data.push([]);

    // Fila 5: Encabezados
    data.push(['Nombre', 'Email', 'Rol', 'Estado']);

    // Filas de datos
    rows.forEach((r) => {
      data.push([
        r.name,
        r.email,
        r.role,
        r.status || 'Activo',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 30 },  // Nombre
      { wch: 32 },  // Email
      { wch: 14 },  // Rol
      { wch: 14 },  // Estado
    ];

    // Border
    const thin = {
      top: { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left: { style: 'thin', color: { rgb: '999999' } },
      right: { style: 'thin', color: { rgb: '999999' } },
    };

    // Fila 1: Tienda – negrita 16, centrado, fusionado A1:D1
    const c1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[c1]) {
      ws[c1].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    // Fila 2: Contacto – centrado, fusionado A2:D2
    const c2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[c2]) {
      ws[c2].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });

    // Fila 5 (índice 4): Encabezados – fondo #4F4F4F, texto blanco, negrita, centrado
    const headers = ['Nombre', 'Email', 'Rol', 'Estado'];
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F4F4F' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thin,
        };
      }
    }

    // Filas de datos (desde índice 5)
    for (let r = 5; r < data.length; r++) {
      const bg = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          const isCenter = c === 2 || c === 3;
          ws[ref].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(c === 3 && ws[ref].v === 'Bloqueado' ? { color: { rgb: 'E74C3C' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: isCenter ? 'center' : 'left', vertical: 'center' },
            border: thin,
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [
      { hpx: 30 }, // fila 0
      { hpx: 22 }, // fila 1
      { hpx: 10 }, // fila 2
      { hpx: 10 }, // fila 3
      { hpx: 32 }, // fila 4 (encabezados)
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

    // WEB
    if (Platform.OS === 'web') {
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usuarios_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // NATIVO
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `usuarios_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(out);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] Excel usuarios error:', error);
    return false;
  }
}

// ============================================================
// PDF – PROVEEDORES
// ============================================================
async function buildProveedoresPdfHtml(rows: ProveedorReportRow[], title: string): Promise<string> {
  const logoB64 = await loadLogoBase64();

  const logoHtml = logoB64
    ? `<img src="${logoB64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  const trs = rows.map((r, i) => {
    const statusBg = (r.estado || '').toLowerCase().includes('activo') ? '#d4edda'
      : (r.estado || '').toLowerCase().includes('inactivo') ? '#f8d7da'
      : '#e2e3e5';
    const statusColor = (r.estado || '').toLowerCase().includes('activo') ? '#155724'
      : (r.estado || '').toLowerCase().includes('inactivo') ? '#721c24'
      : '#383d41';

    return `
    <tr${i % 2 === 0 ? '' : ' style="background:#faf5f9;"'}>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-weight:600;font-size:11px;">${escHtml(r.nombre)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;font-size:11px;">${escHtml(r.nit)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;color:#555;">${escHtml(r.contacto || '—')}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;">${escHtml(r.telefono || '—')}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-size:10px;color:#555;">${escHtml(r.email || '—')}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${statusBg};color:${statusColor};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${escHtml(r.estado || 'Activo')}</span></td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">${logoHtml}</td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${escHtml(STORE.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${escHtml(STORE.address)}<br/>
      📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TITLE -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">🏢 ${escHtml(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 ${fmtDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">📦 ${rows.length} proveedor${rows.length !== 1 ? 'es' : ''}</span>
  </div>
</div>

<!-- TABLE -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Nombre</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">NIT</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Contacto</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Teléfono</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:left;">Email</th>
  <th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:center;">Estado</th>
</tr>
</thead>
<tbody>${trs}</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${escHtml(STORE.name)}</span>
  <span>📍 ${escHtml(STORE.address)} &nbsp;|&nbsp; 📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}</span>
</div>

<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportProveedoresToPdf(rows: ProveedorReportRow[], title: string): Promise<boolean> {
  try {
    const html = await buildProveedoresPdfHtml(rows, title);

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `proveedores_${Date.now()}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    const result = await Print.printToFileAsync({ html, base64: false });
    if (!result?.uri) {
      await Print.printAsync({ html });
      return true;
    }

    const pdfName = `proveedores_${Date.now()}.pdf`;
    const dest = new File(Paths.document, pdfName);
    const src = new File(result.uri);
    await src.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf' });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] PDF proveedores error:', error);
    return false;
  }
}

// ============================================================
// EXCEL – PROVEEDORES
// ============================================================
export async function exportProveedoresToExcel(rows: ProveedorReportRow[], title: string): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Fila 1: Nombre tienda
    data.push([STORE.name]);

    // Fila 2: Contacto
    data.push([`${STORE.address}  |  ${STORE.phone}  |  ${STORE.instagram}`]);

    // Fila 3: Vacía
    data.push([]);

    // Fila 4: Vacía
    data.push([]);

    // Fila 5: Encabezados
    data.push(['Nombre', 'NIT', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Estado']);

    // Filas de datos
    rows.forEach((r) => {
      data.push([
        r.nombre,
        r.nit,
        r.contacto || '—',
        r.telefono || '—',
        r.email || '—',
        r.direccion || '—',
        r.estado || 'Activo',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 28 },  // Nombre
      { wch: 18 },  // NIT
      { wch: 22 },  // Contacto
      { wch: 16 },  // Teléfono
      { wch: 28 },  // Email
      { wch: 32 },  // Dirección
      { wch: 12 },  // Estado
    ];

    // Border
    const thin = {
      top: { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left: { style: 'thin', color: { rgb: '999999' } },
      right: { style: 'thin', color: { rgb: '999999' } },
    };

    // Fila 1: Tienda – negrita 16, centrado, fusionado A1:G1
    const c1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[c1]) {
      ws[c1].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];

    // Fila 2: Contacto – centrado, fusionado A2:G2
    const c2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[c2]) {
      ws[c2].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });

    // Fila 5 (índice 4): Encabezados – fondo #4F4F4F, texto blanco, negrita, centrado
    const headers = ['Nombre', 'NIT', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Estado'];
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F4F4F' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thin,
        };
      }
    }

    // Filas de datos (desde índice 5)
    for (let r = 5; r < data.length; r++) {
      const bg = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          const isCenter = c === 2 || c === 3 || c === 6;
          ws[ref].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(c === 6 && ws[ref].v === 'Inactivo' ? { color: { rgb: 'E74C3C' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: isCenter ? 'center' : 'left', vertical: 'center' },
            border: thin,
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [
      { hpx: 30 }, // fila 0
      { hpx: 22 }, // fila 1
      { hpx: 10 }, // fila 2
      { hpx: 10 }, // fila 3
      { hpx: 32 }, // fila 4 (encabezados)
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');

    // WEB
    if (Platform.OS === 'web') {
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proveedores_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // NATIVO
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `proveedores_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(out);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] Excel proveedores error:', error);
    return false;
  }
}

// ============================================================
// PDF – TENDENCIAS (Analytics + Trending)
// ============================================================
async function buildTrendingPdfHtml(rows: TrendingReportRow[], title: string, showAnalytics: boolean): Promise<string> {
  const logoB64 = await loadLogoBase64();

  const logoHtml = logoB64
    ? `<img src="${logoB64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  const trs = rows.map((r, i) => {
    const stockColor = (r.stock ?? 0) > 0 ? '#2d6a4f' : '#e74c3c';
    const stockBg = (r.stock ?? 0) > 0 ? '#d4edda' : '#f8d7da';
    
    return `
    <tr${i % 2 === 0 ? '' : ' style="background:#faf5f9;"'}>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;font-weight:600;font-size:11px;">${escHtml(r.name)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:#f0e8ff;color:#6b124f;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${escHtml(r.category || '—')}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;"><span style="background:${stockBg};color:${stockColor};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${r.stock ?? 0}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;font-weight:900;color:#6b124f;font-size:13px;">${r.total_count}</td>
      ${showAnalytics ? `
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;font-weight:800;color:#0d6efd;font-size:12px;">${r.times_added ?? 0}x</td>
      <td style="padding:8px 6px;border-bottom:1px solid #e0d9ce;text-align:center;font-weight:700;color:#333;font-size:11px;">${r.unique_users ?? 0} usuarios</td>
      ` : ''}
    </tr>`;
  }).join('');

  const headers = showAnalytics
    ? ['Producto', 'Categoría', 'Stock', 'Total', 'Veces Añadido', 'Usuarios']
    : ['Producto', 'Categoría', 'Stock', 'Total'];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${escHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">${logoHtml}</td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${escHtml(STORE.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${escHtml(STORE.address)}<br/>
      📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TITLE -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">📊 ${escHtml(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 ${fmtDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">📦 ${rows.length} producto${rows.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<!-- TABLE -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  ${headers.map(h => `<th style="padding:10px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;text-align:${h === 'Producto' ? 'left' : 'center'};">${h}</th>`).join('')}
</tr>
</thead>
<tbody>${trs}</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${escHtml(STORE.name)}</span>
  <span>📍 ${escHtml(STORE.address)} &nbsp;|&nbsp; 📞 ${escHtml(STORE.phone)} &nbsp;|&nbsp; 📷 ${escHtml(STORE.instagram)}</span>
</div>

<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportTrendingToPdf(rows: TrendingReportRow[], title: string, showAnalytics: boolean = false): Promise<boolean> {
  try {
    const html = await buildTrendingPdfHtml(rows, title, showAnalytics);

    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `tendencias_${Date.now()}.html`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    const result = await Print.printToFileAsync({ html, base64: false });
    if (!result?.uri) {
      await Print.printAsync({ html });
      return true;
    }

    const pdfName = `tendencias_${Date.now()}.pdf`;
    const dest = new File(Paths.document, pdfName);
    const src = new File(result.uri);
    await src.copy(dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf' });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] PDF tendencias error:', error);
    return false;
  }
}

// ============================================================
// EXCEL – TENDENCIAS (Analytics + Trending)
// ============================================================
export async function exportTrendingToExcel(rows: TrendingReportRow[], title: string, showAnalytics: boolean = false): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Fila 1: Nombre tienda
    data.push([STORE.name]);

    // Fila 2: Contacto
    data.push([`${STORE.address}  |  ${STORE.phone}  |  ${STORE.instagram}`]);

    // Fila 3: Vacía
    data.push([]);

    // Fila 4: Vacía
    data.push([]);

    // Fila 5: Encabezados
    if (showAnalytics) {
      data.push(['Producto', 'Categoría', 'Stock', 'Total', 'Veces Añadido', 'Usuarios']);
    } else {
      data.push(['Producto', 'Categoría', 'Stock', 'Total']);
    }

    // Filas de datos
    rows.forEach((r) => {
      if (showAnalytics) {
        data.push([
          r.name,
          r.category || '—',
          r.stock ?? 0,
          r.total_count,
          r.times_added ?? 0,
          r.unique_users ?? 0,
        ]);
      } else {
        data.push([
          r.name,
          r.category || '—',
          r.stock ?? 0,
          r.total_count,
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    if (showAnalytics) {
      ws['!cols'] = [
        { wch: 36 },  // Producto
        { wch: 20 },  // Categoría
        { wch: 10 },  // Stock
        { wch: 10 },  // Total
        { wch: 16 },  // Veces Añadido
        { wch: 14 },  // Usuarios
      ];
    } else {
      ws['!cols'] = [
        { wch: 40 },  // Producto
        { wch: 22 },  // Categoría
        { wch: 10 },  // Stock
        { wch: 10 },  // Total
      ];
    }

    // Border
    const thin = {
      top: { style: 'thin', color: { rgb: '999999' } },
      bottom: { style: 'thin', color: { rgb: '999999' } },
      left: { style: 'thin', color: { rgb: '999999' } },
      right: { style: 'thin', color: { rgb: '999999' } },
    };

    const numCols = showAnalytics ? 5 : 3;

    // Fila 1: Tienda – negrita 16, centrado, fusionado
    const c1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[c1]) {
      ws[c1].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols } }];

    // Fila 2: Contacto – centrado, fusionado
    const c2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[c2]) {
      ws[c2].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: numCols } });

    // Fila 5 (índice 4): Encabezados
    const headers = showAnalytics
      ? ['Producto', 'Categoría', 'Stock', 'Total', 'Veces Añadido', 'Usuarios']
      : ['Producto', 'Categoría', 'Stock', 'Total'];
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 4, c });
      if (ws[ref]) {
        ws[ref].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F4F4F' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: thin,
        };
      }
    }

    // Filas de datos (desde índice 5)
    for (let r = 5; r < data.length; r++) {
      const bg = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < headers.length; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) {
          const isCenter = c === 2 || c === 3 || (showAnalytics && (c === 4 || c === 5));
          ws[ref].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(c === 3 ? { color: { rgb: '8D1C69' }, bold: true } : {}),
              ...(c === 2 && ws[ref].v <= 0 ? { color: { rgb: 'E74C3C' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: isCenter ? 'center' : 'left', vertical: 'center' },
            border: thin,
          };
        }
      }
    }

    // Row heights
    ws['!rows'] = [
      { hpx: 30 }, // fila 0
      { hpx: 22 }, // fila 1
      { hpx: 10 }, // fila 2
      { hpx: 10 }, // fila 3
      { hpx: 32 }, // fila 4 (encabezados)
    ];

    const sheetName = showAnalytics ? 'Tendencias Analytics' : 'Tendencias Populares';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // WEB
    if (Platform.OS === 'web') {
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tendencias_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // NATIVO
    const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `tendencias_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(out);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('[ReportGenerator] Excel tendencias error:', error);
    return false;
  }
}
