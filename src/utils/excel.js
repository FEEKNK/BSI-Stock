import * as XLSX from 'xlsx';

/**
 * Helper to auto-calculate column widths
 */
function calculateColumnWidths(data, headers = null) {
  if (!data || data.length === 0) return [];
  
  const keys = headers || Object.keys(data[0]);
  return keys.map(key => {
    // Header length (Thai character approximation + padding)
    let maxLen = Math.max(String(key).length * 1.5, 10);
    
    data.forEach(row => {
      const val = row[key];
      if (val !== undefined && val !== null) {
        const strVal = String(val);
        // Add extra width for Thai characters or long descriptions
        const estimatedLen = strVal.length * 1.3;
        if (estimatedLen > maxLen) {
          maxLen = estimatedLen;
        }
      }
    });
    
    return { wch: Math.min(Math.max(Math.ceil(maxLen) + 3, 12), 50) };
  });
}

/**
 * Export generic data to Excel (.xlsx)
 */
export function exportToExcel(data, fileName = 'export', sheetName = 'Sheet1', customColWidths = null) {
  if (!data || data.length === 0) {
    alert('ไม่มีข้อมูลสำหรับส่งออก Excel');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = customColWidths || calculateColumnWidths(data);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}

/**
 * Export Stock Matrix & Details to Excel
 */
export function exportStockReportToExcel(groupedStockMatrix, products = []) {
  const wb = XLSX.utils.book_new();
  const todayStr = new Date().toISOString().split('T')[0];

  // --- Sheet 1: รายการสต็อกสินค้าตามไซส์ (Detailed List) ---
  const detailedRows = [];
  let seq = 1;

  groupedStockMatrix.forEach(group => {
    group.products.forEach(p => {
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
    group.products.forEach(p => {
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
 * Export Dispensing History to Excel
 */
export function exportHistoryToExcel(history = []) {
  if (!history || history.length === 0) {
    alert('ไม่มีข้อมูลประวัติสำหรับส่งออก Excel');
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const rows = history.map((record, index) => {
    const rawDate = record.dispensed_date || record.created_at;
    let dateStr = '-';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleString('th-TH');
      }
    }

    return {
      'ลำดับ': index + 1,
      'วัน/เวลาทำรายการ': dateStr,
      'ประเภท': record.type === 'IN' ? 'รับเข้า' : 'เบิกออก',
      'HN': record.hn || '-',
      'รหัสสินค้า': record.product_code || '-',
      'ชื่อสินค้า': record.product_name || '-',
      'ไซส์': record.size || '-',
      'จำนวน': record.quantity || 0,
      'ผู้เบิก/ผู้รับ': record.seller || '-',
      'หมายเหตุ': record.note || '-'
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 22 }, // วัน/เวลาทำรายการ
    { wch: 12 }, // ประเภท
    { wch: 15 }, // HN
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

/**
 * Export Products Master to Excel
 */
export function exportProductsToExcel(products = []) {
  if (!products || products.length === 0) {
    alert('ไม่มีข้อมูลสินค้าสำหรับส่งออก Excel');
    return;
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

