import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import Header from '../components/Header';
import './cart.css';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import { getAuthToken, getAuthUser, getImageUrl, calculateShipping } from '../services/api';
import { formatPrice } from '../utils/productUtils';

function CartPage() {
  const { cart, removeFromCart, clearCart, addToCart, decreaseQuantity } = useCart();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);

  // Usar itens do cart
  const displayItems = Array.isArray(cart.items) ? cart.items : [];

  const handleIncrease = (product) => {
    addToCart(product);
  };

  const handleDecrease = (productId) => {
    decreaseQuantity(productId);
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

  const handleCalculateShipping = async () => {
    if (!cep.trim()) {
      alert('Por favor, informe o CEP.');
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
      setShippingOptions(data);
    } catch (error) {
      console.error('Erro ao calcular frete:', error);
      alert('Não foi possível calcular o frete. Tente novamente.');
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
                    <button type="button" onClick={() => removeFromCart(product.id)}>Excluir</button>
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
              <h4>Calcular frete</h4>
              <div className="cep-input-container">
                <input 
                  type="text" 
                  value={cep} 
                  onChange={(e) => setCep(e.target.value)} 
                  placeholder="Digite seu CEP"
                />
                <button onClick={handleCalculateShipping} disabled={isLoadingShipping}>
                  {isLoadingShipping ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
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
                        {option.name} - R$ {formatPrice(option.price)} ({option.delivery_time} dias)
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
