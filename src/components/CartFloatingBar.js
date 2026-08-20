import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { ShoppingCart, ArrowRight } from 'lucide-react-native';
import CartModal from './CartModal';
import { FontWeights, Radius, Shadows, Spacing } from '../constants/theme';

export default function CartFloatingBar() {
  const { cartItems, cartTotal } = useCart();
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  if (!cartItems || cartItems.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Carrinho com ${cartItems.length} fotos. Total: R$ ${cartTotal.toFixed(2).replace('.', ',')}`}
      >
        <View style={styles.left}>
          <View style={styles.cartIconWrapper}>
            <ShoppingCart size={22} color="#FFFFFF" strokeWidth={2.2} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItems.length}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.text}>Ver carrinho</Text>
            <Text style={styles.subtext}>
              {cartItems.length} {cartItems.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.price}>R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>
          <View style={styles.arrowCircle}>
            <ArrowRight size={16} color="#006BD6" strokeWidth={2.5} />
          </View>
        </View>
      </TouchableOpacity>

      <CartModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCheckout={() => {
          setModalVisible(false);
          navigation.navigate('Checkout');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed',
    bottom: 20,
    left: 16,
    right: 16,
    maxWidth: 540,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    backgroundColor: '#006BD6',
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 30px rgba(0, 107, 214, 0.45)',
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cartIconWrapper: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#006BD6',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.extrabold,
    fontSize: 11,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 15,
    lineHeight: 18,
  },
  subtext: {
    color: '#E0F2FE',
    fontSize: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    color: '#FFFFFF',
    fontWeight: FontWeights.extrabold,
    fontSize: 16,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  },
});
