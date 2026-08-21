import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { Alert } from 'react-native';
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

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartId, setCartId] = useState('');
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [currentEventId, setCurrentEventId] = useState('');
  const [cartError, setCartError] = useState('');
  const [pendingCartOperations, setPendingCartOperations] = useState(0);
  const cartIdRef = useRef('');
  const cartInitializationRef = useRef(Promise.resolve());

  const updateCartId = (nextCartId) => {
    cartIdRef.current = nextCartId;
    setCartId(nextCartId);
  };

  const syncCartState = (backendCart) => {
    if (!backendCart) return;
    setCartError('');
    if (backendCart.items) {
      const items = backendCart.items.map(item => ({
        id: item.photo.id,
        cartItemId: item.id,
        description: item.description || '',
        short_reference: item.photo.short_reference,
        watermark_path: item.photo.watermark_path,
        url: item.photo.watermark_path,
        is_video: item.photo.is_video,
        price: parsePrice(
          item.final_price ?? item.price ?? item.photo.price,
          PHOTO_PRICE
        ),
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

  const fetchAndSyncCart = async (targetCartId, requireItems = false) => {
    try {
      const res = await fetchCart(targetCartId);
      if (res.ok) {
        const data = await res.json();
        if (
          data?.open === false ||
          !Array.isArray(data?.items) ||
          (requireItems && data.items.length === 0)
        ) {
          return false;
        }
        syncCartState(data);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('fetchAndSyncCart error:', err);
      return false;
    }
  };

  const initializeCartForEvent = (eventId) => {
    setCurrentEventId(eventId);
    setCartError('');

    const initialization = (async () => {
      const storageKey = 'cart_by_event_' + eventId;
      const savedCartId = await AsyncStorage.getItem(storageKey);

      if (savedCartId) {
        updateCartId(savedCartId);
        const loaded = await fetchAndSyncCart(savedCartId);
        if (loaded) return true;

        await AsyncStorage.removeItem('topfotos_cart_' + eventId);
      }

      const newCartId = generateUUID();
      updateCartId(newCartId);
      setCartItems([]);
      setCartSubtotal(0);
      setCartDiscount(0);
      setCartTotal(0);
      setAppliedCoupon(null);
      await AsyncStorage.setItem(storageKey, newCartId);
      return true;
    })();

    cartInitializationRef.current = initialization;
    return initialization;
  };

  const initializeCartWithId = async (specificCartId) => {
    updateCartId(specificCartId);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await fetchAndSyncCart(specificCartId, true)) return true;
      if (attempt < 2) await wait(350 * (attempt + 1));
    }
    return false;
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

    await cartInitializationRef.current;

    let targetCartId = cartIdRef.current;
    if (!targetCartId && currentEventId) {
      targetCartId = await AsyncStorage.getItem('cart_by_event_' + currentEventId) || '';
    }
    if (!targetCartId) {
      targetCartId = generateUUID();
      updateCartId(targetCartId);
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
    setCartError('');
    setPendingCartOperations((count) => count + 1);
    setCartItems(updated);
    const subtotal = updated.reduce((sum, i) => sum + i.price, 0);
    setCartSubtotal(subtotal);
    setCartTotal(subtotal);

    // Sync com backend
    try {
      const res = await addPhotoToCart(targetCartId, photo.id);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.error || 'Não foi possível adicionar a foto.'
        );
      }
      const data = await res.json();
      syncCartState(data);
      return true;
    } catch (err) {
      console.error('addToCart backend error:', err);
      setCartItems((currentItems) => {
        const remaining = currentItems.filter((item) => item.id !== photo.id);
        const nextTotal = remaining.reduce((sum, item) => sum + item.price, 0);
        setCartSubtotal(nextTotal);
        setCartTotal(nextTotal);
        return remaining;
      });
      setCartError(
        err?.message || 'Não foi possível sincronizar o carrinho. Tente novamente.'
      );
      Alert.alert(
        'Carrinho não sincronizado',
        'A foto não foi adicionada na Top Fotos. Tente novamente.'
      );
      return false;
    } finally {
      setPendingCartOperations((count) => Math.max(0, count - 1));
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
    setCartError('');
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
      cartReady:
        cartItems.length > 0 &&
        pendingCartOperations === 0 &&
        cartItems.every(
          (item) => item.cartItemId && !item.cartItemId.startsWith('temp-')
        ),
      cartSyncing: pendingCartOperations > 0,
      cartError,
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
