import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MapPin } from 'lucide-react-native';
import EventCard from '../components/EventCard';
import { findFeaturedLocation } from '../data/locations';
import { mockEventsData } from '../data/mockEvents';
import { Colors, DarkPalette, FontWeights, Radius, Spacing, TypeStyles } from '../constants/theme';

const theme = Colors.dark;

export default function LocationEvents() {
  const route = useRoute();
  const slug = route.params?.slug || 'parque-ibirapuera'; 
  const location = findFeaturedLocation(slug);
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) return;
    
    setLoading(true);
    setTimeout(() => {
      const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const safeSearchName = removeAccents(location.search.toLowerCase().trim());
      
      const filtered = mockEventsData.results.filter(event => {
        const safeEventName = removeAccents(event.name.toLowerCase());
        return safeEventName.includes(safeSearchName);
      });
      
      setEvents(filtered);
      setLoading(false);
    }, 400);
  }, [location]);

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Local não encontrado</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.heroSection}>
      <Image source={{ uri: location.image }} style={styles.heroImage} />
      <View style={styles.heroContent}>
        <Text style={styles.eyebrow}>EVENTOS POR LOCAL</Text>
        <Text style={styles.title}>{location.name}</Text>
        <View style={styles.cityRow}>
          <MapPin size={15} color="#009DFF" />
          <Text style={styles.city}>{location.city}</Text>
        </View>
        <Text style={styles.description}>Veja todos os eventos e coberturas fotográficas disponíveis neste local.</Text>
      </View>
      <Text style={styles.sectionTitle}>Eventos em {location.name}</Text>
      {loading && <ActivityIndicator size="large" color="#006BD6" style={{ marginTop: 20 }} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <EventCard event={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Nenhum evento disponível neste local.</Text> : null}
      />
    </View>
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
    backgroundColor: '#020406',
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.ten,
  },
  heroSection: {
    marginBottom: Spacing.six,
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroContent: {
    marginBottom: Spacing.six,
  },
  eyebrow: {
    fontSize: 11,
    color: '#009DFF',
    fontWeight: FontWeights.extrabold,
    letterSpacing: 1,
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 24,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
    marginBottom: Spacing.two,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
  city: {
    fontSize: 14,
    color: DarkPalette.textSecondary,
    fontWeight: FontWeights.medium,
  },
  description: {
    fontSize: 13,
    color: DarkPalette.textMuted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
    marginBottom: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
    color: DarkPalette.textMuted,
    marginTop: Spacing.five,
  }
});
