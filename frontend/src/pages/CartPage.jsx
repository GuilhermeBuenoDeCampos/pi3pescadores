import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import './cart.css';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { getAuthToken, getAuthUser, getImageUrl, calculateShipping } from '../services/api';
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

  const buildWhatsAppMessage = (user) => {
    const productLines = displayItems.map(({ product, quantity }) => {
      const itemTotal = getProductPrice(product) * quantity;
      return `* ${product.nome} (${quantity}x) - R$ ${formatPrice(itemTotal)}`;
    });

    const userName = user?.nome || '';
    const userPhone = user?.telefone || '';

    return [
      'Olá! Gostaria de fazer um pedido:',
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

  const handleCheckoutWhatsApp = () => {
    if (displayItems.length === 0) return;

    if (!getAuthToken()) {
      navigate('/login', { state: { from: '/carrinho' } });
      return;
    }

    const user = getAuthUser();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(user))}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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

          <div className="cart-summary">
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
                <button onClick={handleCalculateShipping} disabled={isLoadingShipping}>
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
            <button className="btn-checkout" type="button" onClick={handleCheckoutWhatsApp} disabled={displayItems.length === 0}>
              Continuar compra
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CartPage;
