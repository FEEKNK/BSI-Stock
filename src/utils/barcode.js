export const generateBarcodeValue = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${timestamp}${random}`; // 12 digits
};

export const formatBarcodeForDisplay = (value) => {
  if (!value) return '';
  return value.match(/.{1,4}/g)?.join(' ') || value;
};
