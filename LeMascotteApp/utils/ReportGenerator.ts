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