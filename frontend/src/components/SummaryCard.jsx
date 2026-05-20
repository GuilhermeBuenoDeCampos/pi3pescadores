import React from 'react';
import styles from './SummaryCard.module.css';

const SummaryCard = ({ subtotal, shipping, total, onCheckout, disabled }) => {
  return (
    <aside className={styles.summaryCard}>
      <h3 className={styles.title}>Resumo do pedido</h3>
      <div className={styles.row}>
        <span>Subtotal</span>
        <span>R$ {subtotal.toFixed(2)}</span>
      </div>
      <div className={styles.row}>
        <span>Frete</span>
        <span>R$ {shipping.toFixed(2)}</span>
      </div>
      <div className={styles.totalRow}>
        <span>Total</span>
        <span className={styles.total}>R$ {total.toFixed(2)}</span>
      </div>
      <button
        className={styles.checkoutBtn}
        onClick={onCheckout}
        disabled={disabled}
      >
        Finalizar compra
      </button>
    </aside>
  );
};

export default SummaryCard;
