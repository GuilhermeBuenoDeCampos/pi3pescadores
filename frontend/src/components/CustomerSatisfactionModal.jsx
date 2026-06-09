import { useMemo, useState } from 'react';
import { FiStar, FiX } from 'react-icons/fi';
import styles from './CustomerSatisfactionModal.module.css';

const CRITERIA = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'entrega', label: 'Entrega' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'preco', label: 'Preço' },
  { key: 'experiencia', label: 'Experiência' },
];

function buildInitialRatings() {
  return CRITERIA.reduce((acc, item) => {
    acc[item.key] = 0;
    return acc;
  }, {});
}

export default function CustomerSatisfactionModal({ isOpen, onClose, onSubmit, loading = false, error = '' }) {
  const [ratings, setRatings] = useState(buildInitialRatings);
  const [localError, setLocalError] = useState('');

  const allRated = useMemo(
    () => CRITERIA.every((item) => ratings[item.key] >= 1 && ratings[item.key] <= 5),
    [ratings]
  );

  if (!isOpen) {
    return null;
  }

  const setScore = (key, score) => {
    setRatings((current) => ({ ...current, [key]: score }));
  };

  const handleClose = () => {
    setLocalError('');
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!allRated) {
      setLocalError('Avalie todos os critérios antes de enviar.');
      return;
    }

    setLocalError('');
    await onSubmit?.({
      atendimento: ratings.atendimento,
      entrega: ratings.entrega,
      qualidade: ratings.qualidade,
      preco: ratings.preco,
      experiencia: ratings.experiencia,
    });
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="customer-satisfaction-title">
        <button type="button" className={styles.closeButton} aria-label="Fechar avaliação" onClick={handleClose}>
          <FiX />
        </button>

        <span className={styles.kicker}>Avaliação de satisfação</span>
        <h2 id="customer-satisfaction-title">Como foi sua experiência?</h2>
        <p>Avalie cada critério de 1 a 5 estrelas.</p>

        <div className={styles.criteriaList}>
          {CRITERIA.map((criterion) => (
            <div key={criterion.key} className={styles.criterionRow}>
              <strong>{criterion.label}</strong>
              <div className={styles.starRow} aria-label={`Selecionar nota para ${criterion.label}`}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`${styles.starButton} ${ratings[criterion.key] >= score ? styles.starButtonActive : ''}`}
                    onClick={() => setScore(criterion.key, score)}
                    aria-label={`${score} estrela${score > 1 ? 's' : ''} para ${criterion.label}`}
                  >
                    <FiStar />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {(localError || error) && <div className={styles.errorBox}>{localError || error}</div>}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={handleClose}>
            Agora não
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
      </section>
    </div>
  );
}