import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import {
  fetchCustomerInfo,
  fetchOrder,
  fetchOrderPix,
  submitCheckout,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { isValidCpf, maskCpf } from '../utils/cpfUtils';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
} from '../constants/theme';
import {
  CheckCircle2,
  Landmark,
  ShoppingBag,
  Ticket,
  ShieldCheck,
  Zap,
  Download,
  Lock,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react-native';
import PixQrCode from '../components/PixQrCode';

const theme = Colors.dark;

const maskPhone = (v) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');

const isRedacted = (val) => val && (val.includes('*') || val.includes('X'));

const extractPixData = (orderData, pixPayload) =>
  pixPayload?.pix_data ||
  pixPayload?.order?.pix_data ||
  orderData?.pix_data ||
  null;

export default function Checkout() {
  const navigation = useNavigation();
  const route = useRoute();
  const cartIdParam = route.params?.cart_id;

  const {
    cartItems,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    clearCart,
    initializeCartWithId,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    cartId,
  } = useCart();

  const [step, setStep] = useState('cpf');
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [order, setOrder] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('PENDING_PAYMENT');
  const [hasRememberedCpf, setHasRememberedCpf] = useState(false);
  const [cartError, setCartError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const savedCpf = await AsyncStorage.getItem('customer_cpf');
      if (savedCpf && isValidCpf(savedCpf)) {
        setCpf(maskCpf(savedCpf));
        setHasRememberedCpf(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (cartIdParam) {
      const load = async () => {
        setLoading(true);
        const loaded = await initializeCartWithId(cartIdParam);
        if (!loaded)
          setCartError(
            'Este carrinho expirou. Volte às fotos para selecionar novamente.'
          );
        setLoading(false);
      };
      load();
    }
  }, [cartIdParam]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleCpfSubmit = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!isValidCpf(cleanCpf)) {
      Alert.alert('CPF Inválido', 'Digite um CPF válido.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchCustomerInfo(cleanCpf);
      let customer = null;
      const customerFound = res.ok;
      if (customerFound) customer = await res.json();
      await AsyncStorage.setItem('customer_cpf', cleanCpf);
      setHasRememberedCpf(true);
      if (customerFound) {
        setIsExistingUser(true);
        setName(customer?.customer_name || '');
        setEmail(customer?.customer_email || '');
        setPhone(
          customer?.customer_phone ? maskPhone(customer.customer_phone) : ''
        );
        await handleFinalize(cleanCpf, true);
        return;
      }
      setIsExistingUser(false);
      setName(customer?.customer_name || '');
      setEmail(customer?.customer_email || '');
      setPhone(
        customer?.customer_phone ? maskPhone(customer.customer_phone) : ''
      );
      setStep('userData');
    } catch {
      setIsExistingUser(false);
      setStep('userData');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async (
    cpfOverride = '',
    includeContactOverride = null
  ) => {
    setLoading(true);
    const cleanCpf = (cpfOverride || cpf).replace(/\D/g, '');
    const includeContact =
      includeContactOverride !== null
        ? !includeContactOverride
        : !isExistingUser;
    const cleanPhone = (val) =>
      isRedacted(val)
        ? val.replace(/[\s\-()]/g, '')
        : val.replace(/\D/g, '');

    const payload = {
      cart_id: cartIdParam || cartId,
      total_value: cartTotal,
      customer_document: maskCpf(cleanCpf),
    };
    if (includeContact) {
      payload.customer_name = name.trim();
      payload.customer_email = email.trim();
      payload.customer_phone = cleanPhone(phone);
    }

    try {
      const res = await submitCheckout(payload);
      if (res.ok) {
        const orderData = await res.json();
        setOrder(orderData);
        await AsyncStorage.setItem(
          `order_by_cart_${cartIdParam || cartId}`,
          JSON.stringify(orderData)
        );
        await AsyncStorage.setItem('customer_cpf', cleanCpf);
        let pixInfo = extractPixData(orderData, null);
        if (!pixInfo?.qrcode_data) {
          const pixRes = await fetchOrderPix(orderData.id);
          const pixDetails = await pixRes.json().catch(() => null);
          pixInfo = extractPixData(orderData, pixDetails);
        }
        if (pixInfo) {
          setPixData(pixInfo);
          setStep('pix');
          startTimeRef.current = Date.now();
          clearCart();
          startPolling(orderData.id);
        } else {
          Alert.alert('Erro', 'Não foi possível gerar o QR Code Pix.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert(
          'Aviso',
          errData.error || errData.detail || 'Erro ao processar o checkout.'
        );
      }
    } catch {
      Alert.alert('Erro', 'Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (orderId) => {
    pollIntervalRef.current = setInterval(async () => {
      if (Date.now() - startTimeRef.current > 600000) {
        clearInterval(pollIntervalRef.current);
        return;
      }
      try {
        const res = await fetchOrder(orderId);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            setOrder(data);
            setOrderStatus('PAID');
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch {}
    }, 5000);
  };

  const handleCopyPix = async () => {
    if (pixData?.qrcode_data) {
      await Clipboard.setStringAsync(pixData.qrcode_data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenBank = async () => {
    if (!pixData?.qrcode_data) return;
    await Clipboard.setStringAsync(pixData.qrcode_data);
    const bankUrl =
      pixData.bank_app_url ||
      pixData.pix_deeplink ||
      pixData.deeplink ||
      pixData.payment_url;
    if (bankUrl) {
      try {
        await Linking.openURL(bankUrl);
        return;
      } catch {}
    }
    Alert.alert(
      'Código Copiado',
      'Abra o app do seu banco e cole o código na opção Pix Copia e Cola.'
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {cartError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Carrinho expirado</Text>
          <Text style={styles.cardSubtitle}>{cartError}</Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnText}>Voltar às fotos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {step === 'cpf' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Identificação</Text>
              <Text style={styles.cardSubtitle}>
                Informe seu CPF para gerar o pagamento via Pix.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CPF</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000.000.000-00"
                  placeholderTextColor={DarkPalette.textMuted}
                  value={cpf}
                  onChangeText={(v) => setCpf(maskCpf(v))}
                  keyboardType="numeric"
                  maxLength={14}
                  onSubmitEditing={handleCpfSubmit}
                />
                {hasRememberedCpf && (
                  <Text style={styles.rememberedText}>
                    ✓ CPF lembrado neste aparelho
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  (cpf.replace(/\D/g, '').length < 11 || loading) &&
                    styles.btnDisabled,
                ]}
                onPress={handleCpfSubmit}
                disabled={cpf.replace(/\D/g, '').length < 11 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Continuar para Pagamento</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'userData' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Seus Dados</Text>
              <Text style={styles.cardSubtitle}>
                Preencha para receber as fotos no e-mail.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome"
                  placeholderTextColor={DarkPalette.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={DarkPalette.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WhatsApp</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(v) => setPhone(maskPhone(v))}
                  keyboardType="phone-pad"
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={DarkPalette.textMuted}
                />
              </View>
              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={() => handleFinalize()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnText}>Finalizar via PIX</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 'pix' && (
            <View style={styles.card}>
              {orderStatus === 'PAID' ? (
                <>
                  <CheckCircle2
                    size={56}
                    color="#20C997"
                    style={{ alignSelf: 'center', marginBottom: 16 }}
                  />
                  <Text style={[styles.cardTitle, { textAlign: 'center' }]}>
                    Pagamento Aprovado!
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { textAlign: 'center', marginBottom: 20 },
                    ]}
                  >
                    Pedido #{order?.order_number} pago com sucesso.
                  </Text>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => navigation.navigate('MinhasCompras')}
                  >
                    <Text style={styles.btnText}>Ver Minhas Fotos Compradas</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitle}>Pague via Pix</Text>
                  <Text style={styles.cardSubtitle}>
                    Copie o código ou escaneie o QR Code.
                  </Text>
                  <PixQrCode pixData={pixData} />
                  <View style={styles.pixCodeBox}>
                    <Text style={styles.pixCode} numberOfLines={3} selectable>
                      {pixData?.qrcode_data}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btnPrimary, copied && styles.btnSuccess]}
                    onPress={handleCopyPix}
                  >
                    <Text style={styles.btnText}>
                      {copied ? 'Código Copiado!' : 'Copiar Código Pix'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnBank}
                    onPress={handleOpenBank}
                  >
                    <Landmark color="#009DFF" size={16} />
                    <Text style={styles.btnBankText}>Abrir app do banco</Text>
                  </TouchableOpacity>
                  <View style={styles.pixWaiting}>
                    <ActivityIndicator color="#009DFF" size="small" />
                    <Text style={styles.pixWaitingText}>
                      Aguardando confirmação bancária...
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#020406' },
  pageContent: { padding: Spacing.four, paddingBottom: 80 },
  card: {
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: FontWeights.extrabold,
    color: '#F7F9FC',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: DarkPalette.textSecondary,
    marginBottom: Spacing.four,
    lineHeight: 18,
  },
  inputGroup: { marginBottom: Spacing.three },
  inputLabel: {
    fontSize: 11,
    fontWeight: FontWeights.bold,
    color: DarkPalette.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#050B12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 14,
    color: '#F7F9FC',
  },
  rememberedText: {
    fontSize: 11,
    color: '#20C997',
    fontWeight: FontWeights.semibold,
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: '#006BD6',
    padding: Spacing.four,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  btnSuccess: { backgroundColor: '#20C997' },
  btnBank: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.35)',
    backgroundColor: 'rgba(0, 107, 214, 0.12)',
  },
  btnBankText: { color: '#009DFF', fontSize: 13, fontWeight: FontWeights.bold },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontWeight: FontWeights.bold, fontSize: 14 },
  pixCodeBox: {
    backgroundColor: '#050B12',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.25)',
    borderStyle: 'dashed',
    marginBottom: Spacing.three,
  },
  pixCode: { fontSize: 11, color: DarkPalette.textSecondary, lineHeight: 16 },
  pixWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.four,
  },
  pixWaitingText: { fontSize: 12, color: DarkPalette.textMuted },
});
