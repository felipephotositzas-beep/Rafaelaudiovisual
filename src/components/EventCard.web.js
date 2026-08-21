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
  
  const shortMonth = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
  const dayStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit' });

  const handlePress = () =>
    navigation.navigate('EventDetails', { id: event.id });

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
      {/* ── IMAGE SECTION ── */}
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

        {/* Date Badge like Screenshot */}
        {event_date && (
          <View style={styles.modalityBadge}>
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14, textAlign: 'center' }}>{dayStr}</Text>
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 10, textAlign: 'center' }}>{shortMonth}</Text>
          </View>
        )}

        {/* Fast selfie AI finder pill - Just a circle icon */}
        <View style={styles.aiPill}>
          <Sparkles size={12} color="#0F172A" />
        </View>
      </View>

      {/* ── CONTENT SECTION ── */}
      <View style={styles.content}>
        <View style={styles.headerBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {name?.toUpperCase()}
          </Text>
          <View style={styles.metaRow}>
            {city && (
              <Text style={styles.metaText} numberOfLines={1}>
                {city}
              </Text>
            )}
          </View>
        </View>

        {/* Button CTA */}
        <View style={styles.footerRow}>
          <View style={styles.verGaleriaTextLink}>
            <Camera size={14} color="#64748B" />
            <Text style={styles.verGaleriaText}>Ver galeria</Text>
          </View>

          <View style={[styles.btnAction, isHovered && styles.btnActionHovered]}>
            <Text style={styles.btnActionText}>Ver galeria</Text>
            <ChevronRight size={14} color="#FFFFFF" />
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
    display: 'flex',
    flexDirection: 'row', // Horizontal!
    height: 140, // Fixed height for horizontal card
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)',
    marginBottom: Spacing.three,
  },
  cardHovered: {
    borderColor: 'var(--primary-color)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 107, 214, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
  },
  cardMobile: {
    flexDirection: 'column',
    height: 'auto',
  },

  // Image section
  imageContainer: {
    width: 220, // Fixed width on desktop
    height: '100%',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  imageContainerMobile: {
    width: '100%',
    aspectRatio: 16 / 9,
    height: 'auto',
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
    display: 'none',
  },

  // Viewfinder accents in corners
  viewfinderTL: { display: 'none' },
  viewfinderBR: { display: 'none' },

  // Badges on image
  modalityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalityText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
  },
  aiPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  aiPillText: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: FontWeights.bold,
  },

  // Content
  content: {
    padding: Spacing.four,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerBlock: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
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
    gap: 12,
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    transition: 'all 200ms ease',
  },
  btnActionHovered: {
    backgroundColor: '#0F172A',
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: FontWeights.bold,
  },
  verGaleriaTextLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verGaleriaText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  }
});

