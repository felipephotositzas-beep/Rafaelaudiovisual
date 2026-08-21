import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import {
  Check,
  Clock3,
  Download,
  Play,
  ShoppingBag,
  ArrowLeft,
  Search,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { fetchCustomerOrders, fetchOrder, fetchOrderPix } from '../utils/api';
import { isValidCpf, maskCpf } from '../utils/cpfUtils';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Layout,
  Radius,
  Spacing,
} from '../constants/theme';
import PixQrCode from '../components/PixQrCode';
import PurchasedMediaViewer from '../components/PurchasedMediaViewer';
import { savePurchasedMedia } from '../utils/savePurchasedMedia';

const theme = Colors.dark;

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return `https://painel.topfotos.com.br${url}`;
  return url;
};

export default function MinhasCompras() {
  const navigation = useNavigation();
  const { isMobile } = useBreakpoint();
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('paid');
  const [viewingPixOrderId, setViewingPixOrderId] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewer, setViewer] = useState(null);
  const pollIntervalRef = useRef(null);
  const pollStartRef = useRef(null);

  useEffect(() => {
    const loadSaved = async () => {
      const saved = await AsyncStorage.getItem('customer_cpf');
      if (saved) {
        setCpf(maskCpf(saved));
        fetchOrders(saved);
      }
    };
    loadSaved();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const fetchOrders = async (cleanCpf) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCustomerOrders(cleanCpf);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.results || []);
        setSearched(true);
        await AsyncStorage.setItem('customer_cpf', cleanCpf);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(
          errData.error || 'Erro ao carregar compras. Verifique o CPF informado.'
        );
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    const clean = cpf.replace(/\D/g, '');
    if (!isValidCpf(clean)) {
      setError('Informe um CPF válido para consultar as compras.');
      return;
    }
    fetchOrders(clean);
  };

  const handleViewPix = async (orderId) => {
    setViewingPixOrderId(orderId);
    setPixLoading(true);
    setPixData(null);
    try {
      const orderResponse = await fetchOrder(orderId);
      const orderData = orderResponse.ok ? await orderResponse.json() : null;
      let pix = orderData?.pix_data || null;
      if (!pix?.qrcode_data) {
        const pixResponse = await fetchOrderPix(orderId);
        const pixPayload = await pixResponse.json().catch(() => ({}));
        pix =
          pixPayload?.pix_data || pixPayload?.order?.pix_data || pixPayload;
        if (!pixResponse.ok)
          throw new Error(
            pixPayload?.error?.message ||
              pixPayload?.error ||
              'Não foi possível gerar o Pix.'
          );
      }
      if (pix?.qrcode_data) {
        setPixData(pix);
        pollStartRef.current = Date.now();
        pollIntervalRef.current = setInterval(async () => {
          if (Date.now() - pollStartRef.current > 600000) {
            clearInterval(pollIntervalRef.current);
            return;
          }
          const statusRes = await fetchOrder(orderId).catch(() => null);
          if (statusRes?.ok) {
            const d = await statusRes.json();
            if (d.status === 'PAID') {
              clearInterval(pollIntervalRef.current);
              setOrders((prev) =>
                prev.map((o) =>
                  o.id === orderId ? { ...o, status: 'PAID' } : o
                )
              );
              setViewingPixOrderId(null);
            }
          }
        }, 5000);
      } else {
        throw new Error('Os dados do Pix não foram retornados pelo servidor.');
      }
    } catch (error) {
      alert(
        'Erro ao carregar Pix: ' +
          (error.message || 'Não foi possível carregar os dados do Pix.')
      );
      setViewingPixOrderId(null);
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (pixData?.qrcode_data) {
      await Clipboard.setStringAsync(pixData.qrcode_data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const downloadItem = async (
    item,
    order,
    index = 0,
    showConfirmation = true
  ) => {
    const url = resolveUrl(item.photo?.delivery_path);
    if (!url) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const link = document.createElement('a');
      const extension =
        url.split('.').pop()?.split('?')[0] ||
        (item.photo.is_video ? 'mp4' : 'jpg');
      link.href = url;
      link.download = `rafael-publicado-pedido-${
        order.order_number || order.id
      }-${item.photo.is_video ? 'video' : 'foto'}-${index + 1}.${extension}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
    try {
      const urlExtension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
      const extension =
        urlExtension && urlExtension.length <= 5
          ? urlExtension
          : item.photo.is_video
          ? 'mp4'
          : 'jpg';
      const filename = `pedido-${order.order_number || order.id}-${
        item.photo.is_video ? 'video' : 'foto'
      }-${index + 1}.${extension}`;
      const result = await savePurchasedMedia({ url, filename });
      if (!result.ok) {
        if (result.reason === 'permission')
          alert('Autorize o aplicativo a salvar fotos e vídeos na galeria.');
        return false;
      }
      if (showConfirmation)
        alert('O arquivo comprado foi salvo na galeria do aparelho.');
      return true;
    } catch {
      alert(
        'Não foi possível salvar o arquivo. Verifique sua conexão e tente novamente.'
      );
      return false;
    }
  };

  const handleDownloadOrder = async (order) => {
    const downloadableItems = (order.items || []).filter(
      (item) => item.photo?.delivery_path
    );
    if (downloadableItems.length === 0) {
      alert(
        'Os arquivos originais ainda estão sendo preparados. Tente novamente em instantes.'
      );
      return;
    }
    for (let index = 0; index < downloadableItems.length; index += 1) {
      const item = downloadableItems[index];
      const saved = await downloadItem(item, order, index, false);
      if (!saved) return;
      if (downloadableItems.length > 1)
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (Platform.OS !== 'web') {
      alert(
        downloadableItems.length > 1
          ? 'As fotos e os vídeos comprados foram salvos na galeria do aparelho.'
          : 'O arquivo comprado foi salvo na galeria do aparelho.'
      );
    }
  };

  const getOrderMediaLabel = (items = []) => {
    const photosCount = items.filter((item) => !item.photo?.is_video).length;
    const videosCount = items.filter((item) => item.photo?.is_video).length;
    const labels = [];
    if (photosCount)
      labels.push(`${photosCount} ${photosCount === 1 ? 'foto' : 'fotos'}`);
    if (videosCount)
      labels.push(`${videosCount} ${videosCount === 1 ? 'vídeo' : 'vídeos'}`);
    return labels.join(' • ') || 'Nenhum arquivo';
  };

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const pendingOrders = orders.filter((o) => o.status !== 'PAID');
  const displayOrders = activeTab === 'paid' ? paidOrders : pendingOrders;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrder = (order) => {
    const isPending = order.status !== 'PAID';
    const isViewingPix = viewingPixOrderId === order.id;
    return (
      <View key={order.id} style={[styles.orderCard, isMobile && styles.orderCardMobile]}>
        <View style={[styles.orderHeader, isMobile && styles.orderHeaderMobile]}>
          <View>
            <Text style={styles.orderNumber}>
              Pedido #{order.order_number || order.id?.slice(0, 8)}
            </Text>
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isPending ? styles.statusPending : styles.statusPaid,
            ]}
          >
            {isPending ? (
              <Clock3 size={13} color="#D97706" />
            ) : (
              <Check size={13} color="#059669" />
            )}
            <Text
              style={[
                styles.statusText,
                isPending ? styles.statusTextPending : styles.statusTextPaid,
              ]}
            >
              {isPending ? 'Aguardando Pix' : 'Aprovado / Pago'}
            </Text>
          </View>
        </View>

        {/* Photos preview scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosRow}
        >
          {(order.items || []).slice(0, 8).map((item, itemIndex) => {
            const canOpen = !isPending && Boolean(item.photo?.delivery_path);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.orderPhotoButton}
                onPress={() =>
                  canOpen &&
                  setViewer({ items: order.items, index: itemIndex, order })
                }
                disabled={!canOpen}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri: resolveUrl(
                      (canOpen && item.photo?.delivery_path) ||
                        item.photo?.watermark_path ||
                        item.photo?.path
                    ),
                  }}
                  style={styles.orderPhoto}
                />
                {canOpen && item.photo?.is_video && (
                  <View style={styles.videoIndicator} pointerEvents="none">
                    <Play size={18} color="#fff" fill="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.orderFooter, isMobile && styles.orderFooterMobile]}>
          <View style={styles.orderValueBox}>
            <Text style={styles.orderValue}>
              R${' '}
              {parseFloat(order.total_value || 0)
                .toFixed(2)
                .replace('.', ',')}
            </Text>
            <Text style={styles.orderItems}>
              {getOrderMediaLabel(order.items)}
            </Text>
          </View>

          {!isPending && (
            <TouchableOpacity
              style={[styles.downloadButton, isMobile && styles.downloadButtonMobile]}
              onPress={() => handleDownloadOrder(order)}
              activeOpacity={0.88}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>
                {(order.items || []).length > 1
                  ? 'Baixar todas as fotos'
                  : 'Baixar foto em alta'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pix payment for pending orders */}
        {isPending && (
          <>
            <TouchableOpacity
              style={styles.btnPix}
              onPress={() =>
                isViewingPix
                  ? setViewingPixOrderId(null)
                  : handleViewPix(order.id)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.btnPixText}>
                {isViewingPix ? 'Ocultar QR Code Pix' : 'Pagar Agora via Pix'}
              </Text>
            </TouchableOpacity>
            {isViewingPix && (
              <View style={styles.pixPanel}>
                {pixLoading ? (
                  <ActivityIndicator color="var(--primary-color)" />
                ) : pixData ? (
                  <>
                    <PixQrCode pixData={pixData} compact />
                    <View style={styles.pixCodeBox}>
                      <Text
                        style={styles.pixCode}
                        numberOfLines={4}
                        selectable
                      >
                        {pixData.qrcode_data}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.btnPrimaryCopy,
                        copied && styles.btnSuccess,
                      ]}
                      onPress={handleCopyPix}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.btnText}>
                        {copied ? 'Código Pix Copiado!' : 'Copiar Código Pix'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.pixAwaitingRow}>
                      <ActivityIndicator size="small" color="var(--primary-color)" />
                      <Text style={styles.pixAwaitingText}>
                        Aguardando confirmação bancária...
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: '#EF4444', textAlign: 'center' }}>
                    Erro ao carregar Pix.
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.pageContent,
        isMobile && styles.pageContentMobile,
      ]}
    >
      <View style={[styles.pageLayout, isMobile && styles.pageLayoutMobile]}>
        {/* Left: CPF Form */}
        <View style={[styles.leftColumn, isMobile && styles.leftColumnMobile]}>
          <View style={[styles.cpfCard, isMobile && styles.cpfCardMobile]}>
            <View style={styles.cpfCardIconRow}>
              <ShoppingBag size={22} color="var(--primary-color)" />
              <Text style={styles.sectionTitle}>Minhas Compras</Text>
            </View>
            <Text style={styles.subtitle}>
              Consulte seus pedidos anteriores e baixe seus arquivos originais a
              qualquer momento.
            </Text>
            <View style={[styles.cpfRow, isMobile && styles.cpfRowMobile]}>
              <TextInput
                style={[styles.input, isMobile && styles.inputMobile]}
                placeholder="000.000.000-00"
                placeholderTextColor="#94A3B8"
                value={cpf}
                onChangeText={(v) => {
                  setCpf(maskCpf(v));
                  setError(null);
                }}
                keyboardType="numeric"
                maxLength={14}
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                style={[
                  styles.btnBuscar,
                  isMobile && styles.btnBuscarMobile,
                  (cpf.replace(/\D/g, '').length < 11 || loading) &&
                    styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={cpf.replace(/\D/g, '').length < 11 || loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>Buscar Pedidos</Text>
                )}
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </View>

        {/* Right: Orders */}
        <View style={[styles.ordersColumn, isMobile && styles.ordersColumnMobile]}>
          {searched && orders.length > 0 && (
            <>
              {/* Tabs */}
              <View style={styles.tabs}>
                {[
                  { key: 'paid', label: `Pagas e Liberadas (${paidOrders.length})` },
                  { key: 'pending', label: `Pendentes (${pendingOrders.length})` },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      activeTab === tab.key && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab.key && styles.tabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {displayOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    {activeTab === 'paid'
                      ? 'Nenhuma compra com pagamento aprovado.'
                      : 'Nenhum pedido pendente de pagamento.'}
                  </Text>
                </View>
              ) : (
                displayOrders.map((order) => renderOrder(order))
              )}
            </>
          )}

          {searched && orders.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                Nenhum pedido encontrado
              </Text>
              <Text style={styles.emptyText}>
                Não encontramos compras associadas a este CPF. Verifique se digitou
                corretamente.
              </Text>
            </View>
          )}

          {!searched && !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <ShoppingBag size={36} color="var(--primary-color)" />
              </View>
              <Text style={styles.emptyStateTitle}>
                Acesse suas fotos compradas
              </Text>
              <Text style={styles.emptyText}>
                Informe seu CPF no campo para consultar o histórico dos seus
                pedidos e baixar os arquivos originais em alta definição.
              </Text>
            </View>
          )}
        </View>
      </View>

      {viewer && (
        <PurchasedMediaViewer
          items={viewer.items}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDownload={(item) => downloadItem(item, viewer.order, viewer.index)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  pageContent: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Layout.desktopPadding,
    paddingTop: 48,
    paddingBottom: 80,
  },
  pageContentMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 60,
  },
  pageLayout: {
    flexDirection: 'row',
    gap: 32,
    alignItems: 'flex-start',
  },
  pageLayoutMobile: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'stretch',
  },
  leftColumn: {
    width: 360,
    flexShrink: 0,
  },
  leftColumnMobile: {
    width: '100%',
  },
  ordersColumn: {
    flex: 1,
    minWidth: 0,
  },
  ordersColumnMobile: {
    width: '100%',
  },

  // CPF card
  cpfCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.six,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  cpfCardMobile: {
    padding: 16,
    borderRadius: 14,
  },
  cpfCardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: FontWeights.extrabold,
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: Spacing.five,
    lineHeight: 22,
  },
  cpfRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  cpfRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 15,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  inputMobile: {
    width: '100%',
    paddingVertical: 12,
  },
  btnBuscar: {
    backgroundColor: 'var(--primary-color)',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    boxShadow: '0 4px 14px rgba(0, 107, 214, 0.3)',
  },
  btnBuscarMobile: {
    width: '100%',
  },
  btnSuccess: {
    backgroundColor: '#10B981',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 14,
  },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: Spacing.two },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    marginBottom: Spacing.five,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  tabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
  },
  tabTextActive: { color: 'var(--primary-color)', fontWeight: FontWeights.bold },

  // Order cards
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.four,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  orderCardMobile: {
    padding: 16,
    borderRadius: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.four,
  },
  orderHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextPending: { color: '#D97706' },
  statusTextPaid: { color: '#059669' },

  photosRow: { marginBottom: Spacing.four },
  orderPhotoButton: {
    width: 84,
    height: 84,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginRight: Spacing.two,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderPhoto: { width: '100%', height: '100%' },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: Spacing.three,
  },
  orderFooterMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  orderValueBox: {
    gap: 2,
  },
  orderValue: {
    fontSize: 18,
    fontWeight: FontWeights.extrabold,
    color: 'var(--primary-color)',
  },
  orderItems: {
    fontSize: 12,
    color: '#64748B',
  },
  downloadButton: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 107, 214, 0.25)',
  },
  downloadButtonMobile: {
    width: '100%',
    paddingVertical: 12,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 13,
  },

  // Pix Panel
  btnPix: {
    backgroundColor: 'var(--primary-color)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  btnPixText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 14,
  },
  pixPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pixCodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginVertical: Spacing.three,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pixCode: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  btnPrimaryCopy: {
    backgroundColor: 'var(--primary-color)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    width: '100%',
  },
  pixAwaitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.three,
  },
  pixAwaitingText: {
    fontSize: 12,
    color: '#64748B',
  },

  // Empty state
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },
});
