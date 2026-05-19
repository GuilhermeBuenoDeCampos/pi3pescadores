import { createContext, useContext, useEffect, useState } from 'react';
import {
  addCartItem,
  ensureGuestToken,
  fetchCart,
  removeCartItem,
  updateCartItem,
} from '../services/api';

const CartContext = createContext();

const initialState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  total: 0,
  id: null,
};

function normalizeItem(item) {
  const product = item.product || item.produto || {};

  return {
    id: item.id,
    itemId: item.id,
    product,
    quantity: Number(item.quantidade ?? item.quantity ?? 0),
  };
}

function normalizeCart(cart) {
  if (!cart) {
    return initialState;
  }

  const items = Array.isArray(cart.itens)
    ? cart.itens.map(normalizeItem)
    : Array.isArray(cart.items)
      ? cart.items.map(normalizeItem)
      : [];

  return {
    id: cart.id ?? null,
    usuario_id: cart.usuario_id ?? null,
    guest_token: cart.guest_token ?? null,
    status: cart.status ?? 'active',
    items,
    totalItems: Number(cart.total_itens ?? cart.totalItems ?? items.reduce((total, item) => total + item.quantity, 0)),
    subtotal: Number(cart.subtotal ?? 0),
    total: Number(cart.total ?? cart.subtotal ?? 0),
  };
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshCart = async () => {
    setIsLoading(true);

    try {
      ensureGuestToken();
      const data = await fetchCart();
      setCart(normalizeCart(data));
      setError('');
    } catch (err) {
      console.error('Failed to load cart from API', err);
      setError(err.message || 'Failed to load cart');
      setCart(initialState);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!active) {
        return;
      }

      await refreshCart();
    };

    const handleAuthChange = () => {
      setCart(initialState);
      refreshCart();
    };

    load();

    window.addEventListener('auth-session-changed', handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener('auth-session-changed', handleAuthChange);
    };
  }, []);

  const syncFromResponse = (response) => {
    setCart(normalizeCart(response));
  };

  const addToCart = async (product, quantity = 1) => {
    const updatedCart = await addCartItem({
      produto_id: Number(product.id),
      quantidade: quantity,
    });

    syncFromResponse(updatedCart);
    return updatedCart;
  };

  const decreaseQuantity = async (productId) => {
    const existingItem = cart.items.find((item) => Number(item.product?.id) === Number(productId));

    if (!existingItem) {
      return null;
    }

    if (existingItem.quantity <= 1) {
      return removeFromCart(productId);
    }

    const updatedCart = await updateCartItem(existingItem.itemId, {
      quantidade: existingItem.quantity - 1,
    });

    syncFromResponse(updatedCart);
    return updatedCart;
  };

  const removeFromCart = async (productId) => {
    const existingItem = cart.items.find((item) => Number(item.product?.id) === Number(productId));

    if (!existingItem) {
      return null;
    }

    const updatedCart = await removeCartItem(existingItem.itemId);
    syncFromResponse(updatedCart);
    return updatedCart;
  };

  const clearCart = async () => {
    await Promise.all(cart.items.map((item) => removeCartItem(item.itemId)));

    await refreshCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        isCartLoading: isLoading,
        cartError: error,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}