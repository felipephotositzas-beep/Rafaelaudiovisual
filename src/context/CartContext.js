import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchCart,
  addPhotoToCart,
  removePhotoFromCart,
  applyCouponApi,
  removeCouponApi,
} from '../utils/api';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const PHOTO_PRICE = 11.90;

const parsePrice = (priceVal, defaultVal = 0) => {
  if (priceVal === undefined || priceVal === null) return defaultVal;
  if (typeof priceVal === 'number') return priceVal;
  const cleanVal = String(priceVal).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? defaultVal : parsed;
};

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartId, setCartId] = useState('');
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [currentEventId, setCurrentEventId] = useState('');

  const syncCartState = (backendCart) => {
    if (!backendCart) return;
    if (backendCart.items) {
      const items = backendCart.items.map(item => ({
        id: item.photo.id,
        cartItemId: item.id,
        short_reference: item.photo.short_reference,
        watermark_path: item.photo.watermark_path,
        url: item.photo.watermark_path,
        is_video: item.photo.is_video,
        price: parsePrice(item.photo.price, PHOTO_PRICE),
      }));
      setCartItems(items);
      setCartSubtotal(parsePrice(backendCart.value || 0));
      setCartDiscount(
        parsePrice(backendCart.progressive_discount || 0) +
        parsePrice(backendCart.coupon_discount || 0)
      );
      setCartTotal(parsePrice(backendCart.total_value || 0));
      setAppliedCoupon(backendCart.coupon || null);
    } else {
      setCartItems([]);
      setCartSubtotal(0);
      setCartDiscount(0);
      setCartTotal(0);
      setAppliedCoupon(null);
    }
  };

  const loadLocalCart = async (eventId) => {
    try {
      const saved = await AsyncStorage.getItem('topfotos_cart_' + eventId);
      if (saved) {
        const rawItems = JSON.parse(saved);
        const items = rawItems.map(item => ({
          ...item,
          price: parsePrice(item.price, PHOTO_PRICE),
        }));
        setCartItems(items);
        const subtotal = items.reduce((sum, i) => sum + i.price, 0);
        setCartSubtotal(subtotal);
        setCartTotal(subtotal);
        setCartDiscount(0);
      } else {
        setCartItems([]);
        setCartSubtotal(0);
        setCartTotal(0);
        setCartDiscount(0);
      }
    } catch (e) {
      console.warn('loadLocalCart error:', e);
    }
  };

  const fetchAndSyncCart = async (targetCartId, eventId = '') => {
    try {
      const res = await fetchCart(targetCartId);
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data?.items) || data.items.length === 0) {
          if (eventId) loadLocalCart(eventId);
          return false;
        }
        syncCartState(data);
        return true;
      } else {
        if (eventId) loadLocalCart(eventId);
        return false;
      }
    } catch (err) {
      console.warn('fetchAndSyncCart error:', err);
      if (eventId) loadLocalCart(eventId);
      return false;
    }
  };

  const initializeCartForEvent = async (eventId) => {
    setCurrentEventId(eventId);
    let currentCartId = await AsyncStorage.getItem('cart_by_event_' + eventId);
    if (!currentCartId) {
      currentCartId = generateUUID();
      await AsyncStorage.setItem('cart_by_event_' + eventId, currentCartId);
    }
    setCartId(currentCartId);
    await fetchAndSyncCart(currentCartId, eventId);
  };

  const initializeCartWithId = async (specificCartId) => {
    setCartId(specificCartId);
    return fetchAndSyncCart(specificCartId);
  };

  // Persiste o carrinho localmente quando muda
  useEffect(() => {
    if (currentEventId && cartItems.length > 0) {
      AsyncStorage.setItem('topfotos_cart_' + currentEventId, JSON.stringify(cartItems));
    } else if (currentEventId) {
      AsyncStorage.removeItem('topfotos_cart_' + currentEventId);
    }
  }, [cartItems, currentEventId]);

  const addToCart = async (photo) => {
    if (cartItems.some(item => item.id === photo.id)) return;

    let targetCartId = cartId;
    if (!targetCartId && currentEventId) {
      targetCartId = await AsyncStorage.getItem('cart_by_event_' + currentEventId) || '';
    }
    if (!targetCartId) {
      targetCartId = generateUUID();
      setCartId(targetCartId);
      if (currentEventId) {
        await AsyncStorage.setItem('cart_by_event_' + currentEventId, targetCartId);
      }
    }

    // Otimista: adiciona localmente primeiro
    const tempItem = {
      id: photo.id,
      cartItemId: `temp-${Date.now()}`,
      short_reference: photo.short_reference,
      watermark_path: photo.watermark_path || photo.url,
      url: photo.watermark_path || photo.url,
      is_video: !!photo.is_video,
      price: parsePrice(photo.price, PHOTO_PRICE),
    };
    const updated = [...cartItems, tempItem];
    setCartItems(updated);
    const subtotal = updated.reduce((sum, i) => sum + i.price, 0);
    setCartSubtotal(subtotal);
    setCartTotal(subtotal);

    // Sync com backend
    try {
      const res = await addPhotoToCart(targetCartId, photo.id);
      if (res.ok) {
        const data = await res.json();
        syncCartState(data);
      }
    } catch (err) {
      console.error('addToCart backend error:', err);
    }
  };

  const removeFromCart = async (photoId) => {
    const item = cartItems.find(i => i.id === photoId);
    if (!item) return;

    const updated = cartItems.filter(i => i.id !== photoId);
    setCartItems(updated);
    const subtotal = updated.reduce((sum, i) => sum + i.price, 0);
    setCartSubtotal(subtotal);
    setCartTotal(subtotal);

    if (item.cartItemId && !item.cartItemId.startsWith('temp-')) {
      try {
        const res = await removePhotoFromCart(cartId, item.cartItemId);
        if (res.ok) {
          const data = await res.json();
          syncCartState(data);
        }
      } catch (err) {
        console.error('removeFromCart backend error:', err);
      }
    }
  };

  const isInCart = (photoId) => cartItems.some(item => item.id === photoId);

  const clearCart = async () => {
    setCartItems([]);
    setCartSubtotal(0);
    setCartDiscount(0);
    setCartTotal(0);
    setAppliedCoupon(null);
    if (currentEventId) {
      await AsyncStorage.removeItem('topfotos_cart_' + currentEventId);
      await AsyncStorage.removeItem('cart_by_event_' + currentEventId);
    }
  };

  const applyCoupon = async (couponCode) => {
    try {
      const res = await applyCouponApi(cartId, couponCode);
      const data = await res.json();
      if (res.ok) {
        syncCartState(data);
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Cupom inválido!' };
      }
    } catch {
      return { success: false, error: 'Falha na conexão com o servidor.' };
    }
  };

  const removeCoupon = async () => {
    try {
      const res = await removeCouponApi(cartId);
      if (res.ok) {
        const data = await res.json();
        syncCartState(data);
        return { success: true };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartId,
      cartCount: cartItems.length,
      cartSubtotal,
      cartDiscount,
      cartTotal,
      addToCart,
      removeFromCart,
      isInCart,
      clearCart,
      initializeCartForEvent,
      initializeCartWithId,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
};
