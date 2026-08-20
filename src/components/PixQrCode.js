import React, { useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  Colors,
  DarkPalette,
  FontWeights,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.dark;

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return `https://painel.topfotos.com.br${url}`;
  return url;
};

export default function PixQrCode({ pixData, compact = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { width } = useWindowDimensions();
  const qrSize = Math.min(
    compact ? 180 : 220,
    Math.max(160, width - (compact ? 112 : 104))
  );
  const payload = pixData?.qrcode_data?.trim();
  const imageUrl = resolveUrl(pixData?.qrcode_url);

  if (!payload && (!imageUrl || imageFailed)) return null;

  return (
    <View style={styles.container}>
      <View
        style={styles.qrFrame}
        accessible
        accessibilityRole="image"
        accessibilityLabel="QR Code para pagamento via Pix"
      >
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: qrSize, height: qrSize }}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <QRCode
            value={payload}
            size={qrSize}
            color="#020406"
            backgroundColor="#FFFFFF"
            ecl="M"
          />
        )}
      </View>
      <Text style={styles.caption}>
        Abra o app do seu banco e escaneie o código acima
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  qrFrame: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(0, 157, 255, 0.4)',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 107, 214, 0.2)',
  },
  caption: {
    color: DarkPalette.textSecondary,
    fontSize: 13,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginTop: 4,
  },
});
