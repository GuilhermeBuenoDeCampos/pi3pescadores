import styles from './CartAbandonmentStates.module.css';

export function LoadingState() {
  return <div className={styles.state}>Carregando dados de abandono...</div>;
}

export function ErrorState({ message }) {
  return (
    <div className={`${styles.state} ${styles.error}`}>
      <span>{message || 'Nao foi possivel carregar os dados.'}</span>
      {String(message || '').toLowerCase().includes('sessao') ? (
        <a href="/login" className={styles.action}>Entrar novamente</a>
      ) : null}
    </div>
  );
}

export function EmptyState() {
  return <div className={styles.state}>Nenhum carrinho encontrado para o periodo selecionado.</div>;
}
