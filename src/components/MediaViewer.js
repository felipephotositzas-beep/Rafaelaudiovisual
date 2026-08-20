import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  Modal,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  allowScreenCaptureAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Check,
  CircleAlert,
  RotateCcw,
  Sparkles,
  Video as VideoIcon,
  Camera,
  Play,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Shadows,
  Spacing,
} from '../constants/theme';

const SWIPE_THRESHOLD = 60;
const CAPTURE_KEY = 'media-viewer';

function VideoMedia({ media, containerWidth, containerHeight }) {
  const videoUrl = media.preview_video_path || media.delivery_path;
  const isHorizontal = !!media.horizontal;

  // Calculate ideal video dimensions to avoid stretching controls across entire screen
  const maxH = Math.min(containerHeight, 720);
  let videoWidth = isHorizontal
    ? Math.min(containerWidth - 32, maxH * (16 / 9), 880)
    : Math.min(containerWidth - 32, maxH * (9 / 16), 460);
  let videoHeight = isHorizontal
    ? videoWidth * (9 / 16)
    : Math.min(maxH, videoWidth * (16 / 9));

  if (videoHeight > maxH) {
    videoHeight = maxH;
    videoWidth = isHorizontal ? maxH * (16 / 9) : maxH * (9 / 16);
  }

  const player = useVideoPlayer(videoUrl || null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.play();
  });
  const { status, error } = useEvent(player, 'statusChange', {
    status: player.status,
    error: undefined,
  });

  const retry = async () => {
    if (!videoUrl) return;
    await player.replaceAsync(videoUrl);
    player.play();
  };

  if (!videoUrl) {
    return (
      <View
        style={[
          styles.videoState,
          { width: videoWidth, height: videoHeight },
        ]}
      >
        <CircleAlert color="#EF4444" size={36} />
        <Text style={styles.videoStateTitle}>Prévia do vídeo indisponível</Text>
        <Text style={styles.videoStateText}>
          Este vídeo não possui um arquivo de reprodução configurado.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.videoCard,
        {
          width: videoWidth,
          height: videoHeight,
        },
      ]}
    >
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="contain"
        nativeControls
        playsInline
        fullscreenOptions={{ enable: true }}
      />

      {(status === 'idle' || status === 'loading') && (
        <View style={[styles.videoLoading, styles.noPointerEvents]}>
          {media.watermark_path && (
            <Image
              source={{ uri: media.watermark_path }}
              style={styles.videoPoster}
              resizeMode="cover"
            />
          )}
          <View style={styles.videoLoadingScrim} />
          <ActivityIndicator color="#006BD6" size="large" />
          <Text style={styles.videoLoadingText}>Carregando vídeo...</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.videoState}>
          <CircleAlert color="#EF4444" size={36} />
          <Text style={styles.videoStateTitle}>Não foi possível reproduzir</Text>
          <Text style={styles.videoStateText}>
            {error?.message || 'Verifique sua conexão e tente novamente.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retry}
            activeOpacity={0.8}
          >
            <RotateCcw color="#FFFFFF" size={16} />
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MediaViewer({
  photos,
  currentIndex,
  onNavigate,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [localIndex, setLocalIndex] = useState(currentIndex);
  const translateX = useRef(new Animated.Value(0)).current;
  const { addToCart, removeFromCart, isInCart } = useCart();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isDesktop = screenWidth >= 768;
  const mediaHeight = Math.max(260, screenHeight - 160);

  useEffect(() => {
    preventScreenCaptureAsync(CAPTURE_KEY).catch((error) => {
      console.warn('Não foi possível ativar a proteção da mídia.', error);
    });

    return () => {
      allowScreenCaptureAsync(CAPTURE_KEY).catch(() => {});
    };
  }, []);

  useEffect(() => {
    setLocalIndex(currentIndex);
  }, [currentIndex]);

  const currentMedia = photos[localIndex];

  const goTo = (index) => {
    if (index < 0 || index >= photos.length) return;
    const direction = index > localIndex ? -1 : 1;
    Animated.timing(translateX, {
      toValue: direction * screenWidth,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(-direction * screenWidth);
      setLocalIndex(index);
      onNavigate(index);
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 12,
      }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dy) < Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx * 0.4);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }).start();
          goTo(localIndex + 1);
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }).start();
          goTo(localIndex - 1);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!currentMedia) return null;

  const inCart = isInCart(currentMedia.id);
  const price = currentMedia.price
    ? String(parseFloat(currentMedia.price).toFixed(2)).replace('.', ',')
    : '12,90';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle="light-content"
        translucent
      />
      <View style={styles.overlay}>
        {/* ─── TOP TOOLBAR ─────────────────────────────────────────────────── */}
        <View
          style={[
            styles.toolbar,
            { paddingTop: insets.top + 6, height: 60 + insets.top },
          ]}
        >
          {/* Left: Type Badge & Reference */}
          <View style={styles.toolbarLeft}>
            <View
              style={[
                styles.mediaBadge,
                currentMedia.is_video && styles.mediaBadgeVideo,
              ]}
            >
              {currentMedia.is_video ? (
                <VideoIcon size={12} color="#A855F7" />
              ) : (
                <Camera size={12} color="#009DFF" />
              )}
              <Text
                style={[
                  styles.mediaBadgeText,
                  currentMedia.is_video && styles.mediaBadgeTextVideo,
                ]}
              >
                {currentMedia.is_video ? 'Vídeo' : 'Foto'}
              </Text>
            </View>

            {currentMedia.short_reference && (
              <Text style={styles.mediaRef}>
                #{currentMedia.short_reference}
              </Text>
            )}
          </View>

          {/* Center: Counter Indicator */}
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {localIndex + 1} / {photos.length}
            </Text>
          </View>

          {/* Right: Photographer + Close Button */}
          <View style={styles.toolbarRight}>
            {currentMedia.photographer_name && isDesktop && (
              <View style={styles.photographerPill}>
                {currentMedia.photographer_image ? (
                  <Image
                    source={{ uri: currentMedia.photographer_image }}
                    style={styles.photographerAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photographerAvatarFallback}>
                    <Text style={styles.photographerAvatarText}>
                      {currentMedia.photographer_name.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={styles.photographerName} numberOfLines={1}>
                  {currentMedia.photographer_name}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <X color="#F8FAFC" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── MEDIA DISPLAY AREA ───────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.mediaContainer,
            {
              width: screenWidth,
              height: mediaHeight,
              transform: [{ translateX }],
            },
          ]}
          {...(currentMedia.is_video ? {} : panResponder.panHandlers)}
        >
          {currentMedia.is_video ? (
            <VideoMedia
              key={`video-${currentMedia.id}`}
              media={currentMedia}
              containerWidth={screenWidth}
              containerHeight={mediaHeight}
            />
          ) : (
            <Image
              source={{ uri: currentMedia.watermark_path }}
              style={[
                styles.mediaImage,
                { width: screenWidth - 32, height: mediaHeight },
              ]}
              resizeMode="contain"
            />
          )}
        </Animated.View>

        {/* ─── NAVIGATION ARROWS ───────────────────────────────────────────── */}
        {localIndex > 0 && (
          <TouchableOpacity
            style={styles.navLeft}
            onPress={() => goTo(localIndex - 1)}
            activeOpacity={0.85}
          >
            <ChevronLeft size={26} color="#F8FAFC" />
          </TouchableOpacity>
        )}
        {localIndex < photos.length - 1 && (
          <TouchableOpacity
            style={styles.navRight}
            onPress={() => goTo(localIndex + 1)}
            activeOpacity={0.85}
          >
            <ChevronRight size={26} color="#F8FAFC" />
          </TouchableOpacity>
        )}

        {/* ─── BOTTOM FLOATING ACTION BUTTON ──────────────────────────────── */}
        <View
          style={[
            styles.bottomBarContainer,
            { bottom: Math.max(20, insets.bottom + 14) },
          ]}
        >
          <TouchableOpacity
            style={[styles.buyBtn, inCart && styles.buyBtnInCart]}
            onPress={() =>
              inCart
                ? removeFromCart(currentMedia.id)
                : addToCart({
                    ...currentMedia,
                    url: currentMedia.watermark_path,
                  })
            }
            activeOpacity={0.88}
          >
            {inCart ? (
              <>
                <Check color="#FFFFFF" size={18} strokeWidth={3} />
                <Text style={styles.buyBtnText}>Adicionado ao Carrinho ✓</Text>
              </>
            ) : (
              <>
                <ShoppingCart color="#FFFFFF" size={18} />
                <Text style={styles.buyBtnText}>
                  {currentMedia.is_video ? 'Comprar Vídeo' : 'Comprar Foto'}{' '}
                  <Text style={styles.buyBtnPrice}>(R$ {price})</Text>
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#070B14',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── TOP TOOLBAR ─────────────────────────────────────────────────────────
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 20,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
  },
  mediaBadgeVideo: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  mediaBadgeText: {
    color: '#009DFF',
    fontSize: 12,
    fontWeight: FontWeights.bold,
  },
  mediaBadgeTextVideo: {
    color: '#C084FC',
  },
  mediaRef: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: FontWeights.medium,
  },

  // Counter
  counterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: FontWeights.semibold,
  },

  // Right
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  photographerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  photographerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#006BD6',
  },
  photographerAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006BD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photographerAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photographerName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
    maxWidth: 140,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // ─── MEDIA AREA ──────────────────────────────────────────────────────────
  mediaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  mediaImage: {},

  // Video Card
  videoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#000000',
  },
  noPointerEvents: {
    pointerEvents: 'none',
  },
  videoPoster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  videoLoadingScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoLoadingText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: FontWeights.semibold,
  },
  videoState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  videoStateTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
  },
  videoStateText: {
    maxWidth: 320,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: '#006BD6',
    marginTop: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },

  // ─── NAVIGATION ARROWS ───────────────────────────────────────────────────
  navLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: 15,
  },
  navRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: 15,
  },

  // ─── BOTTOM FLOATING ACTION BAR ──────────────────────────────────────────
  bottomBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  buyBtn: {
    backgroundColor: '#006BD6',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    minWidth: 280,
    maxWidth: 420,
    boxShadow: '0 6px 24px rgba(0, 107, 214, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buyBtnInCart: {
    backgroundColor: '#10B981',
    boxShadow: '0 6px 24px rgba(16, 185, 129, 0.5)',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.extrabold,
    fontSize: 15,
  },
  buyBtnPrice: {
    fontWeight: FontWeights.medium,
    fontSize: 14,
    opacity: 0.92,
  },
});
