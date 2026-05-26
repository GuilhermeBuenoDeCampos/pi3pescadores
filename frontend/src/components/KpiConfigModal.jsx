import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { atualizarKpiConfig } from '../services/kpiConfig';
import styles from './KpiConfigModal.module.css';

function KpiConfigModal({ isOpen, onClose, config, onConfigUpdated }) {
  const [faturamentoBaixo, setFaturamentoBaixo] = useState(config?.faturamento_baixo || 500);
  const [faturamentoAlto, setFaturamentoAlto] = useState(config?.faturamento_alto || 5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (!faturamentoBaixo || !faturamentoAlto) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    if (parseFloat(faturamentoBaixo) >= parseFloat(faturamentoAlto)) {
      setError('Faturamento baixo deve ser menor que faturamento alto');
      return;
    }

    setLoading(true);
    try {
      const updated = await atualizarKpiConfig(faturamentoBaixo, faturamentoAlto);
      onConfigUpdated(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Configurar Faturamento</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.fieldGroup}>
            <label htmlFor="baixo">Faturamento Baixo (R$)</label>
            <input
              id="baixo"
              type="number"
              step="0.01"
              value={faturamentoBaixo}
              onChange={(e) => setFaturamentoBaixo(e.target.value)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="alto">Faturamento Alto (R$)</label>
            <input
              id="alto"
              type="number"
              step="0.01"
              value={faturamentoAlto}
              onChange={(e) => setFaturamentoAlto(e.target.value)}
              placeholder="0.00"
              disabled={loading}
            />
          </div>

          <p className={styles.info}>
            O card exibirá cores/imagens diferentes baseado nesta configuração:
            <br />
            • Abaixo de R$ {parseFloat(faturamentoBaixo).toFixed(2)}: Faturamento Baixo
            <br />
            • Entre R$ {parseFloat(faturamentoBaixo).toFixed(2)} e R$ {parseFloat(faturamentoAlto).toFixed(2)}: Faturamento Médio
            <br />
            • Acima de R$ {parseFloat(faturamentoAlto).toFixed(2)}: Faturamento Alto
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KpiConfigModal;
