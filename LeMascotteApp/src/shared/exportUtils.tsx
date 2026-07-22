import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { STORE_INFO, loadLogoBase64 } from './logoUtils';

export type ProductRow = {
  id: string | number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  img?: string;
};

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function esc(t: string): string {
  const a = '\x26';
  return t.replace(/[&<>"]/g, (m) =>
    m === '&' ? a + 'amp;' : m === '<' ? a + 'lt;' : m === '>' ? a + 'gt;' : a + 'quot;',
  );
}

/* ===================================================================
   PDF – expo-print
   =================================================================== */

async function buildPdfHtml(products: ProductRow[], title: string): Promise<string> {
  const logoBase64 = await loadLogoBase64();

  const rows = products
    .map(
      (p, i) => `
    <tr>
      <td style="text-align:center;font-weight:700;color:#6b124f;padding:8px 6px;border-bottom:1px solid #f0e8ec;">${i + 1}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0e8ec;">${esc(p.name)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0e8ec;text-align:center;"><span style="background:#f0e8ff;color:#6b124f;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${esc(p.category)}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0e8ec;text-align:right;font-weight:700;color:#8d1c69;">$${(p.price ?? 0).toLocaleString('es-CO')}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0e8ec;text-align:center;"><span style="background:${(p.stock ?? 0) <= 0 ? '#f8d7da' : (p.stock ?? 0) < 5 ? '#fff3cd' : '#d4edda'};color:${(p.stock ?? 0) <= 0 ? '#721c24' : (p.stock ?? 0) < 5 ? '#856404' : '#155724'};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${p.stock ?? 0}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #f0e8ec;text-align:center;"><span style="background:${(p.status || '').toLowerCase().includes('dispon') ? '#d4edda' : '#f8d7da'};color:${(p.status || '').toLowerCase().includes('dispon') ? '#155724' : '#721c24'};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:800;">${esc(p.status || 'Disponible')}</span></td>
    </tr>`,
    )
    .join('');

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="width:70px;height:70px;object-fit:contain;border-radius:14px;border:2px solid #6b124f;" />`
    : '<span style="font-size:40px;">🐾</span>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;color:#2c2c2c;background:#fff;">

<!-- HEADER con logo + info tienda -->
<table style="width:100%;border-collapse:collapse;background:linear-gradient(135deg,#fcfafb,#f5edf3);border-bottom:4px solid #6b124f;">
<tr>
  <td style="width:90px;padding:20px 0 20px 24px;vertical-align:middle;text-align:center;">
    ${logoHtml}
  </td>
  <td style="padding:20px 24px 20px 0;vertical-align:middle;">
    <div style="font-size:24px;font-weight:900;color:#6b124f;letter-spacing:-0.5px;">${esc(STORE_INFO.name)}</div>
    <div style="font-size:12px;color:#555;margin-top:6px;line-height:1.7;">
      📍 ${esc(STORE_INFO.address)}, ${esc(STORE_INFO.neighborhood)}<br/>
      📍 ${esc(STORE_INFO.city)}<br/>
      📞 ${esc(STORE_INFO.phone)} &nbsp;|&nbsp; 📷 ${esc(STORE_INFO.instagram)}
    </div>
  </td>
</tr>
</table>

<!-- TÍTULO -->
<div style="padding:20px 24px 0;">
  <h1 style="font-size:20px;font-weight:800;color:#333;margin:0;">📄 ${esc(title)}</h1>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:#888;flex-wrap:wrap;gap:8px;">
    <span>📅 Generado: ${formatDate()}</span>
    <span style="background:linear-gradient(135deg,#f0e8ff,#f5edf3);color:#6b124f;padding:5px 16px;border-radius:20px;font-weight:800;font-size:12px;">📦 ${products.length} producto${products.length !== 1 ? 's' : ''}</span>
  </div>
</div>

<!-- TABLA -->
<div style="padding:12px 24px 20px;">
<table style="width:100%;border-collapse:collapse;border:1px solid #e0d9ce;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
<thead>
<tr style="background:linear-gradient(135deg,#6b124f,#8d1c69);color:#fff;">
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:center;width:40px;">#</th>
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:left;">Nombre</th>
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:center;">Categoría</th>
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:right;">Precio</th>
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:center;">Stock</th>
  <th style="padding:12px 8px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;text-align:center;">Estado</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>

<!-- FOOTER -->
<div style="margin:0 24px 20px;padding:16px 0 0;border-top:2px solid #f0e8ec;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#aaa;flex-wrap:wrap;gap:8px;">
  <span style="color:#6b124f;font-weight:700;">${esc(STORE_INFO.name)}</span>
  <span>📍 ${esc(STORE_INFO.address)} &nbsp;|&nbsp; 📞 ${esc(STORE_INFO.phone)} &nbsp;|&nbsp; 📷 ${esc(STORE_INFO.instagram)}</span>
</div>

<!-- BANDA DECORATIVA -->
<div style="height:6px;background:linear-gradient(90deg,#6b124f,#ffd44d,#6b124f);border-radius:0 0 16px 16px;"></div>

</body>
</html>`;
}

export async function exportToPdf(products: ProductRow[], title: string): Promise<boolean> {
  try {
    const html = await buildPdfHtml(products, title);

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
    console.error('PDF export error:', error);
    return false;
  }
}

/* ===================================================================
   EXCEL – xlsx
   =================================================================== */

export async function exportToExcel(products: ProductRow[], title: string): Promise<boolean> {
  try {
    const wb = XLSX.utils.book_new();

    // Construir datos: filas 0-2 = info tienda, fila 3 = vacía, fila 4+ = datos
    const data: any[][] = [];

    // Fila 0: Nombre tienda (negrita, tamaño 16)
    data.push([STORE_INFO.name]);

    // Fila 1: Contacto
    data.push([`📞 ${STORE_INFO.phone}  |  📍 ${STORE_INFO.address}  |  📷 ${STORE_INFO.instagram}`]);

    // Fila 2: Vacía
    data.push([]);

    // Fila 3: Encabezados de tabla
    data.push(['#', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado']);

    // Filas de datos
    products.forEach((p, i) => {
      data.push([
        i + 1,
        p.name,
        p.category,
        p.price ?? 0,
        p.stock ?? 0,
        p.status || 'Disponible',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // === ANCHO DE COLUMNAS ===
    ws['!cols'] = [
      { wch: 6 },   // #
      { wch: 40 },  // Nombre
      { wch: 22 },  // Categoría
      { wch: 16 },  // Precio
      { wch: 10 },  // Stock
      { wch: 18 },  // Estado
    ];

    // === BORDES ===
    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'D0C0C8' } },
      bottom: { style: 'thin', color: { rgb: 'D0C0C8' } },
      left: { style: 'thin', color: { rgb: 'D0C0C8' } },
      right: { style: 'thin', color: { rgb: 'D0C0C8' } },
    };

    // === ESTILOS ===
    // Fila 0: Nombre tienda – negrita, tamaño 16, centrado
    const storeNameCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[storeNameCell]) {
      ws[storeNameCell].s = {
        font: { bold: true, sz: 16, name: 'Calibri', color: { rgb: '6B124F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    // Fusionar celdas para el nombre de la tienda (A1:F1)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

    // Fila 1: Contacto – centrado, tamaño 10
    const contactCell = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[contactCell]) {
      ws[contactCell].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '555555' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    // Fusionar celdas para contacto (A2:F2)
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

    // Fila 3 (índice 3): Encabezados – fondo #D3D3D3, negrita, bordes
    const headerCols = ['#', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado'];
    for (let c = 0; c < headerCols.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 3, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 11, name: 'Calibri', color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '6B124F' } },
          alignment: { horizontal: c === 0 || c === 4 || c === 5 ? 'center' : c === 3 ? 'right' : 'left', vertical: 'center', wrapText: true },
          border: thinBorder,
        };
      }
    }

    // Filas de datos (desde índice 4 en adelante)
    for (let r = 4; r < data.length; r++) {
      const rowColor = r % 2 === 0 ? 'FAF5F9' : 'FFFFFF';
      for (let c = 0; c < 6; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (ws[cellRef]) {
          const align = c === 0 || c === 4 || c === 5 ? 'center' : c === 3 ? 'right' : 'left';
          ws[cellRef].s = {
            font: {
              sz: 11,
              name: 'Calibri',
              ...(c === 3 ? { color: { rgb: '8D1C69' }, bold: true } : {}),
              ...(c === 4 && (ws[cellRef].v <= 0) ? { color: { rgb: 'E74C3C' }, bold: true } : {}),
              ...(c === 4 && (ws[cellRef].v > 0 && ws[cellRef].v < 5) ? { color: { rgb: '856404' }, bold: true } : {}),
            },
            fill: { fgColor: { rgb: rowColor } },
            alignment: { horizontal: align, vertical: 'center' },
            border: thinBorder,
            ...(c === 3 ? { numFmt: '$#,##0' } : {}),
          };
        }
      }
    }

    // Altura de fila para encabezados
    ws['!rows'] = [
      { hpx: 30 }, // fila 0: nombre tienda
      { hpx: 22 }, // fila 1: contacto
      { hpx: 10 }, // fila 2: vacía
      { hpx: 32 }, // fila 3: encabezados
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

    // === WEB ===
    if (Platform.OS === 'web') {
      const wbOut = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${Date.now()}.xlsx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    }

    // === NATIVO ===
    const wbOut = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `inventario_${Date.now()}.xlsx`;
    const xlsxFile = new File(Paths.document, fileName);
    await xlsxFile.write(wbOut);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(xlsxFile.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
}