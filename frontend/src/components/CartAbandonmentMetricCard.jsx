import styles from './CartAbandonmentMetricCard.module.css';

function CartAbandonmentMetricCard({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <article className={`${styles.card} ${styles[tone] || ''}`}>
      <div className={styles.icon}>{Icon ? <Icon size={20} /> : null}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default CartAbandonmentMetricCard;
