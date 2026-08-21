// App.web.js - Ponto de Entrada Web
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Menu,
  X,
  ShoppingCart,
  ShoppingBag,
  HelpCircle,
  Layers,
  ChevronRight,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react-native';
import { CartProvider, useCart } from './src/context/CartContext';
import { AdminConfigProvider, useAdminConfig } from './src/context/AdminConfigContext';
import { useBreakpoint } from './src/hooks/useBreakpoint';

import Home from './src/pages/Home';
import EventDetails from './src/pages/EventDetails';
import Checkout from './src/pages/Checkout';
import MinhasCompras from './src/pages/MinhasCompras';
import LocationEvents from './src/pages/LocationEvents';
import AdminPanel from './src/pages/AdminPanel';
import BulkMessage from './src/pages/BulkMessage.web';
import CartModal from './src/components/CartModal';
import BrandLogo from './src/components/BrandLogo';
import { RAFAEL_FAVICON } from './src/constants/favicon';
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
  prefixes: [
    'apptopfotosnative://',
    'https://topfotos.com.br',
    'https://rafaelpublicado.com.br',
    'https://rafaelaudiovisual.vercel.app',
  ],
  config: {
    screens: {
      Home: '',
      EventDetails: 'evento/:id',
      MinhasCompras: 'minhas-compras',
      Checkout: 'checkout',
      Admin: 'admin',
      Disparador: 'disparador',
    },
  },
};

// ─── CART BUTTON ─────────────────────────────────────────────────────────────
function CartHeaderButton({ navigation, compact }) {
  const { cartItems, cartTotal, cartId } = useCart();
  const [modalVisible, setModalVisible] = useState(false);

  const handleCheckout = () => {
    setModalVisible(false);
    navigation.navigate('Checkout', { cart_id: cartId });
  };

  if (cartItems.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={[hStyles.cartBtn, compact && hStyles.cartBtnCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Carrinho de compras, ${cartItems.length} itens`}
      >
        <View style={hStyles.cartIconWrapper}>
          <ShoppingCart size={18} color="#006BD6" strokeWidth={2.2} />
          <View style={hStyles.cartBadge}>
            <Text style={hStyles.cartBadgeText}>
              {cartItems.length > 99 ? '99+' : cartItems.length}
            </Text>
          </View>
        </View>

        {!compact && (
          <View style={hStyles.cartTextWrapper}>
            <Text style={hStyles.cartLabel}>Meu Carrinho</Text>
            <Text style={hStyles.cartTotal}>
              R$ {(cartTotal || 0).toFixed(2).replace('.', ',')}
            </Text>
          </View>
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

// ─── DESKTOP HEADER ─────────────────────────────────────────────────────────
function DesktopHeader({ navigation }) {
  const { config } = useAdminConfig();

  const scrollToSection = (sectionId) => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    const num = config.branding?.whatsappNumber || '5599991297693';
    const msg = encodeURIComponent(config.branding?.whatsappMessage || 'Olá, gostaria de tirar uma dúvida sobre as fotos.');
    Linking.openURL(`https://api.whatsapp.com/send?phone=${num}&text=${msg}`);
  };

  return (
    <View style={hStyles.headerDesktop}>
      <View style={hStyles.headerDesktopInner}>
        {/* Brand Logo */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
          style={hStyles.brandTouch}
        >
          <BrandLogo size="md" />
        </TouchableOpacity>

        {/* Center Nav */}
        <View style={hStyles.navLinks}>
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

          <TouchableOpacity
            style={hStyles.navLink}
            onPress={() => navigation.navigate('MinhasCompras')}
          >
            <Text style={hStyles.navLinkText}>Minhas Compras</Text>
          </TouchableOpacity>
        </View>

        {/* Right Actions */}
        <View style={hStyles.headerActions}>
          <CartHeaderButton navigation={navigation} compact={false} />
          
          <TouchableOpacity
            style={hStyles.btnCtaHeader}
            onPress={() => navigation.navigate('Admin')}
            activeOpacity={0.88}
          >
            <Text style={hStyles.btnCtaHeaderText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── MOBILE HEADER ───────────────────────────────────────────────────────────
function MobileHeader({ navigation }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { config } = useAdminConfig();

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
    const num = config.branding?.whatsappNumber || '5599991297693';
    const msg = encodeURIComponent(config.branding?.whatsappMessage || 'Olá, gostaria de tirar uma dúvida sobre as fotos.');
    Linking.openURL(`https://api.whatsapp.com/send?phone=${num}&text=${msg}`);
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
            onPress={() => setMenuOpen((v) => !v)}
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
            onPress={() => handleNav('Admin')}
          >
            <Text style={hStyles.mobileCtaText}>Entrar</Text>
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

// ─── WRAPPER HOC ─────────────────────────────────────────────────────────────
function withLayout(Component, showHeader = true) {
  return function WrappedScreen(props) {
    return (
      <View style={styles.screenWrapper}>
        {showHeader && <AppHeader navigation={props.navigation} />}
        <Component {...props} />
      </View>
    );
  };
}

const HomeWrapped = withLayout(Home);
const EventDetailsWrapped = withLayout(EventDetails);
const CheckoutWrapped = withLayout(Checkout);
const MinhasComprasWrapped = withLayout(MinhasCompras);
const LocationEventsWrapped = withLayout(LocationEvents);
const AdminWrapped = withLayout(AdminPanel, false);
const BulkMessageWrapped = withLayout(BulkMessage, false); // Admin has its own clean topbar

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
function MainNavigation() {
  const { config } = useAdminConfig();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = config.branding?.siteTitle || 'rafaelpublicado';

      // Aplica o favicon oficial do Rafael Publicado diretamente via Data URI de alta resolução
      try {
        const setFavicon = (rel, href) => {
          let link = document.querySelector(`link[rel~='${rel}']`);
          if (!link) {
            link = document.createElement('link');
            link.rel = rel;
            document.head.appendChild(link);
          }
          link.type = 'image/png';
          link.href = href;
        };

        setFavicon('icon', RAFAEL_FAVICON);
        setFavicon('shortcut icon', RAFAEL_FAVICON);
        setFavicon('apple-touch-icon', RAFAEL_FAVICON);
      } catch {}
    }
  }, [config.branding?.siteTitle]);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: config.theme?.backgroundColor || '#F8FAFC' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Home" component={HomeWrapped} />
        <Stack.Screen name="EventDetails" component={EventDetailsWrapped} />
        <Stack.Screen name="LocationEvents" component={LocationEventsWrapped} />
        <Stack.Screen name="Checkout" component={CheckoutWrapped} />
        <Stack.Screen name="MinhasCompras" component={MinhasComprasWrapped} />
        <Stack.Screen name="Admin" component={AdminWrapped} />
        <Stack.Screen name="Disparador" component={BulkMessageWrapped} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AdminConfigProvider>
      <CartProvider>
        <MainNavigation />
      </CartProvider>
    </AdminConfigProvider>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

const hStyles = StyleSheet.create({
  headerDesktop: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  headerDesktopInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTouch: {
    paddingVertical: 4,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  navLink: {
    paddingVertical: 8,
  },
  adminNavLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    letterSpacing: -0.1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartBtnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#006BD6',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cartTextWrapper: {
    alignItems: 'flex-start',
  },
  cartLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cartTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  btnCtaHeader: {
    backgroundColor: '#006BD6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnCtaHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerMobile: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  mobileMenu: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mobileMenuText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  mobileCtaBtn: {
    backgroundColor: '#006BD6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  mobileCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
