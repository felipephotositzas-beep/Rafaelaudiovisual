import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const logoSource = require('../../assets/logo.png');

/**
 * Logotipo oficial Rafael Publicado Audiovisual
 * Carrega a imagem enviada com dimensões proporcionais e alta nitidez
 */
export default function BrandLogo({
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  style,
}) {
  const sizeMap = {
    sm: { height: 32, width: 104 },
    md: { height: 44, width: 143 },
    lg: { height: 52, width: 169 },
    xl: { height: 64, width: 208 },
  };

  const dims = sizeMap[size] || sizeMap.md;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={{
          width: dims.width,
          height: dims.height,
          aspectRatio: 902 / 277,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
