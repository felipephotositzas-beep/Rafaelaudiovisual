import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { CartProvider } from './src/context/CartContext.js';
import { Colors, DarkPalette, FontWeights, Radius, Spacing } from './src/constants/theme';
import BrandLogo from './src/components/BrandLogo';

import Home from './src/pages/Home';
import EventDetails from './src/pages/EventDetails';
import Checkout from './src/pages/Checkout';
import MinhasCompras from './src/pages/MinhasCompras';
import LocationEvents from './src/pages/LocationEvents';
import ScreenCaptureGuard from './src/components/ScreenCaptureGuard';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

function PurchasesButton({ navigation }) {
  return (
    <TouchableOpacity
      style={styles.headerComprasBtn}
      onPress={() => navigation.navigate('MinhasCompras')}
      activeOpacity={0.8}
    >
      <ShoppingBag size={15} color="#009DFF" />
      <Text style={styles.comprasBtnText}>Minhas Compras</Text>
    </TouchableOpacity>
  );
}

function HeaderLogo() {
  return <BrandLogo size="sm" showTagline={false} />;
}

export default function App() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
  }, []);

  return (
    <CartProvider>
      <ScreenCaptureGuard />
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#020406' },
            headerTintColor: '#F7F9FC',
            headerTitleStyle: { fontWeight: FontWeights.bold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: '#020406' },
          }}
        >
          <Stack.Screen
            name="Home"
            component={Home}
            options={({ navigation }) => ({
              headerTitle: '',
              headerLeft: () => <PurchasesButton navigation={navigation} />,
              headerRight: () => <HeaderLogo />,
              headerStyle: { backgroundColor: '#020406' },
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="EventDetails"
            component={EventDetails}
            options={{ title: 'Galeria de Fotos' }}
          />
          <Stack.Screen
            name="LocationEvents"
            component={LocationEvents}
            options={{ title: 'Eventos' }}
          />
          <Stack.Screen
            name="Checkout"
            component={Checkout}
            options={{ title: 'Finalizar Compra' }}
          />
          <Stack.Screen
            name="MinhasCompras"
            component={MinhasCompras}
            options={{ title: 'Minhas Compras' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  headerComprasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
  },
  comprasBtnText: {
    fontSize: 12,
    fontWeight: FontWeights.semibold,
    color: '#F7F9FC',
  },
});
