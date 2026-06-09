import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { getAuthToken, getAuthUser, getImageUrl, calculateShipping, criarPedido } from '../services/api';
import { formatPrice } from '../utils/productUtils';
import styles from './CartPage.module.css';

const STEPS = [
  { number: 1, label: 'Carrinho' },
  { number: 2, label: 'Entrega' },
  { number: 3, label: 'Pagamento' },
  { number: 4, label: 'Revisão' },
];

const maskCep = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

function CartPage() {
  const { cart, removeFromCart, clearCart, addToCart, decreaseQuantity, isCartLoading, cartError } = useCart();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [shippingSuccess, setShippingSuccess] = useState(false);
  const [isDeliveryCepEdited, setIsDeliveryCepEdited] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('whatsapp');
  const [observacoes, setObservacoes] = useState('');
  const [openWhatsAppAfterOrder, setOpenWhatsAppAfterOrder] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState({
    nome_destinatario: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
  });

  useEffect(() => {
    const user = getAuthUser();
    if (user && user.nome && !deliveryAddress.nome_destinatario) {
      setDeliveryAddress((current) => ({
        ...current,
        nome_destinatario: user.nome,
        telefone: user.telefone || '',
      }));
    }
  }, []);

  const user = getAuthUser();
  const displayItems = Array.isArray(cart.items) ? cart.items : [];

  const handleIncrease = (product) => {
    void addToCart(product).catch(console.error);
  };

  const handleDecrease = (productId) => {
    void decreaseQuantity(productId).catch(console.error);
  };

  const getProductPrice = (product) => Number(product.preco_venda ?? product.preco ?? 0) || 0;

  const getProductImage = (product) => (
    product.imagens?.[0]?.url ? getImageUrl(product.imagens[0].url) : semImagem
  );

  const subtotal = displayItems.reduce((total, item) => {
    return total + getProductPrice(item.product) * item.quantity;
  }, 0);

  const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0;
  const total = subtotal + shippingCost;
  const totalItems = displayItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (currentStep !== 2 || !isDeliveryCepEdited) return undefined;

    const cleanCep = deliveryAddress.cep.replace(/\D/g, '');
    setCep(cleanCep);

    if (cleanCep.length !== 8 || displayItems.length === 0) return undefined;

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsLoadingShipping(true);

      try {
        const [addressResponse, options] = await Promise.all([
          fetch(`https://viacep.com.br/ws/${cleanCep}/json/`).then((response) => response.json()),
          calculateShipping({
            to_postal_code: cleanCep,
            products: displayItems.map(item => ({ ...item.product, quantity: item.quantity })),
          }),
        ]);

        if (isCancelled) return;

        if (!addressResponse.erro) {
          setDeliveryAddress((current) => ({
            ...current,
            cep: maskCep(addressResponse.cep),
            rua: addressResponse.logradouro || '',
            bairro: addressResponse.bairro || '',
            cidade: addressResponse.localidade || '',
            estado: addressResponse.uf || '',
          }));
        }

        if (options && options.length > 0) {
          setShippingOptions(options);
          setShippingSuccess(true);
        } else {
          setShippingError('Nenhuma opção de frete disponível para este CEP.');
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Erro ao recalcular frete:', error);
          setShippingError('Erro ao calcular frete. Verifique o CEP e tente novamente.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingShipping(false);
          setIsDeliveryCepEdited(false);
        }
      }
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [deliveryAddress.cep, currentStep, isDeliveryCepEdited]);

  if (isCartLoading) {
    return (
      <div>
        <Header />
        <main className={styles.page}>
          <section className={styles.statePanel}>Carregando carrinho...</section>
        </main>
        <Footer />
      </div>
    );
  }

  const validateCEP = (cepValue) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length === 0) return { valid: false, message: 'Por favor, informe o CEP.' };
    if (clean.length !== 8) return { valid: false, message: `CEP deve conter 8 dígitos. (${clean.length}/8)` };
    return { valid: true, message: '' };
  };

  const handleCalculateShipping = async () => {
    setShippingError('');
    setShippingSuccess(false);

    const validation = validateCEP(cep);
    if (!validation.valid) {
      setShippingError(validation.message);
      setShippingOptions([]);
      setSelectedShipping(null);
      return;
    }

    setIsLoadingShipping(true);
    setShippingOptions([]);
    setSelectedShipping(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const endereco = await response.json();

      if (!endereco.erro) {
        setDeliveryAddress((current) => ({
          ...current,
          cep: maskCep(endereco.cep),
          rua: endereco.logradouro || '',
          bairro: endereco.bairro || '',
          cidade: endereco.localidade || '',
          estado: endereco.uf || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }

    try {
      const data = await calculateShipping({
        to_postal_code: cep,
        products: displayItems.map(item => ({ ...item.product, quantity: item.quantity })),
      });

      if (data && data.length > 0) {
        setShippingOptions(data);
        setShippingSuccess(true);
      } else {
        setShippingError('Nenhuma opção de frete disponível para este CEP.');
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      setShippingError('Erro ao calcular frete. Verifique o CEP e tente novamente.');
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const buildWhatsAppMessage = (pedido) => {
    const lines = displayItems.map(({ product, quantity }) =>
      `* ${product.nome} (${quantity}x) - R$ ${formatPrice(getProductPrice(product) * quantity)}`
    );
    return [
      pedido ? `Olá! Acabei de criar o pedido ${pedido.numero_pedido}:` : 'Olá! Gostaria de fazer um pedido:',
      '',
      ...lines,
      '',
      `Subtotal: R$ ${formatPrice(subtotal)}`,
      selectedShipping ? `Frete (${selectedShipping.name}): R$ ${formatPrice(shippingCost)}` : 'Frete a calcular',
      `Total: R$ ${formatPrice(total)}`,
      '',
      `Meu nome: ${user?.nome || ''}`,
      `Meu telefone: ${user?.telefone || ''}`,
    ].join('\n');
  };

  const updateDeliveryAddress = (field, value) => {
    if (field === 'cep') {
      setIsDeliveryCepEdited(true);
      setSelectedShipping(null);
      setShippingOptions([]);
      setShippingSuccess(false);
      setShippingError('');
    }

    setDeliveryAddress((current) => ({
      ...current,
      [field]: field === 'cep' ? maskCep(value) : value,
    }));
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (displayItems.length === 0) return;
    setCheckoutError('');

    if (!getAuthToken()) {
      navigate('/login', { state: { from: '/carrinho' } });
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const pedido = await criarPedido({
        itens: displayItems.map(({ product, quantity }) => ({
          id_produto: product.id,
          quantidade: quantity,
        })),
        endereco_entrega: deliveryAddress,
        metodo_pagamento: paymentMethod,
        observacoes,
        frete: selectedShipping ? { name: selectedShipping.name } : null,
      });

      clearCart();

      if (openWhatsAppAfterOrder) {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(pedido))}`,
          '_blank',
          'noopener,noreferrer'
        );
      }

      navigate(`/meus-pedidos/${pedido.id}`, { state: { created: true } });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setCheckoutError(error.message || 'Não foi possível finalizar o pedido.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const nextStep = () => {
    if (currentStep >= 4) return;
    if (currentStep === 1 && displayItems.length === 0) return;
    if (currentStep === 2 && (!deliveryAddress.nome_destinatario || !deliveryAddress.rua || !deliveryAddress.numero || !selectedShipping)) return;
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const isAddressValid = deliveryAddress.nome_destinatario && deliveryAddress.rua && deliveryAddress.numero;

  const renderTimeline = () => (
    <section className={styles.timeline}>
      {STEPS.map((step, index) => (
        <React.Fragment key={step.number}>
          <div
            className={`${styles.timelineStep} ${currentStep === step.number ? styles.timelineStepActive : ''} ${currentStep > step.number ? styles.timelineStepDone : ''}`}
            onClick={() => currentStep > step.number && setCurrentStep(step.number)}
          >
            <span>{currentStep > step.number ? '✓' : step.number}</span>
            <strong>{step.label}</strong>
          </div>
          {index < STEPS.length - 1 && (
            <div className={`${styles.timelineConnector} ${currentStep > step.number ? styles.timelineConnectorDone : ''}`} />
          )}
        </React.Fragment>
      ))}
    </section>
  );

  const renderSummary = (showShipping = true) => (
    <>
      <div className={styles.summaryLine}>
        <span>Subtotal</span>
        <strong>R$ {formatPrice(subtotal)}</strong>
      </div>
      {showShipping && selectedShipping && (
        <div className={styles.summaryLine}>
          <span>Frete ({selectedShipping.name})</span>
          <strong>R$ {formatPrice(shippingCost)}</strong>
        </div>
      )}
      <div className={styles.totalLine}>
        <span>Total</span>
        <strong>R$ {formatPrice(total)}</strong>
      </div>
    </>
  );

  return (
    <div>
      <Header />
      <main className={styles.page}>
        <Link to="/" className={styles.backLink}>Continuar comprando</Link>

        {cartError && !isCartLoading && (
          <section className={styles.errorPanel}>{cartError}</section>
        )}

        {renderTimeline()}

        {currentStep === 1 && (
          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>Seu Carrinho</h2>
              {displayItems.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>Seu carrinho está vazio.</p>
                  <Link to="/" className={styles.emptyLink}>Ver produtos</Link>
                </div>
              ) : (
                <div className={styles.itemsList}>
                  {displayItems.map(({ product, quantity }) => (
                    <article key={product.id} className={styles.item}>
                      <img
                        src={getProductImage(product)}
                        alt={product.nome}
                        onError={(e) => { e.currentTarget.src = semImagem; }}
                      />
                      <div>
                        <Link to={`/produto/${product.id}`} className={styles.itemTitle}>{product.nome}</Link>
                        <span>{quantity} unidade(s) x R$ {formatPrice(getProductPrice(product))}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <div className={styles.qtyControls}>
                          <button type="button" onClick={() => handleDecrease(product.id)} disabled={quantity <= 1}>−</button>
                          <span>{quantity}</span>
                          <button type="button" onClick={() => handleIncrease(product)}>+</button>
                        </div>
                        <button className={styles.removeBtn} onClick={() => removeFromCart(product.id).catch(console.error)}>
                          Remover
                        </button>
                      </div>
                      <b>R$ {formatPrice(getProductPrice(product) * quantity)}</b>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.panel}>
                <h2>Resumo da compra</h2>
                {renderSummary(false)}

                <div className={styles.shippingBox}>
                  <h3>Calcular frete</h3>
                  <div className={styles.cepRow}>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="CEP"
                      maxLength="8"
                    />
                    <button onClick={handleCalculateShipping} disabled={isLoadingShipping}>
                      {isLoadingShipping ? '...' : 'OK'}
                    </button>
                  </div>
                  {shippingError && <span className={styles.errorMsg}>{shippingError}</span>}
                  {shippingSuccess && <span className={styles.successMsg}>Frete calculado</span>}

                  {shippingOptions.length > 0 && (
                    <div className={styles.shippingOptions}>
                      {shippingOptions.map((option) => (
                        <div key={option.name} className={`${styles.shippingOption} ${styles.shippingOptionPreview}`}>
                          <span>{option.name === 'PAC' ? '🚚' : '⚡'} {option.name}</span>
                          <strong>R$ {formatPrice(option.price)}</strong>
                          <small>({option.delivery_time} dias)</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.divider} />
                {renderSummary(false)}

                <button className={styles.primaryBtn} onClick={nextStep} disabled={displayItems.length === 0}>
                  Avançar para Entrega
                </button>
              </section>
            </aside>
          </div>
        )}

        {currentStep === 2 && (
          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>📦 Endereço de Entrega</h2>
              <div className={styles.addressForm}>
                <input
                  type="text"
                  value={deliveryAddress.nome_destinatario}
                  onChange={(e) => updateDeliveryAddress('nome_destinatario', e.target.value)}
                  placeholder="Nome do destinatário"
                />
                <div className={styles.row}>
                  <input
                    type="text"
                    value={deliveryAddress.cep}
                    onChange={(e) => updateDeliveryAddress('cep', e.target.value)}
                    placeholder="CEP"
                    inputMode="numeric"
                    maxLength="9"
                  />
                  <input
                    type="text"
                    value={deliveryAddress.telefone}
                    onChange={(e) => updateDeliveryAddress('telefone', e.target.value)}
                    placeholder="Telefone"
                  />
                </div>
                <input
                  type="text"
                  value={deliveryAddress.rua}
                  placeholder="Rua"
                  readOnly
                />
                <div className={styles.row}>
                  <input
                    type="text"
                    value={deliveryAddress.numero}
                    onChange={(e) => updateDeliveryAddress('numero', e.target.value)}
                    placeholder="Número"
                  />
                  <input
                    type="text"
                    value={deliveryAddress.complemento}
                    onChange={(e) => updateDeliveryAddress('complemento', e.target.value)}
                    placeholder="Complemento"
                  />
                </div>
                <input
                  type="text"
                  value={deliveryAddress.bairro}
                  placeholder="Bairro"
                  readOnly
                />
                <div className={styles.row}>
                  <input
                    type="text"
                    value={deliveryAddress.cidade}
                    placeholder="Cidade"
                    readOnly
                  />
                  <input
                    type="text"
                    value={deliveryAddress.estado}
                    placeholder="UF"
                    maxLength="2"
                    readOnly
                  />
                </div>
              </div>

              <div className={styles.shippingBox}>
                <h3>Escolha a opção de entrega</h3>
                {shippingOptions.length > 0 ? (
                  <div className={styles.shippingOptions}>
                    {shippingOptions.map((option) => (
                      <label key={option.name} className={`${styles.shippingOption} ${selectedShipping?.name === option.name ? styles.shippingOptionSelected : ''}`}>
                        <input
                          type="radio"
                          name="shipping"
                          value={option.name}
                          checked={selectedShipping?.name === option.name}
                          onChange={() => setSelectedShipping(option)}
                        />
                        <span>{option.name === 'PAC' ? '🚚' : '⚡'} {option.name}</span>
                        <strong>R$ {formatPrice(option.price)}</strong>
                        <small>({option.delivery_time} dias)</small>
                      </label>
                    ))}
                  </div>
                ) : shippingError ? (
                  <span className={styles.errorMsg}>{shippingError}</span>
                ) : deliveryAddress.cep.replace(/\D/g, '').length === 8 ? (
                  <span className={styles.successMsg}>Recalculando frete...</span>
                ) : (
                  <span className={styles.errorMsg}>Digite o CEP para calcular e escolher uma opção de entrega.</span>
                )}
              </div>

              <div className={styles.btnRow}>
                <button className={styles.secondaryBtn} onClick={prevStep}>Voltar</button>
                <button className={styles.primaryBtn} onClick={nextStep} disabled={!isAddressValid || !selectedShipping}>
                  Avançar para Pagamento
                </button>
              </div>
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.panel}>
                <h2>Resumo</h2>
                {renderSummary()}
              </section>
            </aside>
          </div>
        )}

        {currentStep === 3 && (
          <div className={styles.grid}>
            <section className={styles.panel}>
              <h2>💳 Pagamento</h2>
              <div className={styles.addressForm}>
                <label className={styles.fieldLabel}>Forma de pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="whatsapp">Combinar pelo WhatsApp</option>
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="boleto">Boleto</option>
                </select>

                <label className={styles.fieldLabel}>Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações para o pedido"
                  rows="3"
                />
              </div>

              <div className={styles.btnRow}>
                <button className={styles.secondaryBtn} onClick={prevStep}>Voltar</button>
                <button className={styles.primaryBtn} onClick={nextStep}>
                  Avançar para Revisão
                </button>
              </div>
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.panel}>
                <h2>Resumo</h2>
                {renderSummary()}
              </section>
            </aside>
          </div>
        )}

        {currentStep === 4 && (
          <form className={styles.grid} onSubmit={handleCheckout}>
            <section className={styles.panel}>
              <h2>📋 Revisão do Pedido</h2>

              <div className={styles.reviewBlock}>
                <h3>Endereço de Entrega</h3>
                <address>
                  <strong>{deliveryAddress.nome_destinatario}</strong>
                  <span>{deliveryAddress.rua}, {deliveryAddress.numero}{deliveryAddress.complemento ? ` - ${deliveryAddress.complemento}` : ''}</span>
                  <span>{deliveryAddress.bairro} - {deliveryAddress.cidade}/{deliveryAddress.estado}</span>
                  <span>CEP {deliveryAddress.cep}</span>
                  {deliveryAddress.telefone && <span>{deliveryAddress.telefone}</span>}
                </address>
              </div>

              <div className={styles.reviewBlock}>
                <h3>Forma de Pagamento</h3>
                <p>{paymentMethod === 'whatsapp' ? 'Combinar pelo WhatsApp' :
                     paymentMethod === 'pix' ? 'Pix' :
                     paymentMethod === 'cartao' ? 'Cartão' :
                     paymentMethod === 'dinheiro' ? 'Dinheiro' :
                     paymentMethod === 'boleto' ? 'Boleto' : paymentMethod}</p>
              </div>

              {observacoes && (
                <div className={styles.reviewBlock}>
                  <h3>Observações</h3>
                  <p>{observacoes}</p>
                </div>
              )}

              <div className={styles.divider} />
              <div className={styles.summaryLine}>
                <span>Pedido ({totalItems} item(ns))</span>
                <strong>R$ {formatPrice(subtotal)}</strong>
              </div>
              {renderSummary()}

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={openWhatsAppAfterOrder}
                  onChange={(e) => setOpenWhatsAppAfterOrder(e.target.checked)}
                />
                Enviar resumo pelo WhatsApp após finalizar
              </label>

              {checkoutError && <div className={styles.errorPanel}>{checkoutError}</div>}

              <div className={styles.btnRow}>
                <button className={styles.secondaryBtn} type="button" onClick={prevStep}>Voltar</button>
                <button className={styles.primaryBtn} type="submit" disabled={isSubmittingOrder}>
                  {isSubmittingOrder ? 'Criando pedido...' : 'Finalizar pedido'}
                </button>
              </div>
            </section>

            <aside className={styles.sidebar}>
              <section className={styles.panel}>
                <h2>Resumo</h2>
                <div className={styles.itemSummary}>
                  {displayItems.map(({ product, quantity }) => (
                    <div key={product.id} className={styles.itemSummaryRow}>
                      <img
                        src={getProductImage(product)}
                        alt={product.nome}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = semImagem;
                        }}
                      />
                      <div>
                        <strong>{product.nome}</strong>
                        <span>{quantity}x R$ {formatPrice(getProductPrice(product))}</span>
                      </div>
                      <b>R$ {formatPrice(getProductPrice(product) * quantity)}</b>
                    </div>
                  ))}
                </div>
                {renderSummary()}

              </section>
            </aside>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default CartPage;
