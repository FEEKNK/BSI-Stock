export const validateProduct = (data) => {
  const errors = {};
  
  if (!data.name || data.name.trim() === '') {
    errors.name = 'กรุณาระบุชื่อสินค้า';
  }
  
  if (!data.category || data.category.trim() === '') {
    errors.category = 'กรุณาเลือกหมวดหมู่';
  }
  
  if (data.price !== undefined && data.price !== '' && data.price < 0) {
    errors.price = 'ราคาต้องไม่ติดลบ';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateBarcode = (code) => {
  if (!code || code.trim() === '') return false;
  // Can add more specific barcode validation here if needed
  return true;
};
