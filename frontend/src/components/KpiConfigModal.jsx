import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { atualizarKpiConfig } from '../services/kpiConfig';
import styles from './KpiConfigModal.module.css';

function KpiConfigModal({ isOpen, onClose, config, onConfigUpdated, type = 'faturamento' }) {
  const [faturamentoBaixo, setFaturamentoBaixo] = useState(config?.faturamento_baixo || 500);
  const [faturamentoAlto, setFaturamentoAlto] = useState(config?.faturamento_alto || 5000);
  const [recompraBaixa, setRecompraBaixa] = useState(config?.recomprabaixa || 20);
  const [recompraAlta, setRecompraAlta] = useState(config?.recompraalta || 50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isRecompra = type === 'recompra';

  useEffect(() => {
    if (isOpen) {
      setFaturamentoBaixo(config?.faturamento_baixo || 500);
      setFaturamentoAlto(config?.faturamento_alto || 5000);
      setRecompraBaixa(config?.recomprabaixa || 20);
      setRecompraAlta(config?.recompraalta || 50);
      setError('');
    }
  }, [config, isOpen]);

  const handleSave = async () => {
    setError('');

    if (isRecompra && (!recompraBaixa || !recompraAlta)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (!isRecompra && (!faturamentoBaixo || !faturamentoAlto)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (isRecompra && parseFloat(recompraBaixa) >= parseFloat(recompraAlta)) {
      setError('Recompra baixa deve ser menor que recompra alta');
      return;
    }

    if (!isRecompra && parseFloat(faturamentoBaixo) >= parseFloat(faturamentoAlto)) {
      setError('Faturamento baixo deve ser menor que faturamento alto');
      return;
    }

    setLoading(true);
    try {
      const updated = await atualizarKpiConfig({
        faturamento_baixo: faturamentoBaixo,
        faturamento_alto: faturamentoAlto,
        recomprabaixa: recompraBaixa,
        recompraalta: recompraAlta,
      });
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
          <h2>{isRecompra ? 'Configurar Recompra' : 'Configurar Faturamento'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {isRecompra ? (
            <>
              <div className={styles.fieldGroup}>
                <label htmlFor="recompra-baixa">Recompra Baixa (%)</label>
                <input
                  id="recompra-baixa"
                  type="number"
                  step="0.01"
                  value={recompraBaixa}
                  onChange={(e) => setRecompraBaixa(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="recompra-alta">Recompra Alta (%)</label>
                <input
                  id="recompra-alta"
                  type="number"
                  step="0.01"
                  value={recompraAlta}
                  onChange={(e) => setRecompraAlta(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <p className={styles.info}>
                O card exibira imagens diferentes baseado nesta configuracao:
                <br />
                Abaixo de {parseFloat(recompraBaixa || 0).toFixed(2)}%: Recompra Baixa
                <br />
                Entre {parseFloat(recompraBaixa || 0).toFixed(2)}% e {parseFloat(recompraAlta || 0).toFixed(2)}%: Recompra Media
                <br />
                Acima de {parseFloat(recompraAlta || 0).toFixed(2)}%: Recompra Alta
              </p>
            </>
          ) : (
            <>
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
                O card exibira cores/imagens diferentes baseado nesta configuracao:
                <br />
                Abaixo de R$ {parseFloat(faturamentoBaixo || 0).toFixed(2)}: Faturamento Baixo
                <br />
                Entre R$ {parseFloat(faturamentoBaixo || 0).toFixed(2)} e R$ {parseFloat(faturamentoAlto || 0).toFixed(2)}: Faturamento Medio
                <br />
                Acima de R$ {parseFloat(faturamentoAlto || 0).toFixed(2)}: Faturamento Alto
              </p>
            </>
          )}
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
