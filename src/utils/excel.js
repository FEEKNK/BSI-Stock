import * as XLSX from 'xlsx';

/**
 * Format a date string (YYYY-MM-DD or ISO) into clean Thai date (DD/MM/BBBB) without time (no 0:00)
 */
export const formatExportDate = (dateVal, includeTime = false) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string' && !includeTime) {
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
  
  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${thaiYear} ${hours}:${minutes}`;
  }
  return `${day}/${month}/${thaiYear}`;
};

/**
 * Helper to auto-calculate column widths with safety margin
 */
function calculateColumnWidths(data, headers = null) {
  if (!data || data.length === 0) return [];
  
  const keys = headers || Object.keys(data[0]);
  return keys.map(key => {
    let maxLen = Math.max(String(key).length * 1.5, 10);
    
    data.forEach(row => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        const estimatedLen = strVal.length * 1.3;
        if (estimatedLen > maxLen) {
          maxLen = estimatedLen;
        }
      }
    });
    
    return { wch: Math.min(Math.max(Math.ceil(maxLen) + 4, 14), 50) };
  });
}

/**
 * Export generic data to Excel (.xlsx)
 */
export function exportToExcel(data, fileName = 'export', sheetName = 'Sheet1', customColWidths = null) {
  if (!data || data.length === 0) {
    return false;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = customColWidths || calculateColumnWidths(data);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
  return true;
}

/**
 * Export Stock Matrix & Details to Excel (.xlsx)
 */
export function exportStockReportToExcel(groupedStockMatrix = [], products = []) {
  if (!groupedStockMatrix || groupedStockMatrix.length === 0) {
    return false;
  }

  const wb = XLSX.utils.book_new();
  const todayStr = new Date().toISOString().split('T')[0];

  // --- Sheet 1: รายการสต็อกสินค้าตามไซส์ (Detailed List) ---
  const detailedRows = [];
  let seq = 1;

  groupedStockMatrix.forEach(group => {
    (group.products || []).forEach(p => {
      const sizes = p.sizes || {};
      const sizeKeys = Object.keys(sizes);

      if (sizeKeys.length === 0) {
        detailedRows.push({
          'ลำดับ': seq++,
          'หมวดหมู่': group.category || 'ไม่มีหมวดหมู่',
          'รหัสสินค้า': p.product_code || '-',
          'ชื่อสินค้า': p.name || '-',
          'ไซส์': '-',
          'บาร์โค้ด': p.barcode || '-',
          'จำนวนคงเหลือ': 0,
          'หน่วย': p.unit || 'ชิ้น',
          'สถานะ': 'หมดสต็อก'
        });
      } else {
        sizeKeys.forEach(size => {
          const sizeData = sizes[size];
          const stock = sizeData
            ? (typeof sizeData === 'object' ? Number(sizeData.stock || 0) : Number(sizeData))
            : 0;
          const barcode = (typeof sizeData === 'object' ? sizeData.barcode : '') || p.barcode || '-';
          
          let status = 'ปกติ';
          if (stock === 0) status = 'หมดสต็อก';
          else if (stock <= 5) status = 'ใกล้หมด';

          detailedRows.push({
            'ลำดับ': seq++,
            'หมวดหมู่': group.category || 'ไม่มีหมวดหมู่',
            'รหัสสินค้า': p.product_code || '-',
            'ชื่อสินค้า': p.name || '-',
            'ไซส์': size,
            'บาร์โค้ด': barcode,
            'จำนวนคงเหลือ': stock,
            'หน่วย': p.unit || 'ชิ้น',
            'สถานะ': status
          });
        });
      }
    });
  });

  if (detailedRows.length > 0) {
    const wsDetail = XLSX.utils.json_to_sheet(detailedRows);
    wsDetail['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 20 }, // หมวดหมู่
      { wch: 15 }, // รหัสสินค้า
      { wch: 35 }, // ชื่อสินค้า
      { wch: 12 }, // ไซส์
      { wch: 20 }, // บาร์โค้ด
      { wch: 15 }, // จำนวนคงเหลือ
      { wch: 10 }, // หน่วย
      { wch: 15 }  // สถานะ
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'รายการสต็อกตามไซส์');
  }

  // --- Sheet 2: ตารางสรุปสต็อก (Matrix View) ---
  const matrixRows = [];
  groupedStockMatrix.forEach(group => {
    (group.products || []).forEach(p => {
      const row = {
        'หมวดหมู่': group.category || 'ไม่มีหมวดหมู่',
        'รหัสสินค้า': p.product_code || '-',
        'ชื่อสินค้า': p.name || '-'
      };

      let totalProductStock = 0;
      (group.sizes || []).forEach(size => {
        const sizeData = p.sizes?.[size];
        const stock = sizeData
          ? (typeof sizeData === 'object' ? Number(sizeData.stock || 0) : Number(sizeData))
          : '-';
        row[`ไซส์ ${size}`] = stock;
        if (typeof stock === 'number') {
          totalProductStock += stock;
        }
      });

      row['สต็อกรวม'] = totalProductStock;
      matrixRows.push(row);
    });
  });

  if (matrixRows.length > 0) {
    const wsMatrix = XLSX.utils.json_to_sheet(matrixRows);
    wsMatrix['!cols'] = calculateColumnWidths(matrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'ตารางสรุปสต็อก (Matrix)');
  }

  XLSX.writeFile(wb, `stock_report_${todayStr}.xlsx`);
}

/**
 * Export Dispensing History to Excel (.xlsx)
 */
export function exportHistoryToExcel(history = []) {
  if (!history || history.length === 0) {
    return false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const rows = history.map((record, index) => {
    // 1. Extract Date: DD/MM/YYYY
    let dateStr = '';
    const rawDate = record.dispensed_date || record.created_at;
    if (typeof record.dispensed_date === 'string') {
      const clean = record.dispensed_date.split('T')[0];
      const parts = clean.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        const thaiYear = y > 2400 ? y : y + 543;
        dateStr = `${d}/${m}/${thaiYear}`;
      }
    }

    if (!dateStr && rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const thaiYear = year > 2400 ? year : year + 543;
        dateStr = `${day}/${month}/${thaiYear}`;
      }
    }

    // 2. Extract Time: HH:mm น. from created_at
    let timeStr = '';
    if (record.created_at) {
      const dt = new Date(record.created_at);
      if (!isNaN(dt.getTime())) {
        const hours = String(dt.getHours()).padStart(2, '0');
        const minutes = String(dt.getMinutes()).padStart(2, '0');
        timeStr = `${hours}:${minutes} น.`;
      }
    }

    const dateTimeFormatted = (dateStr && timeStr) 
      ? `${dateStr} ${timeStr}` 
      : (dateStr || '-');

    return {
      'ลำดับ': index + 1,
      'วัน/เวลาทำรายการ': dateTimeFormatted,
      'ประเภท': record.type === 'IN' ? 'รับเข้า' : 'เบิกออก',
      'HN': record.hn ? String(record.hn) : '-',
      'รหัสสินค้า': record.product_code || '-',
      'ชื่อสินค้า': record.product_name || '-',
      'ไซส์': record.size || '-',
      'จำนวน': Number(record.quantity) || 0,
      'ผู้เบิก/ผู้รับ': record.seller || '-',
      'หมายเหตุ': record.note || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ensure HN column is forced to string type ('s') to prevent scientific notation (e.g. 1.55E+10)
  const hnColIndex = 3; // Column D (0-indexed)
  for (let r = 1; r <= rows.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: hnColIndex });
    if (ws[cellRef]) {
      ws[cellRef].t = 's';
      ws[cellRef].z = '@';
    }
  }

  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 24 }, // วัน/เวลาทำรายการ (เช่น 18/08/2569 13:46 น.)
    { wch: 12 }, // ประเภท
    { wch: 18 }, // HN
    { wch: 15 }, // รหัสสินค้า
    { wch: 35 }, // ชื่อสินค้า
    { wch: 12 }, // ไซส์
    { wch: 12 }, // จำนวน
    { wch: 20 }, // ผู้เบิก/ผู้รับ
    { wch: 30 }  // หมายเหตุ
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการทำรายการ');
  XLSX.writeFile(wb, `history_report_${todayStr}.xlsx`);
}

// Aliases for compatibility
export const exportDispensingHistory = (history) => exportHistoryToExcel(history);
export const exportStockMatrix = (groupedStockMatrix, products) => exportStockReportToExcel(groupedStockMatrix, products);

/**
 * Export Products Master to Excel
 */
export function exportProductsToExcel(products = []) {
  if (!products || products.length === 0) {
    return false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const rows = [];
  let seq = 1;

  products.forEach(p => {
    const sizes = p.sizes || {};
    const sizeKeys = Object.keys(sizes);

    if (sizeKeys.length === 0) {
      rows.push({
        'ลำดับ': seq++,
        'หมวดหมู่': p.category || '-',
        'รหัสสินค้า': p.product_code || '-',
        'ชื่อสินค้า': p.name || '-',
        'ไซส์': '-',
        'บาร์โค้ด': p.barcode || '-',
        'สต็อกคงเหลือ': p.total_stock || 0,
        'หน่วยนับ': p.unit || 'ชิ้น'
      });
    } else {
      sizeKeys.forEach(size => {
        const sizeData = sizes[size];
        const stock = sizeData
          ? (typeof sizeData === 'object' ? Number(sizeData.stock || 0) : Number(sizeData))
          : 0;
        const barcode = (typeof sizeData === 'object' ? sizeData.barcode : '') || p.barcode || '-';

        rows.push({
          'ลำดับ': seq++,
          'หมวดหมู่': p.category || '-',
          'รหัสสินค้า': p.product_code || '-',
          'ชื่อสินค้า': p.name || '-',
          'ไซส์': size,
          'บาร์โค้ด': barcode,
          'สต็อกคงเหลือ': stock,
          'หน่วยนับ': p.unit || 'ชิ้น'
        });
      });
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 20 }, // หมวดหมู่
    { wch: 15 }, // รหัสสินค้า
    { wch: 35 }, // ชื่อสินค้า
    { wch: 12 }, // ไซส์
    { wch: 20 }, // บาร์โค้ด
    { wch: 15 }, // สต็อกคงเหลือ
    { wch: 10 }  // หน่วยนับ
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลสินค้าทั้งหมด');
  XLSX.writeFile(wb, `products_master_${todayStr}.xlsx`);
}

/**
 * Export Categories and Size Codes to Excel
 */
export function exportReferenceCodesToExcel(categoryCodes = [], sizeCodes = []) {
  const wb = XLSX.utils.book_new();
  const todayStr = new Date().toISOString().split('T')[0];

  // Category Codes Sheet
  const catRows = categoryCodes.map((c, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสหมวดหมู่ (CC)': c.code,
    'ชื่อหมวดหมู่': c.name
  }));
  const wsCat = XLSX.utils.json_to_sheet(catRows);
  wsCat['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'รหัสหมวดหมู่ (CC)');

  // Size Codes Sheet
  const sizeRows = sizeCodes.map((s, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสไซส์ (SS)': s.code,
    'ชื่อไซส์': s.name
  }));
  const wsSize = XLSX.utils.json_to_sheet(sizeRows);
  wsSize['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSize, 'รหัสไซส์ (SS)');

  XLSX.writeFile(wb, `category_size_codes_${todayStr}.xlsx`);
}

/**
 * Generate and download sample Excel Template for Product Import
 */
export function downloadProductImportTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Template Sheet
  const sampleData = [
    {
      'รหัสสินค้า (เว้นได้)': '001',
      'ชื่อสินค้า * (บังคับ)': 'เสื้อชั้นใน Sabina',
      'หมวดหมู่ (เว้นได้)': 'เสื้อชั้นใน',
      'ไซส์ * (บังคับ)': 'M',
      'จำนวนสต็อก * (บังคับ)': 25,
      'บาร์โค้ด (เว้นได้)': '001-04',
      'เกณฑ์แจ้งเตือน (เว้นได้)': 30
    },
    {
      'รหัสสินค้า (เว้นได้)': '001',
      'ชื่อสินค้า * (บังคับ)': 'เสื้อชั้นใน Sabina',
      'หมวดหมู่ (เว้นได้)': 'เสื้อชั้นใน',
      'ไซส์ * (บังคับ)': 'L',
      'จำนวนสต็อก * (บังคับ)': 15,
      'บาร์โค้ด (เว้นได้)': '001-05',
      'เกณฑ์แจ้งเตือน (เว้นได้)': 30
    },
    {
      'รหัสสินค้า (เว้นได้)': '002',
      'ชื่อสินค้า * (บังคับ)': 'เกาะอก Avie',
      'หมวดหมู่ (เว้นได้)': 'เกาะอก',
      'ไซส์ * (บังคับ)': 'free size',
      'จำนวนสต็อก * (บังคับ)': 40,
      'บาร์โค้ด (เว้นได้)': '002-01',
      'เกณฑ์แจ้งเตือน (เว้นได้)': 30
    }
  ];

  const wsTemplate = XLSX.utils.json_to_sheet(sampleData);
  wsTemplate['!cols'] = [
    { wch: 20 }, // รหัสสินค้า (เว้นได้)
    { wch: 30 }, // ชื่อสินค้า * (บังคับ)
    { wch: 20 }, // หมวดหมู่ (เว้นได้)
    { wch: 18 }, // ไซส์ * (บังคับ)
    { wch: 22 }, // จำนวนสต็อก * (บังคับ)
    { wch: 20 }, // บาร์โค้ด (เว้นได้)
    { wch: 22 }  // เกณฑ์แจ้งเตือน (เว้นได้)
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'แบบฟอร์มนำเข้าสินค้า');

  // 2. Instructions Sheet
  const instructions = [
    { 'สรุปกฎ 4 ข้อ': '1. ช่องที่บังคับกรอก (มี 3 ช่อง)', 'คำอธิบาย': 'ชื่อสินค้า *, ไซส์ *, และ จำนวนสต็อก * (ช่องอื่นสามารถเว้นว่างได้เลย)' },
    { 'สรุปกฎ 4 ข้อ': '2. 1 บรรทัด = 1 ไซส์', 'คำอธิบาย': 'ถ้าสินค้า 1 ตัวมีหลายไซส์ ให้ใส่ชื่อสินค้าซ้ำกันในแต่ละแถว ระบบจะรวมเข้าด้วยกันให้' },
    { 'สรุปกฎ 4 ข้อ': '3. การนับสต็อก', 'คำอธิบาย': 'ตัวเลขในช่องจำนวนสต็อก คือ "ยอดคงเหลือจริง ณ ปัจจุบัน" ที่นับได้ (ไม่ใช่ยอดบวกเพิ่ม)' },
    { 'สรุปกฎ 4 ข้อ': '4. สินค้าเดิมในระบบ', 'คำอธิบาย': 'หากชื่อหรือรหัสตรงกับในระบบ ระบบจะอัปเดตสต็อกให้ และไซส์เดิมที่ไม่ได้กรอกในไฟล์จะไม่หายไป' },
    { 'สรุปกฎ 4 ข้อ': '-----------------------', 'คำอธิบาย': '--------------------------------------------------------------------------------' },
    { 'สรุปกฎ 4 ข้อ': 'ชื่อสินค้า * (บังคับ)', 'คำอธิบาย': 'จำเป็นต้องระบุ เช่น เสื้อชั้นใน Sabina, เกาะอก Avie' },
    { 'สรุปกฎ 4 ข้อ': 'ไซส์ * (บังคับ)', 'คำอธิบาย': 'จำเป็นต้องระบุ เช่น Free Size, XS, S, M, L, XL, 38, 40 ฯลฯ' },
    { 'สรุปกฎ 4 ข้อ': 'จำนวนสต็อก * (บังคับ)', 'คำอธิบาย': 'จำเป็นต้องระบุ เป็นตัวเลขจำนวนชิ้นคงเหลือจริง (เช่น 0, 10, 50)' },
    { 'สรุปกฎ 4 ข้อ': 'รหัสสินค้า (เว้นได้)', 'คำอธิบาย': 'รหัสสินค้าประจำตัว เช่น 001, 002 หรือเว้นว่างไว้ได้' },
    { 'สรุปกฎ 4 ข้อ': 'หมวดหมู่ (เว้นได้)', 'คำอธิบาย': 'เช่น เสื้อชั้นใน, เกาะอก (ถ้าเว้นว่าง ระบบจะใส่หมวด "อื่นๆ" ให้อัตโนมัติ)' },
    { 'สรุปกฎ 4 ข้อ': 'บาร์โค้ด (เว้นได้)', 'คำอธิบาย': 'รหัสบาร์โค้ด หรือเว้นว่างไว้ให้ระบบสร้างให้อัตโนมัติ' },
    { 'สรุปกฎ 4 ข้อ': 'เกณฑ์แจ้งเตือน (เว้นได้)', 'คำอธิบาย': 'จำนวนสต็อกขั้นต่ำสำหรับแจ้งเตือนใกล้หมด (ถ้าเว้นว่าง ระบบจะตั้งไว้ที่ 30 ชิ้น)' }
  ];
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 28 }, { wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'คำแนะนำการกรอก');

  XLSX.writeFile(wb, 'product_import_template.xlsx');
  return true;
}

/**
 * Parse and Validate Excel file for Product Import
 */
export async function parseProductsFromExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve({
            success: false,
            error: 'ไฟล์ Excel ไม่มีข้อมูลหรือว่างเปล่า',
            products: [],
            rawRowCount: 0,
            validCount: 0,
            errors: []
          });
          return;
        }

        const errors = [];
        const productsMap = {};

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1
          
          // Map headers flexibly (Thai or English, with or without suffixes)
          const name = String(
            row['ชื่อสินค้า * (บังคับ)'] || row['ชื่อสินค้า *'] || row['ชื่อสินค้า'] || row['Product Name'] || row['name'] || ''
          ).trim();

          const code = String(
            row['รหัสสินค้า (เว้นได้)'] || row['รหัสสินค้า'] || row['Product Code'] || row['code'] || ''
          ).trim();

          const category = String(
            row['หมวดหมู่ (เว้นได้)'] || row['หมวดหมู่'] || row['Category'] || row['category'] || ''
          ).trim() || 'อื่นๆ';

          const size = String(
            row['ไซส์ * (บังคับ)'] || row['ไซส์ *'] || row['ไซส์'] || row['Size'] || row['size'] || 'free size'
          ).trim();

          const rawStock = (
            row['จำนวนสต็อก * (บังคับ)'] !== undefined && row['จำนวนสต็อก * (บังคับ)'] !== '' ? row['จำนวนสต็อก * (บังคับ)'] :
            row['จำนวนสต็อก *'] !== undefined && row['จำนวนสต็อก *'] !== '' ? row['จำนวนสต็อก *'] :
            row['จำนวนสต็อก'] !== undefined && row['จำนวนสต็อก'] !== '' ? row['จำนวนสต็อก'] :
            row['สต็อกเริ่มต้น *'] !== undefined && row['สต็อกเริ่มต้น *'] !== '' ? row['สต็อกเริ่มต้น *'] :
            row['สต็อกเริ่มต้น'] !== undefined && row['สต็อกเริ่มต้น'] !== '' ? row['สต็อกเริ่มต้น'] :
            row['สต็อก'] !== undefined && row['สต็อก'] !== '' ? row['สต็อก'] :
            row['Stock'] !== undefined && row['Stock'] !== '' ? row['Stock'] :
            row['stock'] !== undefined && row['stock'] !== '' ? row['stock'] : 0
          );

          const barcode = String(
            row['บาร์โค้ด (เว้นได้)'] || row['บาร์โค้ด'] || row['Barcode'] || row['barcode'] || ''
          ).trim();

          const thresholdVal = (
            row['เกณฑ์แจ้งเตือน (เว้นได้)'] || row['เกณฑ์แจ้งเตือน'] || row['Threshold'] || row['threshold'] || 30
          );

          if (!name) {
            errors.push(`แถวที่ ${rowNum}: ไม่ได้ระบุชื่อสินค้า`);
            return;
          }

          const stock = parseInt(rawStock, 10);
          if (isNaN(stock) || stock < 0) {
            errors.push(`แถวที่ ${rowNum}: จำนวนสต็อกไม่ถูกต้อง ("${rawStock}")`);
            return;
          }

          const threshold = parseInt(thresholdVal, 10) || 30;
          const productKey = code ? `code_${code}` : `name_${name.toLowerCase()}`;

          if (!productsMap[productKey]) {
            productsMap[productKey] = {
              product_code: code || null,
              name: name,
              category: category,
              threshold: threshold,
              sizes: {},
              totalStock: 0,
              barcode: barcode || null,
              rowIndices: []
            };
          }

          productsMap[productKey].rowIndices.push(rowNum);

          const sizeKey = size || 'free size';
          productsMap[productKey].sizes[sizeKey] = {
            stock: stock,
            barcode: barcode || ''
          };
        });

        // Recalculate total stocks
        const parsedProducts = Object.values(productsMap).map(p => {
          const totalStock = Object.values(p.sizes).reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
          return {
            ...p,
            totalStock,
            total_stock: totalStock
          };
        });

        resolve({
          success: true,
          products: parsedProducts,
          rawRowCount: rawJson.length,
          validCount: parsedProducts.length,
          errors: errors
        });
      } catch (err) {
        console.error('Error parsing Excel:', err);
        resolve({
          success: false,
          error: 'ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message,
          products: [],
          rawRowCount: 0,
          validCount: 0,
          errors: [err.message]
        });
      }
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsArrayBuffer(file);
  });
}
