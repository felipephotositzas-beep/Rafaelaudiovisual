import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, MapPin, CalendarDays, Camera, Sparkles } from 'lucide-react-native';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
  TypeStyles,
} from '../constants/theme';

const theme = Colors.dark;

const EventCard = ({ event }) => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isCompact = width < 640;
  const { name, image, city, event_date, modality, owner } = event;

  const dateObj = new Date(event_date);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePress = () => {
    navigation.navigate('EventDetails', { id: event.id, event });
  };

  return (
    <TouchableOpacity
      style={[styles.card, isCompact && styles.cardCompact]}
      onPress={handlePress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Abrir galeria ${name}`}
    >
      <View style={[styles.imageContainer, isCompact && styles.imageContainerCompact]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Camera size={24} color={DarkPalette.textDisabled} />
          </View>
        )}
        {modality?.name && (
          <View style={styles.modalityPill}>
            <Text style={styles.modalityText} numberOfLines={1}>{modality.name}</Text>
          </View>
        )}
        <View style={styles.viewfinderCornerTL} />
        <View style={styles.viewfinderCornerBR} />
      </View>

      <View style={styles.content}>
        <View>
          <Text style={[styles.title, isCompact && styles.titleCompact]} numberOfLines={2}>
            {name}
          </Text>
          {owner?.name && (
            <Text style={styles.owner} numberOfLines={1}>
              {owner.name}
            </Text>
          )}
        </View>

        <View style={styles.metaRow}>
          {city && (
            <View style={styles.metaItem}>
              <MapPin size={11} color={DarkPalette.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{city}</Text>
            </View>
          )}
          {event_date && (
            <View style={styles.metaItem}>
              <CalendarDays size={11} color={DarkPalette.textMuted} />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.aiTag}>
            <Sparkles size={10} color="var(--primary-color)" />
            <Text style={styles.aiTagText}>Reconhecimento Facial</Text>
          </View>
          <View style={styles.openIcon}>
            <ChevronRight size={16} color="var(--primary-color)" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;

const styles = StyleSheet.create({
  card: {
    width: '92%',
    maxWidth: 1200,
    minHeight: 136,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#08111C',
    borderRadius: Radius.lg,
    marginVertical: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardCompact: {
    minHeight: 128,
  },
  imageContainer: {
    width: 170,
    position: 'relative',
    backgroundColor: '#050B12',
  },
  imageContainerCompact: {
    width: 130,
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07101B',
  },
  viewfinderCornerTL: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 6,
    height: 6,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: 'rgba(0, 157, 255, 0.6)',
    borderLeftColor: 'rgba(0, 157, 255, 0.6)',
  },
  viewfinderCornerBR: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 6,
    height: 6,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomColor: 'rgba(0, 157, 255, 0.6)',
    borderRightColor: 'rgba(0, 157, 255, 0.6)',
  },
  modalityPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    maxWidth: '85%',
    backgroundColor: 'rgba(2, 4, 6, 0.85)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalityText: {
    fontSize: 10,
    color: '#F7F9FC',
    fontWeight: FontWeights.bold,
  },
  content: {
    flex: 1,
    padding: Spacing.three + 2,
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: FontWeights.bold,
    color: DarkPalette.textPrimary,
    lineHeight: 20,
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  owner: {
    fontSize: 11,
    color: DarkPalette.textSecondary,
    fontWeight: FontWeights.medium,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: DarkPalette.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
  },
  aiTagText: {
    fontSize: 10,
    color: "var(--primary-color)",
    fontWeight: FontWeights.semibold,
  },
  openIcon: {
    width: 26,
    height: 26,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
  },
});
