import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import {
  fetchCustomerInfo,
  fetchOrder,
  fetchOrderPix,
  submitCheckout,
  tokenizeCardPagarme,
  submitCheckoutCreditCard,
} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { isValidCpf, maskCpf } from '../utils/cpfUtils';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Layout,
  Radius,
  Spacing,
} from '../constants/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';
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
  ChevronLeft,
  Copy,
  Check,
  CreditCard,
  QrCode,
  CircleAlert,
  Pencil,
} from 'lucide-react-native';
import PixQrCode from '../components/PixQrCode';

const theme = Colors.light;

const maskPhone = (v) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');

const maskCardNumber = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const maskExpiration = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
};

const extractPixData = (orderData, pixPayload) =>
  pixPayload?.pix_data ||
  pixPayload?.order?.pix_data ||
  orderData?.pix_data ||
  null;

export default function Checkout() {
  const navigation = useNavigation();
  const route = useRoute();
  const cartIdParam = route.params?.cart_id;
  const { isMobile } = useBreakpoint();

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

  const [step, setStep] = useState('cpf'); // 'cpf' | 'userData' | 'pix' | 'cardProcessing'
  const [paymentMethod, setPaymentMethod] = useState('PIX'); // 'PIX' | 'CREDIT_CARD'

  // User details
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [hasRememberedCpf, setHasRememberedCpf] = useState(false);

  // Credit Card details
  const [card, setCard] = useState({
    number: '',
    name: '',
    document: '',
    expiration: '',
    cvv: '',
    installments: 1,
  });
  const [cardError, setCardError] = useState('');

  // Status & Orders
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [order, setOrder] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('PENDING_PAYMENT');
  const [cartError, setCartError] = useState('');
  const [copied, setCopied] = useState(false);

  const pollIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const hasExistingCustomer =
    isExistingUser &&
    !isEditingCustomer &&
    cpf.replace(/\D/g, '').length === 11;

  useEffect(() => {
    const init = async () => {
      const savedCpf = await AsyncStorage.getItem('customer_cpf');
      if (savedCpf && isValidCpf(savedCpf)) {
        const masked = maskCpf(savedCpf);
        setCpf(masked);
        setCard((prev) => ({ ...prev, document: masked }));
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
        if (!loaded) {
          setCartError(
            'Este carrinho expirou. Volte às fotos para selecionar novamente.'
          );
        }
        setLoading(false);
      };
      load();
    }
  }, [cartIdParam]);

  useEffect(() => {
    if (!cartIdParam && cartId) {
      navigation.setParams({ cart_id: cartId });
    }
  }, [cartId, cartIdParam, navigation]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleCpfSubmit = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!isValidCpf(cleanCpf)) {
      alert('Digite um CPF válido.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchCustomerInfo(cleanCpf);
      let customer = null;
      const customerFound = res.ok;
      if (customerFound) customer = await res.json();

      setIsExistingUser(customerFound);
      setCustomerData(customerFound ? customer : null);
      setIsEditingCustomer(false);
      setName('');
      setEmail('');
      setPhone('');
      setCard((prev) => ({ ...prev, document: maskCpf(cleanCpf) }));
      await AsyncStorage.setItem('customer_cpf', cleanCpf);
      setStep('userData');
    } catch {
      setIsExistingUser(false);
      setCustomerData(null);
      setIsEditingCustomer(false);
      setName('');
      setEmail('');
      setPhone('');
      setStep('userData');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    const res = await applyCoupon(couponCode.trim());
    setCouponLoading(false);
    if (!res.ok) {
      setCouponError(res.error || 'Cupom inválido ou expirado.');
    }
  };

  const startPollingOrderStatus = (orderId) => {
    startTimeRef.current = Date.now();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetchOrder(orderId);
        if (res.ok) {
          const updated = await res.json();
          setOrder(updated);
          if (updated.status === 'PAID') {
            setOrderStatus('PAID');
            setStep('pix');
            clearInterval(pollIntervalRef.current);
            clearCart();
          }
        }
      } catch (e) {
        console.warn('Status poll error:', e);
      }
    }, 4000);
  };

  const handleFinalize = async () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    if (!hasExistingCustomer) {
      if (!name.trim()) {
        alert('Preencha seu nome completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        alert('Preencha um e-mail válido.');
        return;
      }
      if (cleanPhone.length < 10) {
        alert('Preencha um telefone/WhatsApp válido.');
        return;
      }
    }

    if (paymentMethod === 'CREDIT_CARD') {
      const cardNum = card.number.replace(/\s/g, '');
      if (cardNum.length < 13) {
        setCardError('Número de cartão inválido.');
        return;
      }
      if (!card.name.trim()) {
        setCardError('Preencha o nome impresso no cartão.');
        return;
      }
      const cardDocument = card.document.replace(/\D/g, '') || cleanCpf;
      if (!isValidCpf(cardDocument)) {
        setCardError('CPF do titular do cartão inválido.');
        return;
      }
      const expParts = card.expiration.split('/');
      if (expParts.length < 2 || !expParts[0] || !expParts[1]) {
        setCardError('Preencha a validade no formato MM/AA.');
        return;
      }
      if (!card.cvv || card.cvv.length < 3) {
        setCardError('Preencha o código de segurança (CVV).');
        return;
      }
    }

    setLoading(true);
    setCardError('');
    setOrderStatus('PENDING_PAYMENT');

    try {
      // 1. Cria o pedido na API TopFotos
      const checkoutPayload = {
        cart_id: cartId || cartIdParam,
        total_value: cartTotal.toFixed(2),
        customer_document: maskCpf(cleanCpf),
      };
      if (!hasExistingCustomer) {
        checkoutPayload.customer_name = name.trim();
        checkoutPayload.customer_email = email.trim();
        checkoutPayload.customer_phone = cleanPhone;
      }

      const checkoutRes = await submitCheckout(checkoutPayload);
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}));
        throw new Error(
          err.message || err.detail || 'Falha ao criar o pedido de checkout.'
        );
      }

      const orderData = await checkoutRes.json();
      setOrder(orderData);

      if (paymentMethod === 'PIX') {
        // 2A. Fluxo Pix
        const pixRes = await fetchOrderPix(orderData.id);
        const pixPayload = pixRes.ok ? await pixRes.json() : null;
        const pData = extractPixData(orderData, pixPayload);
        if (!pixRes.ok || !pData?.qrcode_data) {
          throw new Error('Não foi possível gerar o QR Code Pix.');
        }
        setPixData(pData);
        setStep('pix');
        startPollingOrderStatus(orderData.id);
      } else {
        // 2B. Fluxo Cartão de Crédito
        // Tokeniza na Pagar.me v5
        const cardToken = await tokenizeCardPagarme(card);

        // Envia para /api/order/checkout-credit/{orderId}
        const cardDoc = card.document ? card.document.replace(/\D/g, '') : cleanCpf;
        const payRes = await submitCheckoutCreditCard(
          orderData.id,
          cardToken,
          cardDoc,
          card.installments || 1
        );

        if (!payRes.ok) {
          const payErr = await payRes.json().catch(() => ({}));
          throw new Error(
            payErr.message ||
              payErr.error ||
              payErr.detail ||
              'Pagamento não aprovado pela operadora do cartão.'
          );
        }

        const payData = await payRes.json();
        setOrder(payData);
        if (payData.status === 'PAID') {
          setOrderStatus('PAID');
          setStep('pix');
          clearCart();
        } else {
          setOrderStatus(payData.status || 'PENDING_PAYMENT');
          setStep('cardProcessing');
          startPollingOrderStatus(orderData.id);
        }
      }
    } catch (e) {
      if (paymentMethod === 'CREDIT_CARD') {
        setCardError(e.message || 'Falha no processamento do cartão.');
      } else {
        alert(e.message || 'Erro ao processar checkout.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.qrcode_data) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(pixData.qrcode_data);
    } else {
      await Clipboard.setStringAsync(pixData.qrcode_data);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenBank = () => {
    handleCopyPix();
    if (typeof window !== 'undefined') {
      alert('Código Pix copiado! Abra o aplicativo do seu banco para colar.');
    }
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.pageContent,
        isMobile && styles.pageContentMobile,
      ]}
    >
      {/* Trust bar top */}
      <View
        style={[
          styles.trustBarTop,
          isMobile && styles.trustBarTopMobile,
        ]}
      >
        <View style={styles.trustBarItem}>
          <ShieldCheck size={15} color="var(--primary-color)" />
          <Text style={styles.trustBarText}>Pagamento 100% Seguro</Text>
        </View>
        <View style={styles.trustBarItem}>
          <Zap size={15} color="var(--primary-color)" />
          <Text style={styles.trustBarText}>Liberação Imediata</Text>
        </View>
        <View style={styles.trustBarItem}>
          <Download size={15} color="var(--primary-color)" />
          <Text style={styles.trustBarText}>Alta Resolução Original</Text>
        </View>
      </View>

      <View
        style={[
          styles.checkoutLayout,
          isMobile && styles.checkoutLayoutMobile,
        ]}
      >
        {/* Left / Top: Main Form */}
        <View style={styles.formColumn}>
          {cartError ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Aviso</Text>
              <Text style={styles.cardSubtitle}>{cartError}</Text>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.btnText}>Voltar para o Início</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* STEP: CPF */}
              {step === 'cpf' && (
                <View style={[styles.card, isMobile && styles.cardMobile]}>
                  <View style={styles.stepRow}>
                    <View style={[styles.stepDot, styles.stepDotActive]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>1</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepDot}>
                      <Text style={{ color: '#64748B', fontSize: 10 }}>2</Text>
                    </View>
                    <Text style={styles.stepLabel}>Identificação</Text>
                  </View>

                  <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile]}>
                    Digite seu CPF
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Usamos seu CPF para localizar suas compras e liberar os downloads automaticamente.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CPF do Titular</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="000.000.000-00"
                      placeholderTextColor="#94A3B8"
                      value={cpf}
                      onChangeText={(v) => setCpf(maskCpf(v))}
                      keyboardType="numeric"
                      maxLength={14}
                      onSubmitEditing={handleCpfSubmit}
                    />
                    {hasRememberedCpf && (
                      <Text style={styles.rememberedText}>
                        ✓ CPF lembrado neste dispositivo
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
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.btnText}>Continuar para Pagamento</Text>
                        <ArrowRight size={17} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP: userData & Payment Method */}
              {step === 'userData' && (
                <View style={[styles.card, isMobile && styles.cardMobile]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile]}>
                      Seus Dados & Pagamento
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setStep('cpf');
                        setCpf('');
                        setIsExistingUser(false);
                        setCustomerData(null);
                        setIsEditingCustomer(false);
                        setName('');
                        setEmail('');
                        setPhone('');
                        setHasRememberedCpf(false);
                        setCard((prev) => ({ ...prev, document: '' }));
                      }}
                    >
                      <Text style={styles.changeLink}>Alterar CPF</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {hasExistingCustomer
                      ? 'Cadastro encontrado. Confirme se os dados estão corretos.'
                      : 'Preencha seus dados para receber o comprovante e os arquivos originais.'}
                  </Text>

                  {hasExistingCustomer && (
                    <View style={styles.customerSummary}>
                      <View style={styles.customerSummaryHeading}>
                        <CheckCircle2 size={18} color="#16A34A" />
                        <Text style={styles.customerSummaryTitle}>Dados encontrados</Text>
                      </View>

                      {[
                        ['Nome', customerData?.customer_name],
                        ['CPF', customerData?.customer_document || maskCpf(cpf)],
                        ['E-mail', customerData?.customer_email],
                        ['WhatsApp', customerData?.customer_phone],
                      ].map(([label, value]) => (
                        <View key={label} style={styles.customerDataRow}>
                          <Text style={styles.customerDataLabel}>{label}</Text>
                          <Text style={styles.customerDataValue}>
                            {value || 'Não informado'}
                          </Text>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={styles.editCustomerButton}
                        onPress={() => {
                          setIsEditingCustomer(true);
                          setName('');
                          setEmail('');
                          setPhone('');
                        }}
                      >
                        <Pencil size={15} color="#334155" />
                        <Text style={styles.editCustomerButtonText}>Editar dados</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Customer Inputs */}
                  {!hasExistingCustomer && (
                    <View style={styles.inputGrid}>
                      {isExistingUser && isEditingCustomer && (
                        <TouchableOpacity
                          onPress={() => {
                            setIsEditingCustomer(false);
                            setName('');
                            setEmail('');
                            setPhone('');
                          }}
                        >
                          <Text style={styles.cancelEditLink}>Cancelar edição</Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nome Completo</Text>
                        <TextInput
                          style={styles.input}
                          value={name}
                          onChangeText={setName}
                          placeholder="Seu nome completo"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>E-mail para envio das fotos</Text>
                        <TextInput
                          style={styles.input}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          placeholder="seuemail@exemplo.com"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>WhatsApp / Telefone</Text>
                        <TextInput
                          style={styles.input}
                          value={phone}
                          onChangeText={(v) => setPhone(maskPhone(v))}
                          keyboardType="phone-pad"
                          placeholder="(00) 00000-0000"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  )}

                  {/* Payment Method Selector */}
                  <Text style={styles.sectionHeaderTitle}>FORMA DE PAGAMENTO</Text>
                  <View style={styles.paymentMethodRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentMethodCard,
                        paymentMethod === 'PIX' && styles.paymentMethodCardActive,
                      ]}
                      onPress={() => setPaymentMethod('PIX')}
                      activeOpacity={0.88}
                    >
                      <View style={styles.pmRadioRow}>
                        <View style={[styles.radioCircle, paymentMethod === 'PIX' && styles.radioCircleActive]}>
                          {paymentMethod === 'PIX' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={[styles.pmTitle, paymentMethod === 'PIX' && styles.pmTitleActive]}>
                          Pix
                        </Text>
                      </View>
                      <Text style={styles.pmSubtitle}>Aprovação imediata</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentMethodCard,
                        paymentMethod === 'CREDIT_CARD' && styles.paymentMethodCardActive,
                      ]}
                      onPress={() => setPaymentMethod('CREDIT_CARD')}
                      activeOpacity={0.88}
                    >
                      <View style={styles.pmRadioRow}>
                        <View style={[styles.radioCircle, paymentMethod === 'CREDIT_CARD' && styles.radioCircleActive]}>
                          {paymentMethod === 'CREDIT_CARD' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={[styles.pmTitle, paymentMethod === 'CREDIT_CARD' && styles.pmTitleActive]}>
                          Cartão
                        </Text>
                      </View>
                      <Text style={styles.pmSubtitle}>À vista / parcelado</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Credit Card Form Fields */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <View style={styles.cardFormBox}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Número do Cartão</Text>
                        <TextInput
                          style={styles.input}
                          value={card.number}
                          onChangeText={(v) =>
                            setCard((prev) => ({ ...prev, number: maskCardNumber(v) }))
                          }
                          keyboardType="numeric"
                          placeholder="0000 0000 0000 0000"
                          placeholderTextColor="#94A3B8"
                          maxLength={19}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Nome impresso no Cartão</Text>
                        <TextInput
                          style={styles.input}
                          value={card.name}
                          onChangeText={(v) =>
                            setCard((prev) => ({ ...prev, name: v.toUpperCase() }))
                          }
                          placeholder="NOME COMO ESTÁ NO CARTÃO"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>CPF do Titular do Cartão</Text>
                        <TextInput
                          style={styles.input}
                          value={card.document}
                          onChangeText={(v) =>
                            setCard((prev) => ({ ...prev, document: maskCpf(v) }))
                          }
                          keyboardType="numeric"
                          placeholder="000.000.000-00"
                          placeholderTextColor="#94A3B8"
                          maxLength={14}
                        />
                      </View>

                      <View
                        style={[
                          styles.twoColRow,
                          isMobile && styles.twoColRowMobile,
                        ]}
                      >
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>Validade (MM/AA)</Text>
                          <TextInput
                            style={styles.input}
                            value={card.expiration}
                            onChangeText={(v) =>
                              setCard((prev) => ({ ...prev, expiration: maskExpiration(v) }))
                            }
                            keyboardType="numeric"
                            placeholder="MM/AA"
                            placeholderTextColor="#94A3B8"
                            maxLength={5}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>CVV / CVC</Text>
                          <TextInput
                            style={styles.input}
                            value={card.cvv}
                            onChangeText={(v) =>
                              setCard((prev) => ({ ...prev, cvv: v.replace(/\D/g, '').slice(0, 4) }))
                            }
                            keyboardType="numeric"
                            placeholder="123"
                            placeholderTextColor="#94A3B8"
                            maxLength={4}
                            secureTextEntry
                          />
                        </View>
                      </View>

                      {cardError ? (
                        <View style={styles.cardErrorBox}>
                          <CircleAlert size={16} color="#EF4444" />
                          <Text style={styles.cardErrorText}>{cardError}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.btnPrimary, loading && styles.btnDisabled]}
                    onPress={handleFinalize}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.btnText}>Finalizar Compra</Text>
                        <ArrowRight size={17} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP: Card processing */}
              {step === 'cardProcessing' && (
                <View style={[styles.card, isMobile && styles.cardMobile]}>
                  <ActivityIndicator color="var(--primary-color)" size="large" />
                  <Text style={[styles.cardTitle, { textAlign: 'center', marginTop: 16 }]}>
                    Confirmando pagamento
                  </Text>
                  <Text style={[styles.cardSubtitle, { textAlign: 'center' }]}>
                    Recebemos a transação do cartão e estamos aguardando a confirmação da operadora.
                  </Text>
                </View>
              )}

              {/* STEP: PIX or Approved Screen */}
              {step === 'pix' && (
                <View style={[styles.card, isMobile && styles.cardMobile]}>
                  {orderStatus === 'PAID' ? (
                    <View style={styles.paidSuccessBox}>
                      <CheckCircle2
                        size={56}
                        color="#10B981"
                        style={{ alignSelf: 'center', marginBottom: 14 }}
                      />
                      <Text style={styles.paidTitle}>Pagamento Confirmado!</Text>
                      <Text style={styles.paidSub}>
                        Pedido #{order?.order_number || order?.id?.slice(0, 8)} liberado com sucesso.
                      </Text>
                      <Text style={styles.paidDesc}>
                        Seus arquivos em altíssima definição já estão disponíveis para download imediato.
                      </Text>
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => navigation.navigate('MinhasCompras')}
                      >
                        <Download size={18} color="#FFFFFF" />
                        <Text style={styles.btnText}>Acessar e Baixar Minhas Fotos</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.cardTitle, isMobile && styles.cardTitleMobile]}>
                        Pague via Pix
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        Escaneie o QR Code no app do banco ou copie o código Pix abaixo.
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
                        activeOpacity={0.88}
                      >
                        {copied ? (
                          <>
                            <Check size={18} color="#FFFFFF" />
                            <Text style={styles.btnText}>Código Pix Copiado!</Text>
                          </>
                        ) : (
                          <>
                            <Copy size={18} color="#FFFFFF" />
                            <Text style={styles.btnText}>Copiar Código Pix</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnBank}
                        onPress={handleOpenBank}
                        activeOpacity={0.85}
                      >
                        <Landmark color="var(--primary-color)" size={17} />
                        <Text style={styles.btnBankText}>
                          Copiar e abrir app do banco
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.pixWaiting}>
                        <ActivityIndicator color="var(--primary-color)" size="small" />
                        <Text style={styles.pixWaitingText}>
                          Aguardando confirmação bancária em tempo real...
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Right / Bottom: Order Summary */}
        {step !== 'pix' && cartItems.length > 0 && (
          <View
            style={[
              styles.summaryColumn,
              isMobile && styles.summaryColumnMobile,
            ]}
          >
            <View style={[styles.summaryCard, isMobile && styles.summaryCardMobile]}>
              <View style={styles.summaryHeader}>
                <ShoppingBag size={18} color="var(--primary-color)" />
                <Text style={styles.summaryTitle}>Resumo da Compra</Text>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>{cartItems.length}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryItems}>
                {cartItems.map((item) => (
                  <View key={item.cartItemId || item.id} style={styles.summaryItem}>
                    <Image
                      source={{ uri: item.watermark_path || item.url }}
                      style={styles.summaryItemImage}
                      resizeMode="cover"
                    />
                    <View style={styles.summaryItemContent}>
                      <Text style={styles.summaryItemTitle} numberOfLines={2}>
                        {item.description || 'Foto selecionada'}
                      </Text>
                      {item.short_reference ? (
                        <Text style={styles.summaryItemReference} numberOfLines={1}>
                          Código: #{item.short_reference}
                        </Text>
                      ) : null}
                      <Text style={styles.summaryItemPrice}>
                        R$ {Number(item.price || 0).toFixed(2).replace('.', ',')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Subtotal ({cartItems.length}{' '}
                  {cartItems.length === 1 ? 'foto' : 'fotos'})
                </Text>
                <Text style={styles.summaryValue}>
                  R$ {cartSubtotal.toFixed(2).replace('.', ',')}
                </Text>
              </View>

              {cartDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#10B981' }]}>
                    Desconto aplicado
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: '#10B981', fontWeight: FontWeights.bold },
                    ]}
                  >
                    - R$ {cartDiscount.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              )}

              {/* Coupon */}
              {appliedCoupon ? (
                <View style={styles.couponApplied}>
                  <View style={styles.couponBadgeRow}>
                    <Ticket size={15} color="var(--primary-color)" />
                    <Text style={styles.couponBadge}>
                      {appliedCoupon.name || 'Cupom Ativo'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      setCouponLoading(true);
                      await removeCoupon();
                      setCouponLoading(false);
                    }}
                    disabled={couponLoading}
                  >
                    <Text style={styles.couponRemove}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.couponRow}>
                    <TextInput
                      style={[styles.input, { flex: 1, minHeight: 44 }]}
                      placeholder="CUPOM DE DESCONTO"
                      placeholderTextColor="#94A3B8"
                      value={couponCode}
                      onChangeText={(v) => setCouponCode(v.toUpperCase())}
                    />
                    <TouchableOpacity
                      style={[
                        styles.btnCoupon,
                        (!couponCode || couponLoading) && styles.btnDisabled,
                      ]}
                      onPress={handleApplyCoupon}
                      disabled={!couponCode || couponLoading}
                    >
                      {couponLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.btnCouponText}>Aplicar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {couponError ? (
                    <Text style={styles.couponError}>{couponError}</Text>
                  ) : null}
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  R$ {cartTotal.toFixed(2).replace('.', ',')}
                </Text>
              </View>

              {/* Security info box */}
              <View style={styles.summaryTrustBox}>
                <Lock size={14} color="var(--primary-color)" />
                <Text style={styles.summaryTrustText}>
                  Ambiente criptografado com certificação SSL e liberação imediata.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pageContent: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Layout.desktopPadding,
    paddingTop: 32,
    paddingBottom: 80,
  },
  pageContentMobile: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 60,
  },

  // Trust bar top
  trustBarTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: Spacing.six,
    flexWrap: 'wrap',
  },
  trustBarTopMobile: {
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderRadius: Radius.md,
  },
  trustBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBarText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: FontWeights.semibold,
  },

  checkoutLayout: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
    width: '100%',
  },
  checkoutLayoutMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  formColumn: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    gap: Spacing.four,
  },
  summaryColumn: {
    width: 360,
    flexShrink: 0,
  },
  summaryColumnMobile: {
    width: '100%',
    maxWidth: '100%',
    marginTop: 4,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: 'var(--primary-color)',
    borderWidth: 1,
    borderColor: 'var(--primary-color)',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepLabel: {
    marginLeft: Spacing.two,
    fontSize: 13,
    fontWeight: FontWeights.bold,
    color: 'var(--primary-color)',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.six,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    width: '100%',
  },
  cardMobile: {
    padding: 16,
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: '#0F172A',
    marginBottom: 4,
  },
  cardTitleMobile: {
    fontSize: 19,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: Spacing.five,
    lineHeight: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
    gap: 8,
  },
  changeLink: {
    color: 'var(--primary-color)',
    fontWeight: FontWeights.semibold,
    fontSize: 13,
  },
  customerSummary: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    marginBottom: 18,
    gap: 10,
  },
  customerSummaryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  customerSummaryTitle: {
    color: '#166534',
    fontSize: 14,
    fontWeight: FontWeights.bold,
  },
  customerDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  customerDataLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
  customerDataValue: {
    color: '#0F172A',
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
  },
  editCustomerButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    marginTop: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
  },
  editCustomerButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
  cancelEditLink: {
    alignSelf: 'flex-end',
    color: 'var(--primary-color)',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },

  // Section Header
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    marginTop: 6,
    letterSpacing: 0.5,
  },

  // Payment Method Selector
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  paymentMethodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: Radius.lg,
    padding: 12,
    gap: 2,
  },
  paymentMethodCardActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: '#EFF6FF',
  },
  pmRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: 'var(--primary-color)',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'var(--primary-color)',
  },
  pmTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pmTitleActive: {
    color: 'var(--primary-color)',
  },
  pmSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 24,
  },

  // Card Form Box
  cardFormBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 10,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  twoColRowMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  cardErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cardErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Inputs
  inputGrid: { gap: Spacing.three, marginBottom: Spacing.four },
  inputGroup: { marginBottom: Spacing.three },
  inputLabel: {
    fontSize: 11,
    fontWeight: FontWeights.bold,
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  rememberedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: FontWeights.semibold,
    marginTop: 4,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: 'var(--primary-color)',
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    boxShadow: '0 4px 18px rgba(0, 107, 214, 0.3)',
    marginTop: 6,
  },
  btnSuccess: {
    backgroundColor: '#10B981',
  },
  btnBank: {
    minHeight: 46,
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  btnBankText: {
    color: 'var(--primary-color)',
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 14,
  },
  btnCoupon: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  btnCouponText: {
    color: 'var(--primary-color)',
    fontWeight: FontWeights.bold,
    fontSize: 13,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    width: '100%',
  },
  summaryCardMobile: {
    padding: 16,
    borderRadius: 14,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
    flex: 1,
  },
  summaryBadge: {
    backgroundColor: 'var(--primary-color)',
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeights.extrabold,
  },
  summaryItems: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  summaryItemImage: {
    width: 54,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: '#E2E8F0',
  },
  summaryItemContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  summaryItemTitle: {
    color: '#0F172A',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: FontWeights.bold,
  },
  summaryItemReference: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  summaryItemPrice: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: FontWeights.bold,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Spacing.two + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  summaryLabel: { fontSize: 13, color: '#475569' },
  summaryValue: {
    fontSize: 13,
    fontWeight: FontWeights.semibold,
    color: '#0F172A',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  couponApplied: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  couponBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  couponBadge: {
    fontSize: 13,
    fontWeight: FontWeights.bold,
    color: 'var(--primary-color)',
  },
  couponRemove: {
    color: '#EF4444',
    fontWeight: FontWeights.bold,
    fontSize: 12,
  },
  couponError: { color: '#EF4444', fontSize: 12, marginBottom: Spacing.two },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: 'var(--primary-color)',
  },
  summaryTrustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: Radius.md,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTrustText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 16,
  },

  // PIX
  pixCodeBox: {
    backgroundColor: '#F8FAFC',
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    marginBottom: Spacing.four,
    marginTop: Spacing.two,
  },
  pixCode: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 17,
    fontFamily: 'monospace',
  },
  pixWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  pixWaitingText: {
    fontSize: 12,
    color: '#475569',
  },

  // Paid Success
  paidSuccessBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  paidTitle: {
    fontSize: 22,
    fontWeight: FontWeights.extrabold,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  paidSub: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
    marginBottom: 10,
  },
  paidDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 400,
    lineHeight: 20,
  },
});
