// frontend/src/components/common/ExportToolbar/ExportToolbar.tsx
import { useState } from 'react';
import { Box, Button, Tooltip, Snackbar, Alert } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GoogleIcon from '../GoogleIcon';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // Excel column width in characters
  formatter?: (val: unknown) => string;
}

interface ExportToolbarProps {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  getData: () => Record<string, unknown>[];
  filename?: string;
  landscape?: boolean;
}

export function ExportToolbar({
  title,
  subtitle,
  columns,
  getData,
  filename,
  landscape = false,
}: ExportToolbarProps) {
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const baseFilename = filename ?? title.replace(/\s+/g, '_').toLowerCase();
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const dateISO = new Date().toISOString().slice(0, 10);

  const fmt = (col: ExportColumn, val: unknown): string => {
    if (col.formatter) return col.formatter(val);
    if (val === null || val === undefined || val === '') return '';
    return String(val);
  };

  // ─── Excel via ExcelJS ───────────────────────────────────────────────────────
  const handleExcel = async () => {
    setLoading('excel');
    try {
      const ExcelJS = (await import('exceljs')).default;
      const data = getData();
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PNDA-SE';
      wb.created = new Date();

      const ws = wb.addWorksheet(title.slice(0, 31), {
        pageSetup: { orientation: landscape ? 'landscape' : 'portrait', fitToPage: true },
      });

      // ── Title row ──
      ws.mergeCells(1, 1, 1, columns.length);
      const titleCell = ws.getCell('A1');
      titleCell.value = `PNDA-SE – Programme National de Développement Agricole`;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 24;

      // ── Subtitle row ──
      ws.mergeCells(2, 1, 2, columns.length);
      const subCell = ws.getCell('A2');
      subCell.value = title + (subtitle ? ` — ${subtitle}` : '');
      subCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      // ── Date row ──
      ws.mergeCells(3, 1, 3, columns.length);
      const dateCell = ws.getCell('A3');
      dateCell.value = `Généré le : ${dateStr}`;
      dateCell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
      dateCell.alignment = { horizontal: 'right' };
      ws.getRow(3).height = 16;

      // ── Empty row ──
      ws.getRow(4).height = 8;

      // ── Header row ──
      const headerRow = ws.getRow(5);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF1B5E20' } },
        };
      });
      ws.getRow(5).height = 18;

      // ── Data rows ──
      data.forEach((row, rowIdx) => {
        const dataRow = ws.getRow(rowIdx + 6);
        columns.forEach((col, colIdx) => {
          const cell = dataRow.getCell(colIdx + 1);
          cell.value = fmt(col, row[col.key]);
          if (rowIdx % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5FAF5' } };
          }
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
        dataRow.height = 15;
      });

      // ── Column widths ──
      columns.forEach((col, i) => {
        ws.getColumn(i + 1).width = col.width ?? 20;
      });

      // ── Freeze header ──
      ws.views = [{ state: 'frozen', ySplit: 5 }];

      // ── Write buffer ──
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PNDA_${baseFilename}_${dateISO}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSnackbar('Fichier Excel généré avec succès');
    } catch (err) {
      console.error('Excel export error', err);
      setSnackbar('Erreur lors de la génération Excel');
    } finally {
      setLoading(null);
    }
  };

  // ─── PDF via jsPDF + autoTable ───────────────────────────────────────────────
  const handlePDF = () => {
    setLoading('pdf');
    try {
      const data = getData();
      const doc = new jsPDF({
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // ── Green header band ──
      doc.setFillColor(27, 94, 32);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PNDA-SE — Programme National de Développement Agricole', pageW / 2, 10, { align: 'center' });
      doc.setFontSize(10);
      doc.text(title, pageW / 2, 18, { align: 'center' });

      // ── Subtitle + date ──
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (subtitle) doc.text(subtitle, 14, 30);
      doc.text(`Généré le : ${dateStr}`, pageW - 14, 30, { align: 'right' });

      // ── Table ──
      autoTable(doc, {
        startY: 34,
        head: [columns.map((c) => c.header)],
        body: data.map((row) => columns.map((col) => fmt(col, row[col.key]))),
        headStyles: {
          fillColor: [27, 94, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        styles: { overflow: 'linebreak', font: 'helvetica' },
        margin: { left: 10, right: 10 },
        didDrawPage: (hookData) => {
          // Footer
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(`PNDA-SE — Confidentiel`, 10, pageH - 6);
          doc.text(
            `Page ${hookData.pageNumber}`,
            pageW / 2,
            pageH - 6,
            { align: 'center' }
          );
          doc.text(dateStr, pageW - 10, pageH - 6, { align: 'right' });
          // Footer line
          doc.setDrawColor(200, 200, 200);
          doc.line(10, pageH - 9, pageW - 10, pageH - 9);
        },
      });

      doc.save(`PNDA_${baseFilename}_${dateISO}.pdf`);
      setSnackbar('Fichier PDF généré avec succès');
    } catch (err) {
      console.error('PDF export error', err);
      setSnackbar('Erreur lors de la génération PDF');
    } finally {
      setLoading(null);
    }
  };

  // ─── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const data = getData();
    const headers = columns.map((c) => `<th>${c.header}</th>`).join('');
    const rows = data
      .map(
        (row) =>
          `<tr>${columns.map((col) => `<td>${fmt(col, row[col.key])}</td>`).join('')}</tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title} — PNDA-SE</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #333; padding: 8mm; }
    .header { background: #1B5E20; color: white; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; }
    .header h1 { font-size: 13pt; margin-bottom: 2px; }
    .header p  { font-size: 8pt; opacity: 0.85; }
    .meta { font-size: 8pt; color: #666; margin-bottom: 8px; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #37474F; color: white; padding: 5px 7px; text-align: left; font-size: 8pt; }
    td { padding: 4px 7px; border-bottom: 1px solid #e0e0e0; font-size: 8pt; }
    tr:nth-child(even) td { background: #f5faf5; }
    .footer { margin-top: 12px; font-size: 7pt; color: #999; border-top: 1px solid #e0e0e0; padding-top: 4px;
      display: flex; justify-content: space-between; }
    @page { size: ${landscape ? 'A4 landscape' : 'A4 portrait'}; margin: 8mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>PNDA-SE — ${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
  <div class="meta">Généré le : ${dateStr} &nbsp;|&nbsp; ${data.length} enregistrement(s)</div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>PNDA-SE — Confidentiel</span>
    <span>${dateStr}</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=960,height=720');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 400);
    }
  };

  // ─── Share ───────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `PNDA-SE — ${title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setSnackbar('Lien copié dans le presse-papier');
      }
    } catch {
      // user cancelled or not supported
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap', mb: 1.5 }}>
        <Tooltip title="Télécharger au format Excel (.xlsx)">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="success"
              disabled={loading === 'excel'}
              startIcon={<GoogleIcon name="table_view" size={18} />}
              onClick={handleExcel}
              sx={{ textTransform: 'none' }}
            >
              {loading === 'excel' ? 'Export...' : 'Excel'}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Télécharger au format PDF">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={loading === 'pdf'}
              startIcon={<GoogleIcon name="picture_as_pdf" size={18} />}
              onClick={handlePDF}
              sx={{ textTransform: 'none' }}
            >
              {loading === 'pdf' ? 'Export...' : 'PDF'}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Imprimer le tableau">
          <Button
            size="small"
            variant="outlined"
            color="info"
            startIcon={<GoogleIcon name="print" size={18} />}
            onClick={handlePrint}
            sx={{ textTransform: 'none' }}
          >
            Imprimer
          </Button>
        </Tooltip>

        <Tooltip title="Partager le lien de cette page">
          <Button
            size="small"
            variant="outlined"
            startIcon={<GoogleIcon name="share" size={18} />}
            onClick={handleShare}
            sx={{ textTransform: 'none' }}
          >
            Partager
          </Button>
        </Tooltip>
      </Box>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSnackbar(null)} variant="filled">
          {snackbar}
        </Alert>
      </Snackbar>
    </>
  );
}
