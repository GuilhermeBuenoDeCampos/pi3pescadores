import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import './cart.css';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { getAuthToken, getImageUrl, calculateShipping } from '../services/api';
import { formatPrice } from '../utils/productUtils';

function CartPage() {
  const { cart, removeFromCart, addToCart, decreaseQuantity, isCartLoading, cartError } = useCart();
  const navigate = useNavigate();
  
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [shippingSuccess, setShippingSuccess] = useState(false);

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
  const total = subtotal + shippingCost;
  
  const totalItems = displayItems.reduce((total, item) => total + item.quantity, 0);

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

  const handleCheckout = (event) => {
    event.preventDefault();
    if (displayItems.length === 0) {
      alert("Seu carrinho está vazio. Adicione produtos antes de continuar.");
      return;
    }

    if (!getAuthToken()) {
      navigate('/login', { state: { from: '/checkout/address' } });
      return;
    }

    navigate('/checkout/address');
  };

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
              <h2>Seu carrinho</h2>
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
              <h4>Simular frete</h4>
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
                  {isLoadingShipping ? 'Consultando...' : 'Simular'}
                </button>
              </div>
              <p className="shipping-helper">Valor estimado. O frete final sera calculado no checkout.</p>
              {shippingError && (
                <div className="shipping-error">
                  {shippingError}
                </div>
              )}
              {shippingSuccess && shippingOptions.length > 0 && (
                <div className="shipping-success">
                  Estimativas de entrega carregadas com sucesso.
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
                <span>Frete estimado ({selectedShipping.name})</span>
                <span>R$ {formatPrice(shippingCost)}</span>
              </div>
            )}

            <div className="summary-item total">
              <span>Total</span>
              <span>R$ {formatPrice(total)}</span>
            </div>

            <button className="btn-checkout" type="submit" disabled={displayItems.length === 0}>
              Continuar para o Checkout
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default CartPage;
