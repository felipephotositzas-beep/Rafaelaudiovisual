import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, View, Text, StyleSheet, Linking } from 'react-native';
import {
  ShoppingBag,
  ShoppingCart,
  Menu,
  X,
  Sparkles,
  Search,
  HelpCircle,
  Phone,
  Layers,
  ChevronRight,
  MessageCircle,
} from 'lucide-react-native';
import { CartProvider, useCart } from './src/context/CartContext';
import { useBreakpoint } from './src/hooks/useBreakpoint';

import Home from './src/pages/Home';
import EventDetails from './src/pages/EventDetails';
import Checkout from './src/pages/Checkout';
import MinhasCompras from './src/pages/MinhasCompras';
import LocationEvents from './src/pages/LocationEvents';
import CartModal from './src/components/CartModal';
import BrandLogo from './src/components/BrandLogo';
import {
  Colors,
  LightPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
  Layout,
} from './src/constants/theme';

const theme = Colors.light;
const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['apptopfotosnative://', 'https://topfotos.com.br', 'https://rafaelpublicado.com.br'],
  config: {
    screens: {
      Home: '',
      EventDetails: 'evento/:id',
      MinhasCompras: 'minhas-compras',
      Checkout: 'checkout',
    },
  },
};

// ─── CART BUTTON ─────────────────────────────────────────────────────────────
function CartHeaderButton({ navigation, compact }) {
  const { cartItems, cartTotal } = useCart();
  const [modalVisible, setModalVisible] = useState(false);

  const handleCheckout = () => {
    setModalVisible(false);
    navigation.navigate('Checkout');
  };

  if (cartItems.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={compact ? hStyles.cartBtnCompact : hStyles.cartBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Carrinho com ${cartItems.length} itens`}
      >
        <View style={hStyles.cartIconWrapper}>
          <ShoppingCart size={18} color={compact ? "#FFFFFF" : "#006BD6"} strokeWidth={2.2} />
          <View style={hStyles.cartBadge}>
            <Text style={hStyles.cartBadgeText}>{cartItems.length}</Text>
          </View>
        </View>
        {!compact && (
          <Text style={hStyles.cartBtnText}>
            R$ {cartTotal.toFixed(2).replace('.', ',')}
          </Text>
        )}
      </TouchableOpacity>
      <CartModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCheckout={handleCheckout}
      />
    </>
  );
}

// ─── DESKTOP HEADER ──────────────────────────────────────────────────────────
function DesktopHeader({ navigation }) {
  const scrollToSection = (sectionId) => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    navigation.navigate('Home');
  };

  const openWhatsApp = () => {
    if (typeof window !== 'undefined') {
      window.open(
        'https://api.whatsapp.com/send?phone=5599991297693&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos.',
        '_blank'
      );
    } else {
      Linking.openURL(
        'https://api.whatsapp.com/send?phone=5599991297693&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos.'
      );
    }
  };

  return (
    <View style={hStyles.headerDesktop}>
      <View style={hStyles.innerDesktop}>
        {/* Brand Logo */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
          style={hStyles.logoBtn}
        >
          <BrandLogo size="md" />
        </TouchableOpacity>

        {/* Center Nav */}
        <View style={hStyles.nav}>
          <TouchableOpacity
            style={hStyles.navLink}
            onPress={() => scrollToSection('como-funciona')}
          >
            <Text style={hStyles.navLinkText}>Como funciona</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.navLink}
            onPress={() => scrollToSection('galerias-destaque')}
          >
            <Text style={hStyles.navLinkText}>Galerias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.navLink}
            onPress={() => scrollToSection('duvidas')}
          >
            <Text style={hStyles.navLinkText}>Dúvidas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.navLink}
            onPress={openWhatsApp}
          >
            <Text style={hStyles.navLinkText}>Contato</Text>
          </TouchableOpacity>
        </View>

        {/* Right Actions */}
        <View style={hStyles.headerActions}>
          <CartHeaderButton navigation={navigation} compact={false} />
          
          <TouchableOpacity
            style={hStyles.btnCtaHeader}
            onPress={() => scrollToSection('galerias-destaque')}
            activeOpacity={0.88}
          >
            <Text style={hStyles.btnCtaHeaderText}>Acessar galeria</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── MOBILE HEADER ───────────────────────────────────────────────────────────
function MobileHeader({ navigation }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (route) => {
    setMenuOpen(false);
    navigation.navigate(route);
  };

  const scrollToSection = (sectionId) => {
    setMenuOpen(false);
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    setMenuOpen(false);
    Linking.openURL(
      'https://api.whatsapp.com/send?phone=5599991297693&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos.'
    );
  };

  return (
    <>
      <View style={hStyles.headerMobile}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <BrandLogo size="sm" />
        </TouchableOpacity>

        <View style={hStyles.mobileRight}>
          <CartHeaderButton navigation={navigation} compact={true} />
          <TouchableOpacity
            style={hStyles.menuBtn}
            onPress={() => setMenuOpen(v => !v)}
            activeOpacity={0.8}
          >
            {menuOpen ? (
              <X size={20} color="#0F172A" />
            ) : (
              <Menu size={20} color="#0F172A" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {menuOpen && (
        <View style={hStyles.mobileMenu}>
          <TouchableOpacity
            style={hStyles.mobileMenuItem}
            onPress={() => scrollToSection('como-funciona')}
          >
            <HelpCircle size={18} color="#475569" />
            <Text style={hStyles.mobileMenuText}>Como funciona</Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.mobileMenuItem}
            onPress={() => scrollToSection('galerias-destaque')}
          >
            <Layers size={18} color="#006BD6" />
            <Text style={hStyles.mobileMenuText}>Galerias</Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.mobileMenuItem}
            onPress={() => scrollToSection('duvidas')}
          >
            <HelpCircle size={18} color="#475569" />
            <Text style={hStyles.mobileMenuText}>Dúvidas</Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.mobileMenuItem}
            onPress={openWhatsApp}
          >
            <MessageCircle size={18} color="#10B981" />
            <Text style={hStyles.mobileMenuText}>Contato</Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={hStyles.mobileMenuItem}
            onPress={() => handleNav('MinhasCompras')}
          >
            <ShoppingBag size={18} color="#475569" />
            <Text style={hStyles.mobileMenuText}>Minhas Compras</Text>
            <ChevronRight size={16} color="#94A3B8" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <View style={hStyles.mobileMenuDivider} />

          <TouchableOpacity
            style={hStyles.mobileCtaBtn}
            onPress={() => scrollToSection('galerias-destaque')}
          >
            <Text style={hStyles.mobileCtaText}>Acessar galeria</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// ─── ADAPTIVE HEADER ─────────────────────────────────────────────────────────
function AppHeader({ navigation }) {
  const { isDesktop } = useBreakpoint();
  return isDesktop ? (
    <DesktopHeader navigation={navigation} />
  ) : (
    <MobileHeader navigation={navigation} />
  );
}

// ─── SCREEN WRAPPER ──────────────────────────────────────────────────────────
function withLayout(ScreenComponent) {
  return function WrappedScreen({ navigation, route }) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <AppHeader navigation={navigation} />
        <View style={{ flex: 1 }}>
          <ScreenComponent navigation={navigation} route={route} />
        </View>
      </View>
    );
  };
}

const HomeWrapped = withLayout(Home);
const EventDetailsWrapped = withLayout(EventDetails);
const CheckoutWrapped = withLayout(Checkout);
const MinhasComprasWrapped = withLayout(MinhasCompras);
const LocationEventsWrapped = withLayout(LocationEvents);

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'rafaelpublicado';
    }
  }, []);

  return (
    <CartProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F8FAFC' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Home" component={HomeWrapped} />
          <Stack.Screen name="EventDetails" component={EventDetailsWrapped} />
          <Stack.Screen name="LocationEvents" component={LocationEventsWrapped} />
          <Stack.Screen name="Checkout" component={CheckoutWrapped} />
          <Stack.Screen name="MinhasCompras" component={MinhasComprasWrapped} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const hStyles = StyleSheet.create({
  // Desktop header
  headerDesktop: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  innerDesktop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Layout.desktopPadding,
  },
  logoBtn: {
    paddingVertical: 4,
  },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  btnCtaHeader: {
    backgroundColor: '#006BD6',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: Radius.full,
    boxShadow: '0 4px 14px rgba(0, 107, 214, 0.3)',
  },
  btnCtaHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  cartBtnCompact: {
    backgroundColor: '#006BD6',
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(0, 107, 214, 0.35)',
  },
  cartIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cartBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },

  // Mobile header
  headerMobile: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  mobileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileMenu: {
    position: 'sticky',
    top: 64,
    zIndex: 99,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    gap: 4,
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.1)',
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  mobileMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.two,
  },
  mobileCtaBtn: {
    backgroundColor: '#006BD6',
    paddingVertical: 12,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  mobileCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
