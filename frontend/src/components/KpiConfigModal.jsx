import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { atualizarKpiConfig } from '../services/kpiConfig';
import styles from './KpiConfigModal.module.css';

function KpiConfigModal({ isOpen, onClose, config, onConfigUpdated, type = 'faturamento' }) {
  const [faturamentoBaixo, setFaturamentoBaixo] = useState(config?.faturamento_baixo || 500);
  const [faturamentoAlto, setFaturamentoAlto] = useState(config?.faturamento_alto || 5000);
  const [recompraBaixa, setRecompraBaixa] = useState(config?.recomprabaixa || 20);
  const [recompraAlta, setRecompraAlta] = useState(config?.recompraalta || 50);
  const [ticketBaixo, setTicketBaixo] = useState(config?.ticketbaixo || 75);
  const [ticketAlto, setTicketAlto] = useState(config?.ticketalto || 200);
  const [visitanteBaixo, setVisitanteBaixo] = useState(config?.visitantebaixo || 100);
  const [visitanteAlto, setVisitanteAlto] = useState(config?.visitantealto || 500);
  const [conversaoBaixa, setConversaoBaixa] = useState(config?.conversaobaixa || 2);
  const [conversaoAlta, setConversaoAlta] = useState(config?.conversaoalta || 8);
  const [abandonoBaixa, setAbandonoBaixa] = useState(config?.abandonobaixa || 30);
  const [abandonoAlta, setAbandonoAlta] = useState(config?.abandonoalta || 60);
  const [cancelamentoBaixa, setCancelamentoBaixa] = useState(config?.cancelamentobaixa || 5);
  const [cancelamentoAlta, setCancelamentoAlta] = useState(config?.cancelamentoalta || 15);
  const [satisfacaoBaixa, setSatisfacaoBaixa] = useState(config?.satisfacaobaixa || 3);
  const [satisfacaoAlta, setSatisfacaoAlta] = useState(config?.satisfacaoalta || 4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isRecompra = type === 'recompra';
  const isTicket = type === 'ticket';
  const isVisitante = type === 'visitante';
  const isConversao = type === 'conversao';
  const isAbandono = type === 'abandono';
  const isCancelamento = type === 'cancelamento';
  const isSatisfacao = type === 'satisfacao';
  const isNewRate = isAbandono || isCancelamento || isSatisfacao;

  useEffect(() => {
    if (isOpen) {
      setFaturamentoBaixo(config?.faturamento_baixo || 500);
      setFaturamentoAlto(config?.faturamento_alto || 5000);
      setRecompraBaixa(config?.recomprabaixa || 20);
      setRecompraAlta(config?.recompraalta || 50);
      setTicketBaixo(config?.ticketbaixo || 75);
      setTicketAlto(config?.ticketalto || 200);
      setVisitanteBaixo(config?.visitantebaixo || 100);
      setVisitanteAlto(config?.visitantealto || 500);
      setConversaoBaixa(config?.conversaobaixa || 2);
      setConversaoAlta(config?.conversaoalta || 8);
      setAbandonoBaixa(config?.abandonobaixa || 30);
      setAbandonoAlta(config?.abandonoalta || 60);
      setCancelamentoBaixa(config?.cancelamentobaixa || 5);
      setCancelamentoAlta(config?.cancelamentoalta || 15);
      setSatisfacaoBaixa(config?.satisfacaobaixa || 3);
      setSatisfacaoAlta(config?.satisfacaoalta || 4);
      setError('');
    }
  }, [config, isOpen]);

  const handleSave = async () => {
    setError('');

    if (isRecompra && (!recompraBaixa || !recompraAlta)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (isTicket && (!ticketBaixo || !ticketAlto)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (isVisitante && (!visitanteBaixo || !visitanteAlto)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (isConversao && (!conversaoBaixa || !conversaoAlta)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    const newRateLow = isAbandono ? abandonoBaixa : isCancelamento ? cancelamentoBaixa : satisfacaoBaixa;
    const newRateHigh = isAbandono ? abandonoAlta : isCancelamento ? cancelamentoAlta : satisfacaoAlta;

    if (isNewRate && (newRateLow === '' || newRateHigh === '')) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (!isRecompra && !isTicket && !isVisitante && !isConversao && !isNewRate && (!faturamentoBaixo || !faturamentoAlto)) {
      setError('Todos os campos sao obrigatorios');
      return;
    }

    if (isRecompra && parseFloat(recompraBaixa) >= parseFloat(recompraAlta)) {
      setError('Recompra baixa deve ser menor que recompra alta');
      return;
    }

    if (isTicket && parseFloat(ticketBaixo) >= parseFloat(ticketAlto)) {
      setError('Ticket baixo deve ser menor que ticket alto');
      return;
    }

    if (isVisitante && parseFloat(visitanteBaixo) >= parseFloat(visitanteAlto)) {
      setError('Visitante baixo deve ser menor que visitante alto');
      return;
    }

    if (isConversao && parseFloat(conversaoBaixa) >= parseFloat(conversaoAlta)) {
      setError('Conversao baixa deve ser menor que conversao alta');
      return;
    }

    if (isNewRate && parseFloat(newRateLow) >= parseFloat(newRateHigh)) {
      setError('O limite baixo deve ser menor que o limite alto');
      return;
    }

    if ((isAbandono || isCancelamento) && parseFloat(newRateHigh) > 100) {
      setError('A taxa deve estar entre 0 e 100');
      return;
    }

    if (isSatisfacao && parseFloat(newRateHigh) > 5) {
      setError('A satisfacao deve estar entre 0 e 5');
      return;
    }

    if (!isRecompra && !isTicket && !isVisitante && !isConversao && !isNewRate && parseFloat(faturamentoBaixo) >= parseFloat(faturamentoAlto)) {
      setError('Faturamento baixo deve ser menor que faturamento alto');
      return;
    }

    setLoading(true);
    try {
      const updated = await atualizarKpiConfig({
        faturamento_baixo: faturamentoBaixo,
        faturamento_alto: faturamentoAlto,
        ticketbaixo: ticketBaixo,
        ticketalto: ticketAlto,
        recomprabaixa: recompraBaixa,
        recompraalta: recompraAlta,
        visitantebaixo: visitanteBaixo,
        visitantealto: visitanteAlto,
        conversaobaixa: conversaoBaixa,
        conversaoalta: conversaoAlta,
        abandonobaixa: abandonoBaixa,
        abandonoalta: abandonoAlta,
        cancelamentobaixa: cancelamentoBaixa,
        cancelamentoalta: cancelamentoAlta,
        satisfacaobaixa: satisfacaoBaixa,
        satisfacaoalta: satisfacaoAlta,
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
          <h2>{isRecompra ? 'Configurar Recompra' : isTicket ? 'Configurar Ticket Medio' : isVisitante ? 'Configurar Visitantes' : isConversao ? 'Configurar Conversao' : isAbandono ? 'Configurar Abandono' : isCancelamento ? 'Configurar Cancelamento' : isSatisfacao ? 'Configurar Satisfacao' : 'Configurar Faturamento'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {isNewRate ? (
            <>
              <div className={styles.fieldGroup}>
                <label htmlFor={`${type}-baixo`}>Limite baixo {isSatisfacao ? '(nota)' : '(%)'}</label>
                <input
                  id={`${type}-baixo`}
                  type="number"
                  min="0"
                  max={isSatisfacao ? 5 : 100}
                  step="0.01"
                  value={isAbandono ? abandonoBaixa : isCancelamento ? cancelamentoBaixa : satisfacaoBaixa}
                  onChange={(event) => {
                    if (isAbandono) setAbandonoBaixa(event.target.value);
                    if (isCancelamento) setCancelamentoBaixa(event.target.value);
                    if (isSatisfacao) setSatisfacaoBaixa(event.target.value);
                  }}
                  disabled={loading}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor={`${type}-alto`}>Limite alto {isSatisfacao ? '(nota)' : '(%)'}</label>
                <input
                  id={`${type}-alto`}
                  type="number"
                  min="0"
                  max={isSatisfacao ? 5 : 100}
                  step="0.01"
                  value={isAbandono ? abandonoAlta : isCancelamento ? cancelamentoAlta : satisfacaoAlta}
                  onChange={(event) => {
                    if (isAbandono) setAbandonoAlta(event.target.value);
                    if (isCancelamento) setCancelamentoAlta(event.target.value);
                    if (isSatisfacao) setSatisfacaoAlta(event.target.value);
                  }}
                  disabled={loading}
                />
              </div>
              <p className={styles.info}>
                {isSatisfacao
                  ? 'Abaixo do limite baixo: critico. Entre os limites: atencao. Acima do limite alto: bom.'
                  : 'Abaixo do limite baixo: bom. Entre os limites: atencao. Acima do limite alto: critico.'}
              </p>
            </>
          ) : isRecompra ? (
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
          ) : isTicket ? (
            <>
              <div className={styles.fieldGroup}>
                <label htmlFor="ticket-baixo">Ticket Baixo (R$)</label>
                <input
                  id="ticket-baixo"
                  type="number"
                  step="0.01"
                  value={ticketBaixo}
                  onChange={(e) => setTicketBaixo(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="ticket-alto">Ticket Alto (R$)</label>
                <input
                  id="ticket-alto"
                  type="number"
                  step="0.01"
                  value={ticketAlto}
                  onChange={(e) => setTicketAlto(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <p className={styles.info}>
                O card exibira imagens diferentes baseado nesta configuracao:
                <br />
                Abaixo de R$ {parseFloat(ticketBaixo || 0).toFixed(2)}: Ticket Baixo
                <br />
                Entre R$ {parseFloat(ticketBaixo || 0).toFixed(2)} e R$ {parseFloat(ticketAlto || 0).toFixed(2)}: Ticket Medio
                <br />
                Acima de R$ {parseFloat(ticketAlto || 0).toFixed(2)}: Ticket Alto
              </p>
            </>
          ) : isVisitante ? (
            <>
              <div className={styles.fieldGroup}>
                <label htmlFor="visitante-baixo">Visitante Baixo</label>
                <input
                  id="visitante-baixo"
                  type="number"
                  step="1"
                  value={visitanteBaixo}
                  onChange={(e) => setVisitanteBaixo(e.target.value)}
                  placeholder="0"
                  disabled={loading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="visitante-alto">Visitante Alto</label>
                <input
                  id="visitante-alto"
                  type="number"
                  step="1"
                  value={visitanteAlto}
                  onChange={(e) => setVisitanteAlto(e.target.value)}
                  placeholder="0"
                  disabled={loading}
                />
              </div>

              <p className={styles.info}>
                O card exibira imagens diferentes baseado nesta configuracao:
                <br />
                Abaixo de {parseFloat(visitanteBaixo || 0).toFixed(0)} visitantes: Visitante Baixo
                <br />
                Entre {parseFloat(visitanteBaixo || 0).toFixed(0)} e {parseFloat(visitanteAlto || 0).toFixed(0)} visitantes: Visitante Medio
                <br />
                Acima de {parseFloat(visitanteAlto || 0).toFixed(0)} visitantes: Visitante Alto
              </p>
            </>
          ) : isConversao ? (
            <>
              <div className={styles.fieldGroup}>
                <label htmlFor="conversao-baixa">Conversao Baixa (%)</label>
                <input
                  id="conversao-baixa"
                  type="number"
                  step="0.01"
                  value={conversaoBaixa}
                  onChange={(e) => setConversaoBaixa(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="conversao-alta">Conversao Alta (%)</label>
                <input
                  id="conversao-alta"
                  type="number"
                  step="0.01"
                  value={conversaoAlta}
                  onChange={(e) => setConversaoAlta(e.target.value)}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <p className={styles.info}>
                O card exibira imagens diferentes baseado nesta configuracao:
                <br />
                Abaixo de {parseFloat(conversaoBaixa || 0).toFixed(2)}%: Conversao Baixa
                <br />
                Entre {parseFloat(conversaoBaixa || 0).toFixed(2)}% e {parseFloat(conversaoAlta || 0).toFixed(2)}%: Conversao Media
                <br />
                Acima de {parseFloat(conversaoAlta || 0).toFixed(2)}%: Conversao Alta
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
