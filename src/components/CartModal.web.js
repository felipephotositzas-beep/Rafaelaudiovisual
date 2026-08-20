import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
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
import { useBreakpoint } from '../hooks/useBreakpoint';
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
  const { cartItems, removeFromCart, cartTotal, cartDiscount, cartSubtotal } =
    useCart();
  const { isMobile } = useBreakpoint();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[s.backdrop, isMobile && s.backdropMobile]}>
        {/* Backdrop click to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={[s.panel, isMobile && s.panelMobile]}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.cartIconCircle}>
                <ShoppingCart size={18} color="#009DFF" />
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
              {/* Trust bar */}
              <View style={s.trustBar}>
                <View style={s.trustItem}>
                  <ShieldCheck size={13} color="#009DFF" />
                  <Text style={s.trustText}>Compra 100% Segura</Text>
                </View>
                <View style={s.trustItem}>
                  <Zap size={13} color="#009DFF" />
                  <Text style={s.trustText}>Liberação Imediata</Text>
                </View>
              </View>

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
                  style={s.checkoutBtn}
                  onPress={onCheckout}
                  activeOpacity={0.88}
                >
                  <Text style={s.checkoutBtnText}>Finalizar Compra via Pix</Text>
                  <ArrowRight size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Desktop backdrop: blur overlay with right side drawer
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  // Mobile backdrop: bottom sheet
  backdropMobile: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  panel: {
    width: 440,
    backgroundColor: '#FFFFFF',
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
  },
  panelMobile: {
    width: '100%',
    height: undefined,
    maxHeight: '88%',
    borderLeftWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: FontWeights.extrabold,
    color: '#0F172A',
  },
  headerBadge: {
    backgroundColor: '#006BD6',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  trustBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 11,
    color: '#006BD6',
    fontWeight: FontWeights.semibold,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.two,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    maxWidth: 240,
    textAlign: 'center',
  },

  list: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: Spacing.three,
  },
  cartImg: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartInfo: { flex: 1 },
  cartRef: {
    fontSize: 14,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
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
    color: '#64748B',
    flex: 1,
  },
  cartPrice: {
    fontSize: 15,
    fontWeight: FontWeights.extrabold,
    color: '#006BD6',
  },
  removeBtn: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#FEF2F2',
  },

  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  discountLabel: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: FontWeights.semibold,
  },
  discountValue: {
    fontSize: 13,
    color: '#10B981',
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
    color: '#475569',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: '#0F172A',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: Spacing.four,
    borderRadius: Radius.md,
    boxShadow: '0 4px 14px rgba(0, 107, 214, 0.3)',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.extrabold,
    fontSize: 15,
  },
});
