function OrderNumber({ numero }) {
  const parts = (numero || '').split('-');
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      result.push(
        <span key={`h-${i}`} style={{ fontFamily: 'Arial, sans-serif' }}>-</span>
      );
    }
    result.push(parts[i]);
  }
  return result;
}

export default OrderNumber;
