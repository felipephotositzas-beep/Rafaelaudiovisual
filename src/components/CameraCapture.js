import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, RefreshCcw, ScanFace } from 'lucide-react-native';
import { Colors, DarkPalette, BrandColors, FontWeights, Radius, Spacing } from '../constants/theme';

const theme = Colors.dark;

export default function CameraCapture({ visible, onCapture, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) setCameraReady(false);
  }, [visible, facing]);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} transparent={false} animationType="slide">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#006BD6" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent={false} animationType="slide">
        <View style={styles.centerContainer}>
          <ScanFace size={48} color="#009DFF" style={{ marginBottom: 16 }} />
          <Text style={styles.message}>Precisamos da sua permissão para usar a câmera e localizar suas fotos.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Conceder Permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnPrimary, styles.btnSecondary]} onPress={onClose}>
            <Text style={styles.btnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  const handleCapture = async () => {
    if (cameraRef.current && cameraReady && !loading) {
      setLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
          exif: false,
        });
        setLoading(false);
        if (!photo?.base64) {
          Alert.alert('Busca por foto', 'Não foi possível capturar a imagem. Tente novamente.');
          return;
        }
        onCapture({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          dataUrl: `data:image/jpeg;base64,${photo.base64}`,
        });
      } catch (error) {
        console.error('Erro ao tirar foto:', error);
        setLoading(false);
        Alert.alert('Câmera', 'Não foi possível tirar a foto. Tente novamente.');
      }
    }
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <SafeAreaView style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          ref={cameraRef}
          onCameraReady={() => setCameraReady(true)}
        />
          
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
              <X color="#F7F9FC" size={24} />
            </TouchableOpacity>
            
            <View style={styles.faceTargetBadge}>
              <Text style={styles.faceTargetText}>Enquadre seu rosto</Text>
            </View>

            <TouchableOpacity style={styles.iconBtn} onPress={toggleCameraFacing}>
              <RefreshCcw color="#F7F9FC" size={22} />
            </TouchableOpacity>
          </View>

          {/* Central Oval for Face Guide */}
          <View style={styles.faceGuideFrame}>
            <View style={styles.faceGuideOval} />
          </View>

          {/* Bottom Shutter Controls */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.shutterBtn} 
              onPress={handleCapture}
              disabled={loading || !cameraReady}
              activeOpacity={0.85}
            >
              <View style={styles.shutterBtnInner}>
                {loading && <ActivityIndicator color="#006BD6" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020406',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
    backgroundColor: '#020406',
  },
  message: {
    textAlign: 'center',
    paddingBottom: Spacing.six,
    fontSize: 16,
    lineHeight: 24,
    color: '#F7F9FC',
    maxWidth: 320,
  },
  btnPrimary: {
    backgroundColor: '#006BD6',
    padding: Spacing.four,
    borderRadius: Radius.md,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  btnSecondary: {
    marginTop: Spacing.three,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
  iconBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(2, 4, 6, 0.6)',
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  faceTargetBadge: {
    backgroundColor: 'rgba(2, 4, 6, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.4)',
  },
  faceTargetText: {
    color: '#009DFF',
    fontSize: 12,
    fontWeight: FontWeights.bold,
  },
  faceGuideFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideOval: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(0, 157, 255, 0.5)',
    borderStyle: 'dashed',
  },
  controls: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 107, 214, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#009DFF',
  },
  shutterBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
