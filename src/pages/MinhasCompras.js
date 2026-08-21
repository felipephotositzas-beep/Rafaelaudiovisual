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
  Alert,
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
} from 'lucide-react-native';
import { fetchCustomerOrders, fetchOrder, fetchOrderPix } from '../utils/api';
import { isValidCpf, maskCpf } from '../utils/cpfUtils';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
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
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do Pix.');
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

  const downloadItem = async (item, order, index = 0) => {
    const url = resolveUrl(item.photo?.delivery_path);
    if (!url) return;
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
        Alert.alert(
          'Permissão',
          'Autorize o aplicativo a salvar fotos na galeria.'
        );
        return false;
      }
      Alert.alert('Sucesso', 'O arquivo comprado foi salvo na galeria.');
      return true;
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o arquivo.');
      return false;
    }
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
    });
  };

  const renderOrder = (order) => {
    const isPending = order.status !== 'PAID';
    const isViewingPix = viewingPixOrderId === order.id;
    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
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
              <Clock3 size={12} color="#FFB020" />
            ) : (
              <Check size={12} color="#20C997" />
            )}
            <Text
              style={[
                styles.statusText,
                isPending ? styles.statusTextPending : styles.statusTextPaid,
              ]}
            >
              {isPending ? 'Pendente' : 'Pago'}
            </Text>
          </View>
        </View>

        {/* Photos grid */}
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
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.orderFooter}>
          <Text style={styles.orderValue}>
            R${' '}
            {parseFloat(order.total_value || 0)
              .toFixed(2)
              .replace('.', ',')}
          </Text>
          {!isPending && (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() =>
                order.items?.[0] && downloadItem(order.items[0], order, 0)
              }
            >
              <Download size={14} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Baixar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isPending && (
          <TouchableOpacity
            style={styles.btnPix}
            onPress={() =>
              isViewingPix
                ? setViewingPixOrderId(null)
                : handleViewPix(order.id)
            }
          >
            <Text style={styles.btnPixText}>
              {isViewingPix ? 'Fechar Pix' : 'Ver QR Code Pix'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={styles.cpfCard}>
        <Text style={styles.sectionTitle}>Consultar Pedidos</Text>
        <View style={styles.cpfRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="000.000.000-00"
            placeholderTextColor={DarkPalette.textMuted}
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
              styles.btnPrimary,
              (cpf.replace(/\D/g, '').length < 11 || loading) &&
                styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={cpf.replace(/\D/g, '').length < 11 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.btnText}>Buscar</Text>
            )}
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {searched && orders.length > 0 && (
        <View style={{ marginTop: Spacing.four }}>
          <View style={styles.tabs}>
            {[
              { key: 'paid', label: `Pagas (${paidOrders.length})` },
              { key: 'pending', label: `Pendentes (${pendingOrders.length})` },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
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
          {displayOrders.map((order) => renderOrder(order))}
        </View>
      )}

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
  page: { flex: 1, backgroundColor: '#020406' },
  pageContent: { padding: Spacing.four, paddingBottom: 80 },
  cpfCard: {
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
    marginBottom: Spacing.three,
  },
  cpfRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    backgroundColor: '#050B12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    fontSize: 14,
    color: '#F7F9FC',
  },
  btnPrimary: {
    backgroundColor: 'var(--primary-color)',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontWeight: FontWeights.bold, fontSize: 13 },
  errorText: { color: '#FF4D5E', fontSize: 12, marginTop: 4 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#050B12',
    borderRadius: Radius.md,
    marginBottom: Spacing.three,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: { backgroundColor: '#08111C' },
  tabText: { fontSize: 12, color: DarkPalette.textMuted, fontWeight: FontWeights.semibold },
  tabTextActive: { color: '#F7F9FC' },

  orderCard: {
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: Spacing.three,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  orderNumber: { fontSize: 14, fontWeight: FontWeights.bold, color: '#F7F9FC' },
  orderDate: { fontSize: 11, color: DarkPalette.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusPending: { backgroundColor: 'rgba(255, 176, 32, 0.15)' },
  statusPaid: { backgroundColor: 'rgba(32, 201, 151, 0.15)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextPending: { color: '#FFB020' },
  statusTextPaid: { color: '#20C997' },

  photosRow: { marginBottom: Spacing.three },
  orderPhotoButton: {
    width: 64,
    height: 64,
    marginRight: 6,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: '#050B12',
  },
  orderPhoto: { width: '100%', height: '100%' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderValue: { fontSize: 16, fontWeight: FontWeights.extrabold, color: "var(--primary-color)" },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: 'var(--primary-color)',
  },
  downloadButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: FontWeights.bold },
  btnPix: {
    marginTop: Spacing.two,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    padding: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  btnPixText: { color: "var(--primary-color)", fontWeight: FontWeights.bold, fontSize: 12 },
});
