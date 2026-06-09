import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OrderStatusBadge from '../components/OrderStatusBadge';
import CustomerSatisfactionModal from '../components/CustomerSatisfactionModal';
import { criarAvaliacao, fetchMinhaAvaliacaoPedido, fetchMeuPedido, getAuthToken, getImageUrl } from '../services/api';
import { formatPrice } from '../utils/productUtils';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import styles from './OrderDetailsPage.module.css';

const STEPS = ['pendente', 'confirmado', 'preparando', 'enviado', 'concluido'];
const STEP_LABELS = {
  pendente: 'Pedido recebido',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  concluido: 'Concluído',
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getProductImage(item) {
  return item.produto?.imagens?.[0]?.url ? getImageUrl(item.produto.imagens[0].url) : semImagem;
}

function OrderDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      try {
        setLoading(true);
        setError('');
        const data = await fetchMeuPedido(id);
        if (active) setOrder(data);
      } catch (err) {
        if (active) setError(err.message || 'Nao foi possivel carregar o pedido.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadReview() {
      if (!id || !getAuthToken()) {
        return;
      }

      try {
        const avaliacao = await fetchMinhaAvaliacaoPedido(id);
        if (!active) return;

        setExistingReview(avaliacao);
      } catch (err) {
        if (!active) return;
        if (err?.message) {
          setReviewError('');
        }
      }
    }

    loadReview();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!order || existingReview) {
      return;
    }

    const shouldPromptReview = location.state?.created || order.status === 'concluido';
    if (shouldPromptReview) {
      setIsReviewModalOpen(true);
    }
  }, [existingReview, location.state?.created, order]);

  useEffect(() => {
    if (existingReview) {
      setIsReviewModalOpen(false);
    }
  }, [existingReview]);

  const activeStepIndex = useMemo(() => {
    if (!order || order.status === 'cancelado') return -1;
    return STEPS.indexOf(order.status);
  }, [order]);

  const canReviewOrder = Boolean(order && !existingReview && order.status !== 'cancelado' && (location.state?.created || order.status === 'concluido'));

  const handleReviewSubmit = async (payload) => {
    try {
      setReviewSubmitting(true);
      setReviewError('');
      setReviewSuccess('');

      const avaliacao = await criarAvaliacao({
        pedido_id: Number(id),
        ...payload,
      });

      setExistingReview(avaliacao);
      setReviewSuccess('Avaliação enviada com sucesso. Obrigado pela sua avaliação.');
      setIsReviewModalOpen(false);
    } catch (err) {
      setReviewError(err.message || 'Não foi possível enviar sua avaliação.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <Header />
      <main className={styles.page}>
        <Link to="/meus-pedidos" className={styles.backLink}>Voltar aos pedidos</Link>

        {location.state?.created && (
          <div className={styles.successNotice}>Pedido criado com sucesso. Ele já está salvo no seu histórico.</div>
        )}

        {reviewSuccess && <div className={styles.reviewSuccess}>{reviewSuccess}</div>}

        {canReviewOrder && (
          <section className={styles.reviewPromptCard}>
            <div>
              <span className={styles.reviewKicker}>Satisfação do cliente</span>
              <h2>Conte como foi sua experiência</h2>
              <p>Uma avaliação rápida ajuda a equipe a melhorar atendimento, entrega, qualidade, preço e experiência.</p>
            </div>
            <button type="button" className={styles.reviewPromptButton} onClick={() => setIsReviewModalOpen(true)}>
              Avaliar pedido
            </button>
          </section>
        )}

        {existingReview && (
          <section className={styles.reviewPromptCard}>
            <div>
              <span className={styles.reviewKicker}>Avaliação registrada</span>
              <h2>Avaliação registrada com sucesso</h2>
              <p>Sua nota ficou em {existingReview.nota} estrela(s).</p>
            </div>
            <div className={styles.reviewStarsCompact} aria-label={`Avaliação de ${existingReview.nota} estrelas`}>
              {[1, 2, 3, 4, 5].map((score) => (
                <FiStar key={score} className={score <= existingReview.nota ? styles.starFilled : styles.starEmpty} />
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <section className={styles.statePanel}>Carregando pedido...</section>
        ) : error ? (
          <section className={styles.errorPanel}>{error}</section>
        ) : order ? (
          <>
            <section className={styles.hero}>
              <div>
                <span className={styles.label}>Pedido</span>
                <h1>{order.numero_pedido}</h1>
                <p>Criado em {formatDate(order.criado_em)}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </section>

            <section className={styles.timeline}>
              {order.status === 'cancelado' ? (
                <div className={styles.cancelled}>Este pedido foi cancelado.</div>
              ) : (
                STEPS.map((step, index) => (
                  <div
                    key={step}
                    className={`${styles.timelineStep} ${index <= activeStepIndex ? styles.timelineStepActive : ''}`}
                  >
                    <span>{index + 1}</span>
                    <strong>{STEP_LABELS[step]}</strong>
                  </div>
                ))
              )}
            </section>

            <div className={styles.grid}>
              <section className={styles.panel}>
                <h2>Produtos comprados</h2>
                <div className={styles.itemsList}>
                  {order.itens.map((item) => (
                    <article key={item.id} className={styles.item}>
                      <img
                        src={getProductImage(item)}
                        alt={item.nome_produto}
                        onError={(event) => {
                          event.currentTarget.src = semImagem;
                        }}
                      />
                      <div>
                        <strong>{item.nome_produto}</strong>
                        <span>{item.quantidade} unidade(s) x R$ {formatPrice(item.preco_unitario)}</span>
                      </div>
                      <b>R$ {formatPrice(item.subtotal)}</b>
                    </article>
                  ))}
                </div>
              </section>

              <aside className={styles.sidebar}>
                <section className={styles.panel}>
                  <h2>Resumo financeiro</h2>
                  <div className={styles.summaryLine}>
                    <span>Subtotal</span>
                    <strong>R$ {formatPrice(order.subtotal)}</strong>
                  </div>
                  <div className={styles.summaryLine}>
                    <span>Frete</span>
                    <strong>R$ {formatPrice(order.valor_frete)}</strong>
                  </div>
                  <div className={styles.summaryLine}>
                    <span>Desconto</span>
                    <strong>R$ {formatPrice(order.desconto)}</strong>
                  </div>
                  <div className={styles.totalLine}>
                    <span>Total</span>
                    <strong>R$ {formatPrice(order.total)}</strong>
                  </div>
                  <small>Método: {order.metodo_pagamento}</small>
                </section>

                <section className={styles.panel}>
                  <h2>Entrega</h2>
                  <address>
                    <strong>{order.endereco_entrega?.nome_destinatario}</strong>
                    <span>{order.endereco_entrega?.rua}, {order.endereco_entrega?.numero}</span>
                    {order.endereco_entrega?.complemento && <span>{order.endereco_entrega.complemento}</span>}
                    <span>{order.endereco_entrega?.bairro}</span>
                    <span>{order.endereco_entrega?.cidade} - {order.endereco_entrega?.estado}</span>
                    <span>CEP {order.endereco_entrega?.cep}</span>
                    {order.endereco_entrega?.telefone && <span>{order.endereco_entrega.telefone}</span>}
                  </address>
                </section>

                {order.observacoes && (
                  <section className={styles.panel}>
                    <h2>Observações</h2>
                    <p>{order.observacoes}</p>
                  </section>
                )}
              </aside>
            </div>
          </>
        ) : null}
      </main>

      <CustomerSatisfactionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
        loading={reviewSubmitting}
        error={reviewError}
      />

      <Footer />
    </div>
  );
}

export default OrderDetailsPage;
