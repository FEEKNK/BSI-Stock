import * as XLSX from 'xlsx';

/**
 * Format a date string (YYYY-MM-DD or ISO) into clean Thai date (DD/MM/BBBB) without time (no 0:00 or 0.00)
 */
export const formatExportDate = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    const clean = dateVal.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      const thaiYear = y > 2400 ? y : y + 543;
      return `${d}/${m}/${thaiYear}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const thaiYear = year > 2400 ? year : year + 543;
  return `${day}/${month}/${thaiYear}`;
};

/**
 * Export Dispensing History to Excel (.xlsx) or CSV (.csv)
 */
export const exportDispensingHistory = (history = [], format = 'xlsx') => {
  if (!history || history.length === 0) {
    return false;
  }

  const filename = `history_report_${new Date().toISOString().split('T')[0]}`;

  if (format === 'xlsx') {
    // 1. Prepare Header and Data rows
    const headers = ['วันที่', 'ประเภท', 'HN', 'สินค้า', 'ไซส์', 'จำนวน', 'ผู้เบิก', 'หมายเหตุ'];
    
    const rows = history.map(record => [
      formatExportDate(record.dispensed_date),
      record.type === 'IN' ? 'รับเข้า' : 'เบิกออก',
      record.hn ? String(record.hn) : '-',
      record.product_name || '-',
      record.size || '-',
      Number(record.quantity) || 0,
      record.seller || '-',
      record.note || '-'
    ]);

    const data = [headers, ...rows];

    // 2. Create Sheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 3. Ensure HN column is strictly stored as string type ('s') to prevent scientific notation (e.g. 1.55E+10)
    const hnColIndex = 2; // Column C (0-indexed)
    for (let r = 1; r <= rows.length; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: hnColIndex });
      if (ws[cellRef]) {
        ws[cellRef].t = 's'; // Force string
        ws[cellRef].z = '@'; // Text format
      }
    }

    // 4. Calculate auto column widths with safety margin so no '#########' occurs
    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length * 2; // Thai characters approx width
      data.forEach(row => {
        const val = row[colIdx];
        if (val !== null && val !== undefined) {
          const str = String(val);
          const len = str.length;
          if (len > maxLen) maxLen = len;
        }
      });
      return { wch: Math.max(maxLen + 4, 14) };
    });

    ws['!cols'] = colWidths;

    // 5. Create Workbook and Download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการเบิกสินค้า');
    XLSX.writeFile(wb, `${filename}.xlsx`);

  } else {
    // Export Clean CSV
    let csvContent = "วันที่,ประเภท,HN,สินค้า,ไซส์,จำนวน,ผู้เบิก,หมายเหตุ\n";
    
    history.forEach(record => {
      const date = formatExportDate(record.dispensed_date);
      const type = record.type === 'IN' ? 'รับเข้า' : 'เบิกออก';
      const hn = record.hn ? String(record.hn) : '-';
      const product = record.product_name || '-';
      const size = record.size || '-';
      const quantity = record.quantity || 0;
      const seller = record.seller || '-';
      const note = record.note || '-';
      
      const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;
      
      // For HN in CSV, if it is a long number, prefix with ="..." so Excel opens as text without scientific notation (1.55E+10)
      const formattedHn = /^\d{5,}$/.test(hn) ? `="${hn}"` : escapeCsv(hn);

      csvContent += `${escapeCsv(date)},${escapeCsv(type)},${formattedHn},${escapeCsv(product)},${escapeCsv(size)},${quantity},${escapeCsv(seller)},${escapeCsv(note)}\n`;
    });

    const bom = "\uFEFF"; // UTF-8 BOM for Thai support in Excel
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export Stock Matrix to Excel (.xlsx) or CSV (.csv)
 */
export const exportStockMatrix = (groupedStockMatrix = [], format = 'xlsx') => {
  if (!groupedStockMatrix || groupedStockMatrix.length === 0) {
    return false;
  }

  const filename = `stock_report_${new Date().toISOString().split('T')[0]}`;

  const rows = [];
  groupedStockMatrix.forEach(group => {
    (group.products || []).forEach(p => {
      if (!group.sizes || group.sizes.length === 0) {
        rows.push([
          group.category || '-',
          p.name || '-',
          '-',
          0
        ]);
      } else {
        group.sizes.forEach(size => {
          const sizeData = p.sizes?.[size];
          const stock = sizeData
            ? (typeof sizeData === 'object' ? sizeData.stock : Number(sizeData))
            : null;
          if (stock !== null) {
            rows.push([
              group.category || '-',
              p.name || '-',
              size,
              Number(stock) || 0
            ]);
          }
        });
      }
    });
  });

  if (rows.length === 0) {
    return false;
  }

  if (format === 'xlsx') {
    const headers = ['หมวดหมู่', 'ชื่อสินค้า', 'ไซส์', 'สต็อกคงเหลือ'];
    const data = [headers, ...rows];

    const ws = XLSX.utils.aoa_to_sheet(data);

    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length * 2;
      data.forEach(row => {
        const val = row[colIdx];
        if (val !== null && val !== undefined) {
          const len = String(val).length;
          if (len > maxLen) maxLen = len;
        }
      });
      return { wch: Math.max(maxLen + 4, 14) };
    });

    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ภาพรวมสต็อก');
    XLSX.writeFile(wb, `${filename}.xlsx`);

  } else {
    let csvContent = "หมวดหมู่,ชื่อสินค้า,ไซส์,สต็อกคงเหลือ\n";
    const escapeCsv = (str) => `"${String(str).replace(/"/g, '""')}"`;

    rows.forEach(row => {
      csvContent += `${escapeCsv(row[0])},${escapeCsv(row[1])},${escapeCsv(row[2])},${row[3]}\n`;
    });

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
