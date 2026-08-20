import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronRight,
  MapPin,
  CalendarDays,
  Camera,
  Sparkles,
} from 'lucide-react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.dark;

const EventCard = ({ event }) => {
  const navigation = useNavigation();
  const { isMobile } = useBreakpoint();
  const [isHovered, setIsHovered] = useState(false);

  const { name, image, city, event_date, modality, owner } = event;

  const dateObj = new Date(event_date);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePress = () => navigation.navigate('EventDetails', { event });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isMobile && styles.cardMobile,
        isHovered && styles.cardHovered,
      ]}
      onPress={handlePress}
      activeOpacity={0.88}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── IMAGE SECTION (Takes 68-72% of card) ── */}
      <View style={[styles.imageContainer, isMobile && styles.imageContainerMobile]}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={[
              styles.image,
              isHovered && styles.imageHovered,
            ]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imgPlaceholder]}>
            <Camera size={32} color={DarkPalette.textDisabled} />
          </View>
        )}

        {/* Soft dark vignette over image bottom */}
        <View style={styles.imageOverlay} />

        {/* Viewfinder corner brackets */}
        <View style={styles.viewfinderTL} />
        <View style={styles.viewfinderBR} />

        {/* Modality Tag */}
        {modality?.name && (
          <View style={styles.modalityBadge}>
            <Text style={styles.modalityText} numberOfLines={1}>
              {modality.name}
            </Text>
          </View>
        )}

        {/* Fast selfie AI finder pill */}
        <View style={styles.aiPill}>
          <Sparkles size={11} color="#009DFF" />
          <Text style={styles.aiPillText}>Busca Facial</Text>
        </View>
      </View>

      {/* ── CONTENT SECTION ── */}
      <View style={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.title} numberOfLines={2}>
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
              <MapPin size={12} color={DarkPalette.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {city}
              </Text>
            </View>
          )}
          {event_date && (
            <View style={styles.metaItem}>
              <CalendarDays size={12} color={DarkPalette.textMuted} />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
          )}
        </View>

        {/* Button CTA */}
        <View style={styles.footerRow}>
          <View style={[styles.btnAction, isHovered && styles.btnActionHovered]}>
            <Text style={styles.btnActionText}>Acessar galeria</Text>
            <ChevronRight size={14} color="#F7F9FC" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default EventCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    transition: 'all 280ms cubic-bezier(0.2, 0, 0, 1)',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
  },
  cardHovered: {
    borderColor: '#006BD6',
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 28px rgba(0, 107, 214, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
  },
  cardMobile: {
    marginBottom: Spacing.three,
  },

  // Image section (68% of visual volume)
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  imageContainerMobile: {
    aspectRatio: 16 / 10.5,
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transition: 'transform 350ms cubic-bezier(0.2, 0, 0, 1)',
  },
  imageHovered: {
    transform: 'scale(1.03)',
  },
  imgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    pointerEvents: 'none',
  },

  // Viewfinder accents in corners
  viewfinderTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: '#006BD6',
    borderLeftColor: '#006BD6',
    pointerEvents: 'none',
  },
  viewfinderBR: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomColor: '#006BD6',
    borderRightColor: '#006BD6',
    pointerEvents: 'none',
  },

  // Badges on image
  modalityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
  },
  modalityText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: FontWeights.bold,
    letterSpacing: 0.3,
  },
  aiPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
  },
  aiPillText: {
    fontSize: 10,
    color: '#006BD6',
    fontWeight: FontWeights.bold,
  },

  // Content
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerBlock: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: FontWeights.bold,
    color: '#0F172A',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  owner: {
    fontSize: 12,
    color: '#475569',
    fontWeight: FontWeights.medium,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: FontWeights.medium,
  },

  // Footer & Button
  footerRow: {
    marginTop: Spacing.one,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    borderRadius: Radius.md,
    transition: 'all 200ms ease',
  },
  btnActionHovered: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  btnActionText: {
    color: '#006BD6',
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },
});
