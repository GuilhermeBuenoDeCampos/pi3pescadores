import styles from './OrderStatusBadge.module.css';

const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function OrderStatusBadge({ status }) {
  const normalized = status || 'pendente';
  const className = `${styles.badge} ${styles[normalized] || styles.pendente}`;

  return (
    <span className={className}>
      {STATUS_LABELS[normalized] || normalized}
    </span>
  );
}

export { STATUS_LABELS };
export default OrderStatusBadge;
