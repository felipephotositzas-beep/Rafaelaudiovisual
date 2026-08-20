import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronLeft, ChevronRight, CircleAlert, Download, RotateCcw, X, ShieldCheck } from 'lucide-react-native';
import { Colors, DarkPalette, BrandColors, FontWeights, Radius, Spacing } from '../constants/theme';

const theme = Colors.dark;

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return `https://painel.topfotos.com.br${url}`;
  return url;
};

function PurchasedVideo({ media, width, height }) {
  const mediaUrl = resolveUrl(media.delivery_path);
  const player = useVideoPlayer(mediaUrl || null, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.play();
  });
  const { status, error } = useEvent(player, 'statusChange', {
    status: player.status,
    error: undefined,
  });

  const retry = async () => {
    if (!mediaUrl) return;
    await player.replaceAsync(mediaUrl);
    player.play();
  };

  return (
    <View style={[styles.mediaFrame, { width, height }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        playsInline
        fullscreenOptions={{ enable: true }}
      />
      {(status === 'idle' || status === 'loading') && (
        <View style={styles.loadingState} pointerEvents="none">
          <ActivityIndicator color="#009DFF" size="large" />
          <Text style={styles.stateText}>Carregando vídeo...</Text>
        </View>
      )}
      {status === 'error' && (
        <View style={styles.errorState}>
          <CircleAlert color="#FF4D5E" size={32} />
          <Text style={styles.stateTitle}>Não foi possível reproduzir</Text>
          <Text style={styles.stateText}>{error?.message || 'Verifique sua conexão e tente novamente.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <RotateCcw color="#fff" size={18} />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function PurchasedMediaViewer({ items, initialIndex = 0, onClose, onDownload }) {
  const insets = useSafeAreaInsets();
  const availableItems = useMemo(() => (items || []).filter(item => Boolean(item.photo)), [items]);
  const selectedId = items?.[initialIndex]?.id;
  const initialAvailableIndex = Math.max(0, availableItems.findIndex(item => item.id === selectedId));
  const [currentIndex, setCurrentIndex] = useState(initialAvailableIndex);
  const { width, height } = useWindowDimensions();
  const stageHeight = Math.max(260, height - 154 - insets.top);

  useEffect(() => {
    setCurrentIndex(initialAvailableIndex);
  }, [initialAvailableIndex]);

  const item = availableItems[currentIndex];
  if (!item) return null;

  const media = item.photo;
  const isVideo = Boolean(media.is_video);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar backgroundColor="transparent" barStyle="light-content" translucent />
      <View style={styles.overlay}>
        <View style={[styles.toolbar, { paddingTop: insets.top + Spacing.two, minHeight: 72 + insets.top }]}>
          <View style={styles.toolbarCopy}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="#20C997" />
              <Text style={styles.unlockedLabel}>Arquivo Original Liberado</Text>
            </View>
            <Text style={styles.mediaTitle} numberOfLines={1}>
              {item.description || (isVideo ? 'Vídeo comprado em alta resolução' : 'Foto comprada em alta resolução')}
            </Text>
          </View>
          <Text style={styles.counter}>{currentIndex + 1} de {availableItems.length}</Text>
          <TouchableOpacity style={styles.iconButton} onPress={onClose} accessibilityLabel="Fechar visualizador">
            <X color="#F7F9FC" size={22} />
          </TouchableOpacity>
        </View>

        <View style={[styles.stage, { height: stageHeight }]}>
          {isVideo ? (
            <PurchasedVideo key={media.delivery_path} media={media} width={width} height={stageHeight} />
          ) : (
            <Image
              source={{ uri: resolveUrl(media.delivery_path) }}
              style={{ width, height: stageHeight }}
              resizeMode="contain"
              accessibilityLabel={item.description || 'Foto comprada'}
            />
          )}

          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navLeft]}
              onPress={() => setCurrentIndex(index => index - 1)}
              accessibilityLabel="Arquivo anterior"
            >
              <ChevronLeft color="#fff" size={28} />
            </TouchableOpacity>
          )}
          {currentIndex < availableItems.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navRight]}
              onPress={() => setCurrentIndex(index => index + 1)}
              accessibilityLabel="Próximo arquivo"
            >
              <ChevronRight color="#fff" size={28} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.downloadButton} onPress={() => onDownload(item)} activeOpacity={0.88}>
            <Download color="#FFFFFF" size={18} />
            <Text style={styles.downloadText}>Baixar arquivo original em alta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#020406' },
  toolbar: {
    minHeight: 72,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#08111C',
  },
  toolbarCopy: { flex: 1, minWidth: 0 },
  unlockedLabel: { color: '#20C997', fontSize: 11, fontWeight: FontWeights.bold },
  mediaTitle: { color: '#F7F9FC', fontSize: 14, fontWeight: FontWeights.semibold, marginTop: 2 },
  counter: { color: DarkPalette.textSecondary, fontSize: 12, fontWeight: FontWeights.semibold },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stage: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mediaFrame: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  loadingState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: '#000',
  },
  errorState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
    backgroundColor: '#08111C',
  },
  stateTitle: { color: '#F7F9FC', fontSize: 16, fontWeight: FontWeights.bold },
  stateText: { color: DarkPalette.textSecondary, fontSize: 13, textAlign: 'center' },
  retryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    backgroundColor: '#006BD6',
  },
  retryText: { color: '#fff', fontWeight: FontWeights.bold },
  navButton: {
    position: 'absolute',
    top: '46%',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 17, 28, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navLeft: { left: Spacing.three },
  navRight: { right: Spacing.three },
  footer: {
    minHeight: 82,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#08111C',
  },
  downloadButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: '#006BD6',
    boxShadow: '0 4px 16px rgba(0, 107, 214, 0.4)',
  },
  downloadText: { color: '#FFFFFF', fontSize: 14, fontWeight: FontWeights.bold },
});
