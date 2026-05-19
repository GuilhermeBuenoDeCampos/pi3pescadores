import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import './cart.css';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { getAuthToken, getAuthUser, getImageUrl, calculateShipping, criarPedido } from '../services/api';
import { formatPrice } from '../utils/productUtils';

function CartPage() {
  const { cart, removeFromCart, clearCart, addToCart, decreaseQuantity, isCartLoading, cartError } = useCart();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [shippingSuccess, setShippingSuccess] = useState(false);
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

  // Usar itens do cart
  const displayItems = Array.isArray(cart.items) ? cart.items : [];

  const handleIncrease = (product) => {
    void addToCart(product).catch((error) => {
      console.error('Erro ao adicionar item ao carrinho:', error);
    });
  };

  const handleDecrease = (productId) => {
    void decreaseQuantity(productId).catch((error) => {
      console.error('Erro ao atualizar quantidade do carrinho:', error);
    });
  };

  const getProductPrice = (product) => Number(product.preco_venda ?? product.preco ?? 0) || 0;

  const getProductImage = (product) => (
    product.imagens?.[0]?.url ? getImageUrl(product.imagens[0].url) : semImagem
  );

  const subtotal = displayItems.reduce((total, item) => {
    const price = getProductPrice(item.product);
    return total + price * item.quantity;
  }, 0);

  const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0;
  const total = subtotal + shippingCost - couponDiscount;
  
  const totalItems = displayItems.reduce((total, item) => total + item.quantity, 0);

  if (isCartLoading) {
    return (
      <div>
        <Header />
        <main>
          <div className="cart-container">
            <div className="cart-loading">Carregando carrinho...</div>
          </div>
        </main>
      </div>
    );
  }

  const validateCEP = (cepValue) => {
    const cleanCEP = cepValue.replace(/\D/g, '');
    if (cleanCEP.length === 0) {
      return { valid: false, message: '❌ Por favor, informe o CEP.' };
    }
    if (cleanCEP.length !== 8) {
      return { valid: false, message: `❌ CEP deve conter 8 dígitos. (${cleanCEP.length}/8)` };
    }
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

    const products = displayItems.map(item => ({
      ...item.product,
      quantity: item.quantity,
    }));

    try {
      const data = await calculateShipping({
        to_postal_code: cep,
        products: products,
      });
      
      if (data && data.length > 0) {
        setShippingOptions(data);
        setShippingSuccess(true);
        setShippingError('');
      } else {
        setShippingError('⚠️ Nenhuma opção de frete disponível para este CEP.');
        setShippingOptions([]);
      }
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      setShippingError('❌ Erro ao calcular frete. Verifique o CEP e tente novamente.');
      setShippingOptions([]);
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const applyCoupon = () => {
    if (couponCode.toLowerCase() === 'desc10') {
      setCouponDiscount(subtotal * 0.1);
      alert('Cupom aplicado com 10% de desconto!');
    } else {
      alert('Cupom inválido');
      setCouponDiscount(0);
    }
  };

  const buildWhatsAppMessage = (user, pedido) => {
    const productLines = displayItems.map(({ product, quantity }) => {
      const itemTotal = getProductPrice(product) * quantity;
      return `* ${product.nome} (${quantity}x) - R$ ${formatPrice(itemTotal)}`;
    });

    const userName = user?.nome || '';
    const userPhone = user?.telefone || '';

    return [
      pedido ? `Olá! Acabei de criar o pedido ${pedido.numero_pedido}:` : 'Olá! Gostaria de fazer um pedido:',
      '',
      ...productLines,
      '',
      `Subtotal: R$ ${formatPrice(subtotal)}`,
      selectedShipping ? `Frete (${selectedShipping.name}): R$ ${formatPrice(shippingCost)}` : 'Frete a calcular',
      `Total: R$ ${formatPrice(total)}`,
      '',
      `Meu nome: ${userName}`,
      `Meu telefone: ${userPhone}`,
    ].join('\n');
  };

  const updateDeliveryAddress = (field, value) => {
    setDeliveryAddress((current) => ({
      ...current,
      [field]: field === 'cep' ? value.replace(/\D/g, '').slice(0, 8) : value,
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

      const user = getAuthUser();
      clearCart();

      if (openWhatsAppAfterOrder) {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(user, pedido))}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }

      navigate(`/meus-pedidos/${pedido.id}`, { state: { created: true } });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setCheckoutError(error.message || 'Nao foi possivel finalizar o pedido.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div>
      <Header />
      <main>
        <div className="cart-container">
          {cartError && !isCartLoading && (
            <div className="cart-loading">
              {cartError}
            </div>
          )}

          <div className="cart-items">
            <div className="cart-header">
              <h2>Seu Carrinho</h2>
            </div>

            {displayItems.length === 0 && (
              <div className="cart-empty">
                <div className="cart-empty-icon" aria-hidden="true">
                  <span />
                </div>
                <h3>Seu carrinho está vazio</h3>
                <p>Escolha seus produtos favoritos e volte aqui para finalizar o pedido.</p>
                <Link to="/" className="cart-empty-link">Ver produtos</Link>
              </div>
            )}

            {displayItems.map(({ product, quantity }) => (
              <div className="cart-item" key={product.id}>
                <div className="item-img-box">
                  <img
                    src={getProductImage(product)}
                    alt={product.nome}
                    onError={(event) => {
                      event.currentTarget.src = semImagem;
                    }}
                  />
                </div>
                <div className="item-info">
                  <div>
                    <Link to={`/produto/${product.id}`} className="item-title">{product.nome}</Link>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      onClick={() => {
                        void removeFromCart(product.id).catch((error) => {
                          console.error('Erro ao remover item do carrinho:', error);
                        });
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="item-qty-selector">
                  <button type="button" onClick={() => handleDecrease(product.id)} disabled={quantity <= 1}>-</button>
                  <input type="number" value={quantity} readOnly />
                  <button type="button" onClick={() => handleIncrease(product)}>+</button>
                </div>

                <div className="item-price-box">
                  <span className="current-price">R$ {formatPrice(product.preco_venda ?? product.preco)}</span>
                </div>
              </div>
            ))}
          </div>

          <form className="cart-summary" onSubmit={handleCheckout}>
            <h3 className="summary-title">Resumo da compra</h3>
            <div className="summary-item">
              <span>Produtos ({totalItems})</span>
              <span>R$ {formatPrice(subtotal)}</span>
            </div>
            
            <div className="shipping-calculator">
              <h4>📦 Calcular frete</h4>
              <div className="cep-input-container">
                <input 
                  type="text" 
                  value={cep} 
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                  placeholder="Ex: 01234567"
                  maxLength="8"
                  className={shippingError && cep ? 'input-error' : ''}
                />
                <button type="button" onClick={handleCalculateShipping} disabled={isLoadingShipping}>
                  {isLoadingShipping ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
              {shippingError && (
                <div className="shipping-error">
                  {shippingError}
                </div>
              )}
              {shippingSuccess && shippingOptions.length > 0 && (
                <div className="shipping-success">
                  ✅ Opções de frete carregadas com sucesso!
                </div>
              )}
              {shippingOptions.length > 0 && (
                <div className="shipping-options">
                  {shippingOptions.map(option => (
                    <div key={option.name} className="shipping-option">
                      <input 
                        type="radio" 
                        id={option.name} 
                        name="shipping" 
                        value={option.name}
                        onChange={() => setSelectedShipping(option)}
                      />
                      <label htmlFor={option.name}>
                        {option.name === 'PAC' ? '🚚' : '⚡'} 
                        {option.name} - <strong>R$ {formatPrice(option.price)}</strong> ({option.delivery_time} dias)
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedShipping && (
              <div className="summary-item">
                <span>Frete ({selectedShipping.name})</span>
                <span>R$ {formatPrice(shippingCost)}</span>
              </div>
            )}

            <div className="summary-item total">
              <span>Total</span>
              <span>R$ {formatPrice(total)}</span>
            </div>

            <div className="checkout-form">
              <h4>Entrega</h4>
              <input
                type="text"
                value={deliveryAddress.nome_destinatario}
                onChange={(event) => updateDeliveryAddress('nome_destinatario', event.target.value)}
                placeholder="Nome do destinatário"
                required
              />
              <input
                type="text"
                value={deliveryAddress.cep}
                onChange={(event) => updateDeliveryAddress('cep', event.target.value)}
                placeholder="CEP"
                required
              />
              <input
                type="text"
                value={deliveryAddress.rua}
                onChange={(event) => updateDeliveryAddress('rua', event.target.value)}
                placeholder="Rua"
                required
              />
              <div className="checkout-row">
                <input
                  type="text"
                  value={deliveryAddress.numero}
                  onChange={(event) => updateDeliveryAddress('numero', event.target.value)}
                  placeholder="Número"
                  required
                />
                <input
                  type="text"
                  value={deliveryAddress.complemento}
                  onChange={(event) => updateDeliveryAddress('complemento', event.target.value)}
                  placeholder="Complemento"
                />
              </div>
              <input
                type="text"
                value={deliveryAddress.bairro}
                onChange={(event) => updateDeliveryAddress('bairro', event.target.value)}
                placeholder="Bairro"
                required
              />
              <div className="checkout-row">
                <input
                  type="text"
                  value={deliveryAddress.cidade}
                  onChange={(event) => updateDeliveryAddress('cidade', event.target.value)}
                  placeholder="Cidade"
                  required
                />
                <input
                  type="text"
                  value={deliveryAddress.estado}
                  onChange={(event) => updateDeliveryAddress('estado', event.target.value.slice(0, 2).toUpperCase())}
                  placeholder="UF"
                  required
                />
              </div>
              <input
                type="text"
                value={deliveryAddress.telefone}
                onChange={(event) => updateDeliveryAddress('telefone', event.target.value)}
                placeholder="Telefone"
              />

              <h4>Pagamento</h4>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="whatsapp">Combinar pelo WhatsApp</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
              </select>
              <textarea
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Observações para o pedido"
                rows="3"
              />
              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  checked={openWhatsAppAfterOrder}
                  onChange={(event) => setOpenWhatsAppAfterOrder(event.target.checked)}
                />
                Enviar resumo pelo WhatsApp após salvar
              </label>
            </div>

            {checkoutError && <div className="checkout-error">{checkoutError}</div>}

            <button className="btn-checkout" type="submit" disabled={displayItems.length === 0 || isSubmittingOrder}>
              {isSubmittingOrder ? 'Criando pedido...' : 'Finalizar pedido'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CartPage;
