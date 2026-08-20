import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Keyboard,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Search, X, Sparkles, ScanFace } from 'lucide-react-native';
import EventCard from '../components/EventCard';
import { fetchEvents, fetchModalities } from '../utils/api';
import { mockEventsData, mockModalitiesData } from '../data/mockEvents';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.dark;

export default function Home() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [selectedModality, setSelectedModality] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchTimerRef = useRef(null);
  const eventsRequestRef = useRef(null);

  useEffect(() => {
    loadModalities();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(
      () => loadEventsData(1),
      searchName.trim() ? 300 : 0
    );
    return () => clearTimeout(searchTimerRef.current);
  }, [searchName, selectedModality]);

  const loadModalities = async () => {
    try {
      const res = await fetchModalities();
      if (res.ok) {
        const data = await res.json();
        setModalities(data.results || []);
      } else throw new Error();
    } catch {
      setModalities(mockModalitiesData.results);
    }
  };

  const loadEventsData = async (pageNumber = 1) => {
    if (pageNumber === 1) setLoading(true);
    else setLoadingMore(true);

    const params = {};
    const normalizedSearch = searchName.trim();
    if (normalizedSearch) params.name = normalizedSearch;
    if (selectedModality) params.modality = selectedModality;
    params.page = pageNumber;

    if (pageNumber === 1) {
      eventsRequestRef.current?.abort();
      eventsRequestRef.current = new AbortController();
    }
    const requestController = eventsRequestRef.current;

    try {
      const res = await fetchEvents(params, { signal: requestController?.signal });
      if (res.ok) {
        const data = await res.json();
        if (requestController?.signal.aborted) return;
        const newEvents = data.results || [];
        if (pageNumber === 1) setEvents(newEvents);
        else setEvents((prev) => [...prev, ...newEvents]);
        setHasMore(!!data.next);
        setPage(pageNumber);
      } else throw new Error();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      const removeAccents = (str) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const filtered = mockEventsData.results.filter((event) => {
        const safe = removeAccents(searchName.toLowerCase().trim());
        const name = removeAccents(event.name.toLowerCase());
        const matchName = safe === '' || name.includes(safe);
        const matchMod =
          !selectedModality ||
          (event.modality &&
            (event.modality.id === selectedModality ||
              event.modality.slug === selectedModality));
        return matchName && matchMod;
      });
      setEvents(filtered);
      setHasMore(false);
    } finally {
      if (!requestController?.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const handleSearch = () => {
    clearTimeout(searchTimerRef.current);
    Keyboard.dismiss();
    loadEventsData(1);
  };

  const handleClear = () => {
    clearTimeout(searchTimerRef.current);
    setSearchName('');
    setSelectedModality('');
    Keyboard.dismiss();
  };

  const openWhatsapp = () => {
    Linking.openURL('https://api.whatsapp.com/send?phone=5599991297693&text=Olá!');
  };

  const renderHeader = () => (
    <View>
      <View style={styles.heroSection}>
        <View style={styles.heroBadge}>
          <Sparkles size={11} color="#009DFF" />
          <Text style={styles.heroBadgeText}>AUDIOVISUAL PREMIUM</Text>
        </View>
        <Text style={styles.heroTitle}>Momentos em movimento,</Text>
        <Text style={styles.heroTitleHighlight}>eternizados com precisão.</Text>
        <Text style={styles.heroSubtitle}>
          Encontre suas fotos profissionais através da busca ou reconhecimento facial.
        </Text>

        <View style={styles.searchBar}>
          <View style={styles.searchInputWrapper}>
            <Search color="#009DFF" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar evento por nome ou cidade..."
              placeholderTextColor={DarkPalette.textMuted}
              value={searchName}
              onChangeText={setSearchName}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchName !== '' && (
              <TouchableOpacity onPress={handleClear}>
                <X size={15} color={DarkPalette.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.btnSearch} onPress={handleSearch}>
            <Text style={styles.btnSearchText}>Buscar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {modalities.length > 0 && (
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesTitle}>Categorias</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedModality && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedModality('')}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  !selectedModality && styles.categoryChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {modalities.map((mod) => {
              const isActive = selectedModality === mod.id;
              return (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.categoryChip,
                    isActive && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedModality(isActive ? '' : mod.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {mod.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading && (
        <ActivityIndicator
          size="large"
          color="#006BD6"
          style={{ marginTop: 40 }}
        />
      )}
      {!loading && events.length === 0 && (
        <Text style={styles.emptyText}>
          Nenhum evento encontrado para esta busca.
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <EventCard event={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasMore && !loadingMore && loadEventsData(page + 1)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#006BD6" style={{ padding: 20 }} />
          ) : null
        }
      />
      <TouchableOpacity style={styles.whatsappFloat} onPress={openWhatsapp}>
        <MessageCircle size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020406' },
  listContent: { paddingBottom: 100 },
  heroSection: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    backgroundColor: '#020406',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 107, 214, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 157, 255, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: FontWeights.extrabold,
    color: '#009DFF',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: FontWeights.bold,
    color: '#F7F9FC',
  },
  heroTitleHighlight: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: FontWeights.extrabold,
    color: '#009DFF',
    marginBottom: Spacing.two,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: DarkPalette.textSecondary,
    marginBottom: Spacing.four,
  },
  searchBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#08111C',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#F7F9FC',
  },
  btnSearch: {
    backgroundColor: '#006BD6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    height: 48,
  },
  btnSearchText: {
    color: '#FFFFFF',
    fontWeight: FontWeights.bold,
    fontSize: 13,
  },
  categoriesSection: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#050B12',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoriesTitle: {
    fontSize: 12,
    fontWeight: FontWeights.bold,
    color: DarkPalette.textSecondary,
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoriesScroll: { gap: Spacing.two },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#08111C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(0, 107, 214, 0.2)',
    borderColor: '#006BD6',
  },
  categoryChipText: {
    fontSize: 12,
    color: DarkPalette.textSecondary,
    fontWeight: FontWeights.medium,
  },
  categoryChipTextActive: {
    color: '#F7F9FC',
    fontWeight: FontWeights.bold,
  },
  emptyText: {
    textAlign: 'center',
    color: DarkPalette.textMuted,
    marginTop: Spacing.ten,
    paddingHorizontal: Spacing.six,
  },
  whatsappFloat: {
    position: 'absolute',
    bottom: Spacing.six,
    right: Spacing.four,
    backgroundColor: '#20C997',
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 16px rgba(32, 201, 151, 0.4)',
  },
});
