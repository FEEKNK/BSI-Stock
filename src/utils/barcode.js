// Category name -> 2-digit code mapping
const CATEGORY_CODE_MAP = {
  'เสื้อชั้นใน': '10',
  'ชุดชั้นใน': '11',
  'กางเกงใน': '20',
  'อุปกรณ์เสริม': '30',
  'อื่นๆ': '90',
};

// Size name -> 2-digit code mapping  
const SIZE_CODE_MAP = {
  'free size': '00',
  'ฟรีไซส์': '00',
  'freesize': '00',
  '2xs': '01',
  'xs': '02',
  's': '03',
  'm': '04',
  'l': '05',
  'xl': '06',
  '2xl': '07',
  '3xl': '08',
  '4xl': '09',
  '32': '32',
  '34': '34',
  '36': '36',
  '38': '38',
  '40': '40',
  '42': '42',
  '44': '44',
  '46': '46',
  '48': '48',
  '50': '50',
};

export function getCategoryCode(categoryName) {
  return CATEGORY_CODE_MAP[categoryName] || '90';
}

export function getSizeCode(sizeName) {
  if (!sizeName) return '99';
  return SIZE_CODE_MAP[sizeName.toLowerCase().trim()] || '99';
}

/**
 * Build a structured 12-digit barcode from parts
 * Format: [CC][PPP][SS][NNNNN]
 *   CC    = 2-digit category code
 *   PPP   = 3-digit product code
 *   SS    = 2-digit size code
 *   NNNNN = 5-digit running number
 */
export function buildStructuredBarcode(categoryCode, productCode, sizeCode, runningNumber) {
  const cc = String(categoryCode || '90').padStart(2, '0');
  const ppp = String(productCode || '000').padStart(3, '0');
  const ss = String(sizeCode || '99').padStart(2, '0');
  const nnnnn = String(runningNumber || '00001').padStart(5, '0');
  return `${cc}${ppp}${ss}${nnnnn}`;
}

/**
 * Fetch next running number from server and build a structured barcode.
 * Falls back to timestamp-based barcode if server is unavailable.
 */
export async function generateStructuredBarcode(categoryName, productCode, sizeName) {
  const cc = getCategoryCode(categoryName);
  const ppp = String(productCode || '000').padStart(3, '0');
  const ss = getSizeCode(sizeName);

  try {
    const res = await fetch('/api/barcode-counter/next', { method: 'POST' });
    if (!res.ok) throw new Error('API failed');
    const data = await res.json();
    if (!data || data.value === undefined || data.value === null) {
      throw new Error('Invalid counter response');
    }
    return buildStructuredBarcode(cc, ppp, ss, data.value);
  } catch (err) {
    console.warn('Barcode generation API fallback:', err);
    // Fallback: use last 5 digits of timestamp
    const fallback = Date.now().toString().slice(-5);
    return buildStructuredBarcode(cc, ppp, ss, fallback);
  }
}

/**
 * Legacy: random 12-digit barcode (kept for backward compatibility)
 */
export const generateBarcodeValue = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${timestamp}${random}`; // 12 digits
};

export const formatBarcodeForDisplay = (value) => {
  if (!value) return '';
  return value.match(/.{1,4}/g)?.join(' ') || value;
};

/**
 * Decode a structured barcode into readable parts.
 * Returns null if not structured format.
 */
export function decodeStructuredBarcode(barcode) {
  if (!barcode || barcode.length !== 12) return null;
  
  const cc = barcode.slice(0, 2);
  const ppp = barcode.slice(2, 5);
  const ss = barcode.slice(5, 7);
  const nnnnn = barcode.slice(7, 12);

  return { categoryCode: cc, productCode: ppp, sizeCode: ss, runningNumber: nnnnn };
}
