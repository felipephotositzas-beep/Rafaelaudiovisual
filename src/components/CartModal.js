import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  ShoppingCart,
  Trash2,
  X,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.dark;

export default function CartModal({ visible, onClose, onCheckout }) {
  const {
    cartItems,
    removeFromCart,
    cartTotal,
    cartDiscount,
    cartReady,
    cartSyncing,
    cartError,
  } = useCart();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={s.panel}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.cartIconCircle}>
                <ShoppingCart size={18} color="var(--primary-color)" />
              </View>
              <Text style={s.headerTitle}>Seu Carrinho</Text>
              {cartItems.length > 0 && (
                <View style={s.headerBadge}>
                  <Text style={s.headerBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={18} color={DarkPalette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {cartItems.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIconCircle}>
                <ShoppingCart size={32} color={DarkPalette.textMuted} />
              </View>
              <Text style={s.emptyTitle}>Seu carrinho está vazio</Text>
              <Text style={s.emptySub}>
                Selecione as melhores fotos na galeria para continuar.
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item) => item.id}
                style={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={s.cartItem}>
                    <Image
                      source={{ uri: item.watermark_path || item.url }}
                      style={s.cartImg}
                      resizeMode="cover"
                    />
                    <View style={s.cartInfo}>
                      <Text style={s.cartRef} numberOfLines={1}>
                        {item.short_reference
                          ? `Foto #${item.short_reference}`
                          : 'Foto do Evento'}
                      </Text>
                      {item.photographer_name && (
                        <View style={s.photRow}>
                          <Camera size={11} color={DarkPalette.textMuted} />
                          <Text style={s.photName} numberOfLines={1}>
                            {item.photographer_name}
                          </Text>
                        </View>
                      )}
                      <Text style={s.cartPrice}>
                        R${' '}
                        {item.price
                          ? parseFloat(item.price).toFixed(2).replace('.', ',')
                          : '11,90'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => removeFromCart(item.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={DarkPalette.error} />
                    </TouchableOpacity>
                  </View>
                )}
              />

              {/* Summary Footer */}
              <View style={s.footer}>
                {cartDiscount > 0 && (
                  <View style={s.discountRow}>
                    <Text style={s.discountLabel}>Desconto aplicado:</Text>
                    <Text style={s.discountValue}>
                      - R$ {cartDiscount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                )}

                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Total a pagar</Text>
                  <Text style={s.totalValue}>
                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    s.checkoutBtn,
                    !cartReady && s.checkoutBtnDisabled,
                  ]}
                  onPress={onCheckout}
                  disabled={!cartReady}
                  activeOpacity={0.88}
                >
                  {cartSyncing ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={s.checkoutBtnText}>Sincronizando carrinho...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.checkoutBtnText}>Finalizar Compra</Text>
                      <ArrowRight size={17} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
                {cartError ? (
                  <Text style={s.syncError}>{cartError}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  panel: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#08111C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#050B12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: FontWeights.extrabold,
    color: '#F7F9FC',
  },
  headerBadge: {
    backgroundColor: 'var(--primary-color)',
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeights.extrabold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.two,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
  },
  emptySub: {
    fontSize: 13,
    color: DarkPalette.textMuted,
    maxWidth: 240,
    textAlign: 'center',
  },
  list: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, maxHeight: 350 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: Spacing.three,
  },
  cartImg: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: '#050B12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cartInfo: { flex: 1 },
  cartRef: {
    fontSize: 14,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
    marginBottom: 3,
  },
  photRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  photName: {
    fontSize: 11,
    color: DarkPalette.textMuted,
    flex: 1,
  },
  cartPrice: {
    fontSize: 15,
    fontWeight: FontWeights.extrabold,
    color: "var(--primary-color)",
  },
  removeBtn: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 77, 94, 0.1)',
  },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#050B12',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  discountLabel: {
    fontSize: 13,
    color: '#20C997',
    fontWeight: FontWeights.semibold,
  },
  discountValue: {
    fontSize: 13,
    color: '#20C997',
    fontWeight: FontWeights.bold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: FontWeights.medium,
    color: DarkPalette.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: '#F7F9FC',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'var(--primary-color)',
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
  },
  checkoutBtnDisabled: {
    opacity: 0.55,
  },
  syncError: {
    color: DarkPalette.error,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.extrabold,
    fontSize: 15,
  },
});
