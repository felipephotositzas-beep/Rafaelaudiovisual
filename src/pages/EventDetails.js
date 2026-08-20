import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  CalendarDays,
  CircleAlert,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Images,
  MapPin,
  MessageCircle,
  Play,
  ScanFace,
  Share2,
  ShoppingCart,
  ShieldCheck,
  UserRound,
  X,
  Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import MediaViewer from '../components/MediaViewer';
import CartFloatingBar from '../components/CartFloatingBar';
import CameraCapture from '../components/CameraCapture';
import { useCart } from '../context/CartContext';
import { fetchEvents, fetchPhotos, searchByFace } from '../utils/api';
import { getProgressiveDiscountTiers } from '../utils/progressiveDiscountUtils';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Layout,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.dark;
const MAX_FACE_IMAGE_DIMENSION = 1500;
const MAX_FACE_IMAGE_BYTES = 1_100_000;

const estimateDataUrlBytes = (dataUrl) => {
  const base64 = dataUrl?.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
};

const prepareFaceImage = async (source) => {
  const sourceUri =
    typeof source === 'string' ? source : source?.uri || source?.dataUrl;
  if (!sourceUri) throw new Error('IMAGE_READ_FAILED');
  const context = ImageManipulator.manipulate(sourceUri);
  const width = Number(source?.width) || 0;
  const height = Number(source?.height) || 0;
  const largestSide = Math.max(width, height);
  if (largestSide > MAX_FACE_IMAGE_DIMENSION) {
    const scale = MAX_FACE_IMAGE_DIMENSION / largestSide;
    context.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    });
  }
  const renderedImage = await context.renderAsync();
  for (const compress of [0.82, 0.7, 0.58]) {
    const result = await renderedImage.saveAsync({
      base64: true,
      compress,
      format: SaveFormat.JPEG,
    });
    if (!result.base64) continue;
    const dataUrl = `data:image/jpeg;base64,${result.base64}`;
    if (
      estimateDataUrlBytes(dataUrl) <= MAX_FACE_IMAGE_BYTES ||
      compress === 0.58
    )
      return dataUrl;
  }
  throw new Error('IMAGE_READ_FAILED');
};

const readApiError = async (response) => {
  const rawBody = await response.text().catch(() => '');
  try {
    return { rawBody, data: rawBody ? JSON.parse(rawBody) : {} };
  } catch {
    return { rawBody, data: {} };
  }
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return phone;
};

const PHOTO_GAP = 8;

export default function EventDetails() {
  const route = useRoute();
  const eventParam = route.params?.event;
  const id = eventParam?.id || route.params?.id;

  const [eventData, setEventData] = useState(eventParam || null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mediaCounts, setMediaCounts] = useState({ photo: 0, video: 0 });
  const [numPages, setNumPages] = useState(1);
  const [mediaFilter, setMediaFilter] = useState('photo');
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isSearchingFace, setIsSearchingFace] = useState(false);
  const [isFaceSearchActive, setIsFaceSearchActive] = useState(false);
  const [showFaceMenu, setShowFaceMenu] = useState(false);
  const [faceSearchError, setFaceSearchError] = useState('');

  const { addToCart, removeFromCart, isInCart, initializeCartForEvent } =
    useCart();
  const discountTiers = getProgressiveDiscountTiers(eventData);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (id) {
      initializeCartForEvent(id);
      loadPhotosData(1, 'photo');
      loadMediaCount('video');
    }
  }, [id]);

  useEffect(() => {
    if (eventParam || !id) return;
    let active = true;
    const loadEvent = async () => {
      try {
        const response = await fetchEvents();
        if (!response.ok) return;
        const data = await response.json();
        const found = data.results?.find((event) => event.id === id);
        if (active && found) setEventData(found);
      } catch (error) {
        console.warn('loadEvent error:', error);
      }
    };
    loadEvent();
    return () => {
      active = false;
    };
  }, [eventParam, id]);

  const loadMediaCount = async (mediaType) => {
    try {
      const res = await fetchPhotos(id, 1, mediaType);
      if (!res.ok) return;
      const data = await res.json();
      setMediaCounts((current) => ({
        ...current,
        [mediaType]: data.count || 0,
      }));
    } catch (error) {
      console.warn('loadMediaCount error:', error);
    }
  };

  const loadPhotosData = async (pageNumber, mediaType = mediaFilter) => {
    if (pageNumber === 1) {
      setLoading(true);
      setIsFaceSearchActive(false);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await fetchPhotos(id, pageNumber, mediaType);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.results || []);
        setMediaCounts((current) => ({
          ...current,
          [mediaType]: data.count || 0,
        }));
        setNumPages(data.num_pages || 1);
        setHasMore(pageNumber < (data.num_pages || 1));
        setPage(pageNumber);
      }
    } catch (err) {
      console.warn('loadPhotos error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFaceSearch = async (imageSource) => {
    setIsCameraVisible(false);
    setShowFaceMenu(false);
    setIsSearchingFace(true);
    setFaceSearchError('');
    try {
      const imageDataUrl = await prepareFaceImage(imageSource);
      const photographerId =
        eventData?.owner?.id ||
        eventData?.photographer?.id ||
        eventData?.photographer;
      const res = await searchByFace(id, imageDataUrl, photographerId);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : data.results || [];
        setPhotos(results);
        setIsFaceSearchActive(true);
        setHasMore(false);
        if (results.length === 0)
          Alert.alert(
            'Busca Facial',
            'Nenhuma foto encontrada para este rosto no evento.'
          );
      } else {
        const { data: errorData, rawBody } = await readApiError(res);
        const serverMessage =
          errorData.error || errorData.detail || errorData.message || rawBody;
        if (String(serverMessage).includes('There are no faces in the image')) {
          setFaceSearchError(
            'Nenhum rosto foi identificado. Use uma selfie bem iluminada e de frente.'
          );
        } else {
          setFaceSearchError(
            'Não foi possível analisar esta imagem. Tente outra foto.'
          );
        }
      }
    } catch (error) {
      setFaceSearchError('Falha ao conectar com o serviço de reconhecimento facial.');
    } finally {
      setIsSearchingFace(false);
    }
  };

  const handleFaceSearchFromGallery = async () => {
    setShowFaceMenu(false);
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permissão', 'Acesso à galeria necessário para buscar foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await handleFaceSearch(result.assets[0]);
    }
  };

  const clearFaceSearch = () => {
    setFaceSearchError('');
    setMediaFilter('photo');
    loadPhotosData(1, 'photo');
  };

  const dateObj = eventData?.event_date
    ? new Date(eventData.event_date)
    : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const filteredPhotos = photos.filter((p) => {
    if (isFaceSearchActive) return true;
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'photo') return !p.is_video;
    return p.is_video;
  });

  const photoCount = mediaCounts.photo;
  const videoCount = mediaCounts.video;
  const totalMediaCount = photoCount + videoCount;

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* Event Top Card */}
      <View style={styles.eventCard}>
        <Text style={styles.eventTitle}>{eventData?.name || 'Evento'}</Text>
        <View style={styles.metaRow}>
          {totalMediaCount > 0 && (
            <View style={styles.metaBadge}>
              <Images size={11} color={DarkPalette.textSecondary} />
              <Text style={styles.metaBadgeText}>{totalMediaCount} fotos</Text>
            </View>
          )}
          {formattedDate !== '' && (
            <View style={styles.metaBadge}>
              <CalendarDays size={11} color={DarkPalette.textSecondary} />
              <Text style={styles.metaBadgeText}>{formattedDate}</Text>
            </View>
          )}
          {eventData?.city && (
            <View style={styles.metaBadge}>
              <MapPin size={11} color={DarkPalette.textSecondary} />
              <Text style={styles.metaBadgeText}>{eventData.city}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Face Search Section */}
      <View style={styles.faceSearchCard}>
        <View style={styles.faceSearchRow}>
          <View style={styles.faceSearchIcon}>
            <ScanFace size={22} color="#009DFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.faceSearchTitle}>Reconhecimento Facial</Text>
            <Text style={styles.faceSearchSub}>
              Envie uma selfie para localizar suas fotos no evento.
            </Text>
          </View>
        </View>

        {isFaceSearchActive ? (
          <TouchableOpacity
            style={styles.btnClearSearch}
            onPress={clearFaceSearch}
          >
            <X size={14} color="#F7F9FC" />
            <Text style={styles.btnClearSearchText}>Limpar busca facial</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.btnFaceSearch}
            onPress={() => setShowFaceMenu((v) => !v)}
            disabled={isSearchingFace}
          >
            {isSearchingFace ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Sparkles size={15} color="#F7F9FC" />
                <Text style={styles.btnFaceSearchText}>
                  Localizar minhas fotos
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {showFaceMenu && (
          <View style={styles.faceMenu}>
            <TouchableOpacity
              style={styles.faceMenuOption}
              onPress={() => {
                setShowFaceMenu(false);
                setIsCameraVisible(true);
              }}
            >
              <Camera size={16} color="#009DFF" />
              <Text style={styles.faceMenuOptionText}>Tirar selfie agora</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.faceMenuOption}
              onPress={handleFaceSearchFromGallery}
            >
              <ImageIcon size={16} color={DarkPalette.textSecondary} />
              <Text style={styles.faceMenuOptionText}>Escolher da galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!faceSearchError && (
          <Text style={styles.faceSearchError}>{faceSearchError}</Text>
        )}
      </View>

      {/* Progressive discount banner */}
      {discountTiers.length > 0 && (
        <View style={styles.discountCard}>
          <Text style={styles.discountTitle}>DESCONTO PROGRESSIVO</Text>
          <View style={styles.discountTiersRow}>
            {discountTiers.map(({ quantity, percentage }) => (
              <View key={`${quantity}-${percentage}`} style={styles.tierPill}>
                <Text style={styles.tierPct}>{percentage}% OFF</Text>
                <Text style={styles.tierQty}>{quantity}+ fotos</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {loading && (
        <ActivityIndicator
          size="large"
          color="#006BD6"
          style={{ marginVertical: 30 }}
        />
      )}
    </View>
  );

  const renderPhoto = ({ item: photo, index }) => {
    const inCart = isInCart(photo.id);
    return (
      <View style={styles.photoItem}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setSelectedMediaIndex(index)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: photo.watermark_path }}
            style={styles.photoImg}
            resizeMode="cover"
          />
          {photo.is_video && (
            <View style={styles.videoBadge}>
              <Play size={12} color="#fff" fill="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cartBtn, inCart && styles.cartBtnActive]}
          onPress={() =>
            inCart ? removeFromCart(photo.id) : addToCart(photo)
          }
        >
          {inCart ? (
            <Check color="#FFFFFF" size={14} strokeWidth={3} />
          ) : (
            <ShoppingCart color="#FFFFFF" size={13} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={filteredPhotos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={2}
        columnWrapperStyle={{ gap: PHOTO_GAP, paddingHorizontal: Spacing.three }}
        contentContainerStyle={{ gap: PHOTO_GAP, paddingBottom: 90 }}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        onEndReached={() =>
          hasMore && !loadingMore && loadPhotosData(page + 1)
        }
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color="#006BD6"
              style={{ marginVertical: 20 }}
            />
          ) : null
        }
      />

      {selectedMediaIndex !== null && (
        <MediaViewer
          photos={filteredPhotos}
          currentIndex={selectedMediaIndex}
          onNavigate={setSelectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
        />
      )}

      <CameraCapture
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={handleFaceSearch}
      />

      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020406' },
  headerBlock: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  eventCard: {
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaBadgeText: {
    fontSize: 11,
    color: DarkPalette.textSecondary,
  },

  // Face Search
  faceSearchCard: {
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.35)',
  },
  faceSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.three,
  },
  faceSearchIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceSearchTitle: {
    fontSize: 14,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
  },
  faceSearchSub: {
    fontSize: 11,
    color: DarkPalette.textSecondary,
    marginTop: 2,
  },
  btnFaceSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#006BD6',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  btnFaceSearchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },
  btnClearSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  btnClearSearchText: {
    color: '#F7F9FC',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
  faceMenu: {
    marginTop: Spacing.two,
    backgroundColor: '#050B12',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
    overflow: 'hidden',
  },
  faceMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  faceMenuOptionText: {
    fontSize: 13,
    fontWeight: FontWeights.semibold,
    color: '#F7F9FC',
  },
  faceSearchError: {
    color: '#FF4D5E',
    fontSize: 11,
    marginTop: 6,
  },

  // Discount
  discountCard: {
    backgroundColor: 'rgba(0, 107, 214, 0.12)',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
  },
  discountTitle: {
    fontSize: 10,
    fontWeight: FontWeights.extrabold,
    color: '#009DFF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  discountTiersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierPill: {
    backgroundColor: '#08111C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.2)',
    alignItems: 'center',
  },
  tierPct: {
    fontSize: 12,
    fontWeight: FontWeights.bold,
    color: '#009DFF',
  },
  tierQty: {
    fontSize: 9,
    color: DarkPalette.textMuted,
  },

  // Photos
  photoItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#08111C',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  photoImg: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: Radius.full,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(2, 4, 6, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cartBtnActive: {
    backgroundColor: '#006BD6',
    borderColor: '#009DFF',
  },
});
