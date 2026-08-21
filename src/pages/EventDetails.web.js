import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Play,
  ScanFace,
  Share2,
  ShoppingCart,
  UserRound,
  Video,
  X,
  Sparkles,
  ArrowLeft,
  CircleAlert,
  Lock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import MediaViewer from '../components/MediaViewer';
import CartFloatingBar from '../components/CartFloatingBar';
import CameraCapture from '../components/CameraCapture';
import { useCart } from '../context/CartContext';
import { useAdminConfig } from '../context/AdminConfigContext';
import { trackEventView, trackFaceSearch } from '../utils/analytics';
import {
  fetchEventById,
  fetchEvents,
  fetchPhotos,
  searchByFace,
  fetchEventPrivacy,
  DEFAULT_PHOTOGRAPHER_ID,
} from '../utils/api';
import { getProgressiveDiscountTiers } from '../utils/progressiveDiscountUtils';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  Colors,
  DarkPalette,
  BrandColors,
  FontWeights,
  Layout,
  Radius,
  Spacing,
} from '../constants/theme';

const theme = Colors.light;
const MAX_FACE_IMAGE_DIMENSION = 1500;
const MAX_FACE_IMAGE_BYTES = 1_100_000;
const PUBLIC_SITE_URL = 'https://topfotos.com.br';

const getEventShareUrl = (eventId) => {
  let origin = PUBLIC_SITE_URL;
  if (typeof window !== 'undefined') {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(
      window.location.hostname
    );
    if (!isLocalhost && /^https?:$/.test(window.location.protocol)) {
      origin = window.location.origin;
    }
  }
  return `${origin}/evento/${encodeURIComponent(eventId)}`;
};

const estimateDataUrlBytes = (dataUrl) => {
  const base64 = dataUrl?.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
};

const prepareFaceImage = async (source) => {
  const sourceUri =
    typeof source === 'string' ? source : source?.uri || source?.dataUrl;
  if (!sourceUri) throw new Error('IMAGE_READ_FAILED');
  const context = ImageManipulator.manipulate(sourceUri);
  const width = Number(source?.width) || 0;
  const height = Number(source?.height) || 0;
  const largestSide = Math.max(width, height);
  if (largestSide > MAX_FACE_IMAGE_DIMENSION) {
    const scale = MAX_FACE_IMAGE_DIMENSION / largestSide;
    context.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    });
  }
  const renderedImage = await context.renderAsync();
  for (const compress of [0.82, 0.7, 0.58]) {
    const result = await renderedImage.saveAsync({
      base64: true,
      compress,
      format: SaveFormat.JPEG,
    });
    if (!result.base64) continue;
    const dataUrl = `data:image/jpeg;base64,${result.base64}`;
    if (
      estimateDataUrlBytes(dataUrl) <= MAX_FACE_IMAGE_BYTES ||
      compress === 0.58
    )
      return dataUrl;
  }
  throw new Error('IMAGE_READ_FAILED');
};

const readApiError = async (response) => {
  const rawBody = await response.text().catch(() => '');
  try {
    return { rawBody, data: rawBody ? JSON.parse(rawBody) : {} };
  } catch {
    return { rawBody, data: {} };
  }
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10)
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return phone;
};

const formatDateFull = (dateStr) => {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).trim();
    const cleanDate = raw.split('T')[0];
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let day = parseInt(parts[2], 10);
      if (parts[0].length <= 2 && parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const weekdays = [
          'Domingo',
          'Segunda-feira',
          'Terça-feira',
          'Quarta-feira',
          'Quinta-feira',
          'Sexta-feira',
          'Sábado',
        ];
        const months = [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro',
        ];
        const weekday = weekdays[d.getDay()];
        const m = months[d.getMonth()];
        return `${weekday}, ${day} de ${m} de ${year}`;
      }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export default function EventDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  // Garante que eventParam seja um objeto real e válido com .name (evita strings quebradas como "[object Object]")
  const rawEventParam = route.params?.event;
  const eventParam = (typeof rawEventParam === 'object' && rawEventParam !== null && rawEventParam.name)
    ? rawEventParam
    : null;

  // Resolve ID e Slug dos parâmetros ou diretamente da URL da web
  let initialId = (eventParam ? eventParam.id : null) || route.params?.id || route.params?.eventId;
  let initialSlug = (eventParam ? eventParam.slug : null) || route.params?.slug;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      // 1. Extrai ID ou Slug direto do pathname da URL (/evento/:id ou /event/:id)
      const pathMatch = window.location.pathname.match(/\/(evento|event)\/([^/?#]+)/i);
      if (pathMatch && pathMatch[2] && pathMatch[2] !== 'undefined') {
        initialId = decodeURIComponent(pathMatch[2]);
      }

      // 2. Extrai de query params (?id=... ou ?event_id=...)
      const searchParams = new URLSearchParams(window.location.search);
      if (!initialId) initialId = searchParams.get('id') || searchParams.get('event_id');
      if (!initialSlug) initialSlug = searchParams.get('slug');
    } catch {}
  }

  const [id, setId] = useState(initialId || null);
  const { isMobile, isDesktop } = useBreakpoint();

  const [eventData, setEventData] = useState(eventParam || null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mediaCounts, setMediaCounts] = useState({ photo: 0, video: 0 });
  const [numPages, setNumPages] = useState(1);
  const [mediaFilter, setMediaFilter] = useState('photo');
  const [viewMode, setViewMode] = useState('padrao');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isSearchingFace, setIsSearchingFace] = useState(false);
  const [isFaceSearchActive, setIsFaceSearchActive] = useState(false);
  const [faceSearchError, setFaceSearchError] = useState('');
  const [isPrivateEvent, setIsPrivateEvent] = useState(false);
  const photosCacheRef = useRef({});

  const { eventRules, config, isLoaded: adminConfigLoaded } = useAdminConfig();

  // Analytics: Rastreia acesso à página do evento
  useEffect(() => {
    if (id && id !== 'undefined' && eventData?.name) {
      trackEventView(id, eventData.name);
    }
  }, [id, eventData?.name]);

  const { addToCart, removeFromCart, isInCart, initializeCartForEvent } =
    useCart();
  const discountTiers = getProgressiveDiscountTiers(eventData);

  // Determina os fotógrafos visíveis para filtrar direto pela API
  const getActivePhotographerFilter = (eventId) => {
    if (!eventId || !adminConfigLoaded) return null;

    // Se o modo exclusivo de fotos do dono estiver ativado globalmente:
    if (config?.eventsConfig?.onlyOwnerPhotos) {
      const primary = (config.photographers || []).find((p) => p.isPrimary) || { id: DEFAULT_PHOTOGRAPHER_ID };
      return [primary.id || DEFAULT_PHOTOGRAPHER_ID];
    }

    const rules = eventRules[eventId] || {};
    const allPhotogIds = Object.keys(rules);
    // Se não há regras configuradas para este evento, sem filtro
    if (allPhotogIds.length === 0) return null;

    const hiddenIds = allPhotogIds.filter((pid) => rules[pid]?.isHidden);
    // Se ninguém está oculto, sem filtro
    if (hiddenIds.length === 0) return null;

    const visibleIds = allPhotogIds.filter((pid) => !rules[pid]?.isHidden);
    // Se 1 ou mais fotógrafos visíveis, retorna array para fetch multi
    if (visibleIds.length >= 1) return visibleIds;

    return null;
  };

  const isOwnerPhoto = (p) => {
    if (!p) return false;
    const primary = (config?.photographers || []).find((photog) => photog.isPrimary) || {
      id: DEFAULT_PHOTOGRAPHER_ID,
      name: 'Rafael Publicado',
      slug: 'rafael-costa',
    };
    const primaryId = String(primary.id || DEFAULT_PHOTOGRAPHER_ID || '').trim().toLowerCase();
    const primarySlug = String(primary.slug || DEFAULT_PHOTOGRAPHER_SLUG || 'rafael-costa').trim().toLowerCase();
    const primaryName = String(primary.name || 'Rafael').trim().toLowerCase();

    const photogId = String(p.photographer || p.photographer_id || p.owner || p.author || '').trim().toLowerCase();
    const photogName = String(p.photographer_name || p.owner_name || p.author_name || '').trim().toLowerCase();
    const photogSlug = String(p.photographer_slug || '').trim().toLowerCase();

    // 1. Se tem o nome do fotografo (ex: "Ramon Santana", "Junior Medrado")
    if (photogName) {
      return (
        photogName.includes('rafael') ||
        photogName.includes('publicado') ||
        (primaryName && photogName.includes(primaryName))
      );
    }

    // 2. Se tem o slug do fotografo
    if (photogSlug) {
      return (
        photogSlug.includes('rafael') ||
        photogSlug.includes('publicado') ||
        (primarySlug && photogSlug.includes(primarySlug))
      );
    }

    // 3. Se tem ID do fotografo
    if (photogId) {
      return (
        (primaryId && photogId === primaryId) ||
        (DEFAULT_PHOTOGRAPHER_ID && photogId === DEFAULT_PHOTOGRAPHER_ID.toLowerCase())
      );
    }

    return true;
  };

  // Helper para filtrar e ordenar fotos de acordo com as regras ativas do evento
  const processPhotosByEventRules = (loadedPhotos, eventId) => {
    // 0. Modo exclusivo: apenas fotos do dono do site (Rafael Publicado)
    if (config?.eventsConfig?.onlyOwnerPhotos) {
      return (loadedPhotos || []).filter(isOwnerPhoto);
    }

    const rules = eventRules[eventId] || {};

    // 1. Filtra fotos de fotógrafos marcados como ocultos
    const visiblePhotos = (loadedPhotos || []).filter((p) => {
      const photogId = p.photographer || p.photographer_id || p.owner;
      if (photogId && rules[photogId]?.isHidden) {
        return false;
      }
      return true;
    });

    // 2. Ordena de acordo com a prioridade (order) configurada no Admin
    visiblePhotos.sort((a, b) => {
      const photogA = a.photographer || a.photographer_id || a.owner || '';
      const photogB = b.photographer || b.photographer_id || b.owner || '';

      const orderA = rules[photogA]?.order ?? (photogA === DEFAULT_PHOTOGRAPHER_ID ? 1 : 99);
      const orderB = rules[photogB]?.order ?? (photogB === DEFAULT_PHOTOGRAPHER_ID ? 1 : 99);

      if (orderA !== orderB) return orderA - orderB;

      // Desempate: Rafael Publicado primeiro
      const aIsRafael = isOwnerPhoto(a);
      const bIsRafael = isOwnerPhoto(b);
      if (aIsRafael && !bIsRafael) return -1;
      if (!aIsRafael && bIsRafael) return 1;
      return 0;
    });

    return visiblePhotos;
  };

  // Helper: busca fotos de múltiplos fotógrafos em paralelo e mescla resultados
  const fetchPhotosForVisiblePhotographers = async (eventId, pageNumber, mediaType, photogFilter) => {
    // photogFilter é array de IDs visíveis ou null (sem filtro)
    if (!photogFilter || photogFilter.length === 0) {
      // Sem filtro: busca normal
      return fetchPhotos(eventId, pageNumber, mediaType);
    }

    // Busca em paralelo para cada fotógrafo visível
    const responses = await Promise.all(
      photogFilter.map((pid) => fetchPhotos(eventId, pageNumber, mediaType, pid))
    );

    let allResults = [];
    let totalCount = 0;
    let maxPages = 1;

    for (const res of responses) {
      if (res.ok) {
        const data = await res.json();
        allResults = allResults.concat(data.results || []);
        totalCount += (data.count || 0);
        maxPages = Math.max(maxPages, data.num_pages || 1);
      }
    }

    // Retorna um objeto simulando a resposta da API
    return {
      ok: true,
      json: async () => ({
        results: allResults,
        count: totalCount,
        num_pages: maxPages,
      }),
    };
  };

  // Prefetch silencioso da próxima página em background
  const prefetchNextPage = async (nextPage, mediaType) => {
    if (!id || id === 'undefined') return;
    const photogFilter = getActivePhotographerFilter(id);
    const filterKey = Array.isArray(photogFilter) ? photogFilter.join(',') : 'all';
    const cacheKey = `${id}_${mediaType}_${filterKey}_${nextPage}`;
    if (photosCacheRef.current[cacheKey]) return;
    try {
      const res = await fetchPhotosForVisiblePhotographers(id, nextPage, mediaType, photogFilter);
      if (res.ok) {
        const data = await res.json();
        let loaded = processPhotosByEventRules(data.results || [], id);
        photosCacheRef.current[cacheKey] = {
          results: loaded,
          count: data.count || 0,
          num_pages: data.num_pages || 1,
        };
      }
    } catch {}
  };

  // If we only have slug or eventParam without id, resolve event from API
  useEffect(() => {
    if (id) return;
    let active = true;
    const resolveEvent = async () => {
      try {
        const response = await fetchEvents();
        if (!response.ok) return;
        const data = await response.json();
        const found = data.results?.find(
          (event) => event.id === initialId || (initialSlug && event.slug === initialSlug)
        );
        if (active && found) {
          setId(found.id);
          setEventData(found);
        } else if (active) {
          setLoading(false);
        }
      } catch (error) {
        console.warn('resolveEvent error:', error);
        if (active) setLoading(false);
      }
    };
    resolveEvent();
    return () => {
      active = false;
    };
  }, [id, initialId, initialSlug]);

  useEffect(() => {
    if (!adminConfigLoaded) return; // Espera eventRules carregar do storage
    if (id && id !== 'undefined') {
      initializeCartForEvent(id);
      // Limpa cache ao recarregar (regras podem ter mudado)
      photosCacheRef.current = {};
      const slug = eventData?.slug || eventParam?.slug || initialSlug;
      if (slug) {
        fetchEventPrivacy(slug).then((isPriv) => {
          setIsPrivateEvent(Boolean(isPriv));
          if (!isPriv) {
            loadPhotosData(1, 'photo');
          } else {
            setLoading(false);
            setPhotos([]);
          }
        });
      } else {
        loadPhotosData(1, 'photo');
      }
      loadMediaCount('video');
      loadMediaCount('photo');
    }
  }, [id, eventData?.slug, eventParam?.slug, initialSlug, adminConfigLoaded, config?.eventsConfig?.onlyOwnerPhotos]);

  // Busca sempre os dados completos do evento pelo ID na API (para links diretos ou dados incompletos)
  useEffect(() => {
    if (!id || id === 'undefined') return;
    let active = true;
    const loadEvent = async () => {
      try {
        const res = await fetchEventById(id);
        if (res.ok) {
          const data = await res.json();
          if (active && data && (data.name || data.id)) {
            setEventData(data);
          }
        }
      } catch (e) {
        console.warn('loadEvent error:', e);
      }
    };

    // Executa a busca se não tiver os dados completos (nome ou cidade)
    if (!eventData || !eventData.name || !eventData.city) {
      loadEvent();
    }

    return () => {
      active = false;
    };
  }, [id, eventData]);

  useEffect(() => {
    if (typeof document === 'undefined' || !id) return undefined;

    const eventName = eventData?.name || 'Galeria do evento';
    const title = `${eventName} | Rafael Publicado`;
    const description = eventData?.city
      ? `Veja e encontre suas fotos do evento ${eventName}, em ${eventData.city}.`
      : `Veja e encontre suas fotos do evento ${eventName}.`;
    const canonicalUrl = getEventShareUrl(id);
    const image = eventData?.image || eventData?.rawEvent?.image;

    const setMeta = (attribute, key, content) => {
      if (!content) return;
      let element = document.head.querySelector(
        `meta[${attribute}="${key}"]`
      );
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
      element.setAttribute('data-event-meta', 'true');
    };

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Rafael Publicado Audiovisual');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:image:alt', `Capa do evento ${eventName}`);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // Injeta JSON-LD Schema.org para o Evento no Google
    let schemaScript = document.getElementById('schema-org-event');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'schema-org-event';
      schemaScript.type = 'application/ld+json';
      schemaScript.setAttribute('data-event-meta', 'true');
      document.head.appendChild(schemaScript);
    }
    schemaScript.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      'name': eventName,
      'description': description,
      'image': image || 'https://rafaelpublicado.com.br/assets/logo.png',
      'startDate': eventData?.event_date || eventData?.date || new Date().toISOString().split('T')[0],
      'location': {
        '@type': 'Place',
        'name': eventData?.city || 'Maranhão',
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': eventData?.city || 'Maranhão',
          'addressCountry': 'BR'
        }
      },
      'organizer': {
        '@type': 'Organization',
        'name': 'Rafael Publicado Audiovisual',
        'url': 'https://rafaelpublicado.com.br'
      },
      'offers': {
        '@type': 'Offer',
        'url': canonicalUrl,
        'price': eventData?.price_per_photo || '10.00',
        'priceCurrency': 'BRL',
        'availability': 'https://schema.org/InStock',
        'validFrom': eventData?.created_at || new Date().toISOString()
      }
    });

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
    canonical.setAttribute('data-event-meta', 'true');

    return () => {
      document.head
        .querySelectorAll('[data-event-meta="true"]')
        .forEach((element) => element.remove());
      document.title = 'rafaelpublicado';
    };
  }, [eventData, id]);

  const loadMediaCount = async (mediaType) => {
    if (!id || id === 'undefined') return;
    try {
      const photogFilter = getActivePhotographerFilter(id);
      const res = await fetchPhotosForVisiblePhotographers(id, 1, mediaType, photogFilter);
      if (!res.ok) return;
      const data = await res.json();
      setMediaCounts((current) => ({
        ...current,
        [mediaType]: data.count || 0,
      }));
    } catch (error) {
      console.warn('loadMediaCount error:', error);
    }
  };

  const loadPhotosData = async (pageNumber, mediaType = mediaFilter) => {
    if (!id || id === 'undefined') {
      setLoading(false);
      return;
    }

    const photogFilter = getActivePhotographerFilter(id);
    const filterKey = Array.isArray(photogFilter) ? photogFilter.join(',') : 'all';
    const cacheKey = `${id}_${mediaType}_${filterKey}_${pageNumber}`;
    const cached = photosCacheRef.current[cacheKey];

    // 🚀 Se estiver em cache, carrega INSTANTANEAMENTE (0 ms)!
    if (cached) {
      setPhotos(cached.results);
      setMediaCounts((current) => ({
        ...current,
        [mediaType]: cached.count,
      }));
      setNumPages(cached.num_pages);
      setHasMore(pageNumber < cached.num_pages);
      setPage(pageNumber);
      setLoading(false);
      setLoadingMore(false);

      if (pageNumber !== 1 && typeof window !== 'undefined') {
        const gridElem = document.getElementById('galeria-fotos-grid');
        if (gridElem) {
          gridElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }
      }

      // Prefetch da próxima página em background
      if (pageNumber < cached.num_pages) {
        prefetchNextPage(pageNumber + 1, mediaType);
      }
      return;
    }

    // Busca da rede
    if (pageNumber === 1) {
      setLoading(true);
      setIsFaceSearchActive(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetchPhotosForVisiblePhotographers(id, pageNumber, mediaType, photogFilter);
      if (res.ok) {
        const data = await res.json();
        let loadedPhotos = processPhotosByEventRules(data.results || [], id);

        // Salva no cache da memória
        photosCacheRef.current[cacheKey] = {
          results: loadedPhotos,
          count: data.count || 0,
          num_pages: data.num_pages || 1,
        };

        setPhotos(loadedPhotos);
        setMediaCounts((current) => ({
          ...current,
          [mediaType]: data.count || 0,
        }));
        setNumPages(data.num_pages || 1);
        setHasMore(pageNumber < (data.num_pages || 1));
        setPage(pageNumber);

        if (pageNumber !== 1 && typeof window !== 'undefined') {
          const gridElem = document.getElementById('galeria-fotos-grid');
          if (gridElem) {
            gridElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }
        }

        // Prefetch da próxima página em background
        if (pageNumber < (data.num_pages || 1)) {
          prefetchNextPage(pageNumber + 1, mediaType);
        }
      }
    } catch (err) {
      console.warn('loadPhotos error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFaceSearch = async (imageSource) => {
    if (id && id !== 'undefined') {
      trackFaceSearch(id, eventData?.name || 'Evento');
    }
    setIsCameraVisible(false);
    setIsSearchingFace(true);
    setFaceSearchError('');
    try {
      const imageDataUrl = await prepareFaceImage(imageSource);
      const primary = (config?.photographers || []).find((p) => p.isPrimary) || { id: DEFAULT_PHOTOGRAPHER_ID };
      const photographerId = config?.eventsConfig?.onlyOwnerPhotos
        ? (primary.id || DEFAULT_PHOTOGRAPHER_ID)
        : (eventData?.owner?.id || eventData?.photographer?.id || eventData?.photographer || DEFAULT_PHOTOGRAPHER_ID);
      const res = await searchByFace(id, imageDataUrl, photographerId);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : data.results || [];
        const filteredResults = processPhotosByEventRules(results, id);
        setPhotos(filteredResults);
        setIsFaceSearchActive(true);
        setHasMore(false);
        if (results.length === 0) {
          alert('Nenhuma foto encontrada para este rosto no evento.');
        }
      } else {
        const { data: errorData, rawBody } = await readApiError(res);
        const serverMessage =
          errorData.error || errorData.detail || errorData.message || rawBody;
        if (String(serverMessage).includes('There are no faces in the image')) {
          setFaceSearchError(
            'Nenhum rosto foi identificado. Use uma selfie bem iluminada, de frente e sem óculos escuros.'
          );
        } else {
          setFaceSearchError(
            'Não foi possível analisar esta imagem. Tente outra selfie com o rosto bem visível.'
          );
        }
      }
    } catch {
      setFaceSearchError(
        'Falha ao processar a selfie. Verifique a imagem e tente novamente.'
      );
    } finally {
      setIsSearchingFace(false);
    }
  };

  const clearFaceSearch = () => {
    setIsFaceSearchActive(false);
    setFaceSearchError('');
    loadPhotosData(1, mediaFilter);
  };

  const handleMediaFilterChange = (filter) => {
    if (filter === mediaFilter || loading) return;
    setMediaFilter(filter);
    loadPhotosData(1, filter);
  };

  const handleShare = async () => {
    const url = getEventShareUrl(id);
    const title = eventData?.name || 'Galeria de evento';
    const text = `Veja as fotos do evento ${title}.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
    } else {
      await Clipboard.setStringAsync(url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const openWhatsApp = (phoneNum) => {
    const raw = phoneNum ? phoneNum.replace(/\D/g, '') : '5599991297693';
    const num = raw.startsWith('55') ? raw : `55${raw}`;
    const url = `https://api.whatsapp.com/send?phone=${num}&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos%20do%20evento%20${encodeURIComponent(
      eventData?.name || ''
    )}.`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (isFaceSearchActive) return true;
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'photo') return !p.is_video;
    return p.is_video;
  });

  const photoCount = mediaCounts.photo;
  const videoCount = mediaCounts.video;

  // ─── PHOTO ITEM COMPONENT ───────────────────────────────────────────────────
  const renderPhoto = ({ item: photo, index }) => {
    const inCart = isInCart(photo.id);
    const isHovered = hoveredIndex === index;

    return (
      <View
        key={photo.id || index}
        dataSet={{ protectedMedia: 'true' }}
        onContextMenu={(event) => event.preventDefault()}
        style={[
          styles.photoCard,
          isMobile && styles.photoCardMobile,
          viewMode === 'rapida' && styles.photoCardCompact,
        ]}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setSelectedMediaIndex(index)}
          activeOpacity={0.95}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Foto ${index + 1}`}
        >
          <Image
            source={{ uri: photo.watermark_path }}
            draggable={false}
            style={styles.photoCardImg}
            resizeMode="cover"
          />

          {photo.is_video && (
            <View style={styles.videoBadge}>
              <Play size={13} color="#fff" fill="#fff" />
            </View>
          )}

          {/* Bottom Photographer Label */}
          {photo.photographer_name && (
            <View style={styles.photoFooterGradient}>
              {photo.photographer_image ? (
                <Image
                  source={{ uri: photo.photographer_image }}
                  style={styles.photoFooterAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoFooterAvatarFallback}>
                  <UserRound size={10} color="#FFFFFF" />
                </View>
              )}
              <Text style={styles.photoFooterName} numberOfLines={1}>
                {photo.photographer_name}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Desktop Hover Overlay with "Ver" and "Adicionar" buttons */}
        {!isMobile && isHovered && (
          <View style={styles.hoverOverlay}>
            <TouchableOpacity
              style={styles.btnHoverVer}
              onPress={() => setSelectedMediaIndex(index)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnHoverVerText}>Ver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnHoverAdd, inCart && styles.btnHoverAddActive]}
              onPress={() =>
                inCart ? removeFromCart(photo.id) : addToCart(photo)
              }
              activeOpacity={0.85}
            >
              <Text style={styles.btnHoverAddText}>
                {inCart ? 'Adicionado ✓' : 'Adicionar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mobile Quick Cart Button */}
        {isMobile && (
          <TouchableOpacity
            style={[styles.cartBtnMobile, inCart && styles.cartBtnMobileActive]}
            onPress={() =>
              inCart ? removeFromCart(photo.id) : addToCart(photo)
            }
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={
              inCart ? 'Remover do carrinho' : 'Adicionar ao carrinho'
            }
          >
            {inCart ? (
              <Check color="#FFFFFF" size={15} strokeWidth={3} />
            ) : (
              <ShoppingCart color="#FFFFFF" size={14} strokeWidth={2} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ─── PAGINATION ──────────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (isFaceSearchActive || loading || numPages <= 1) return null;
    return (
      <View style={styles.paginationRow}>
        <TouchableOpacity
          style={[
            styles.paginationBtn,
            page === 1 && styles.paginationBtnDisabled,
          ]}
          onPress={() => page > 1 && loadPhotosData(page - 1)}
          disabled={page === 1 || loadingMore}
          activeOpacity={0.75}
        >
          <ChevronLeft
            size={16}
            color={
              page === 1
                ? DarkPalette.textDisabled
                : DarkPalette.textPrimary
            }
          />
          <Text
            style={[
              styles.paginationBtnText,
              page === 1 && styles.paginationBtnTextDisabled,
            ]}
          >
            Anterior
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          Página {page} de {numPages}
        </Text>

        <TouchableOpacity
          style={[
            styles.paginationBtn,
            !hasMore && styles.paginationBtnDisabled,
          ]}
          onPress={() => hasMore && loadPhotosData(page + 1)}
          disabled={!hasMore || loadingMore}
          activeOpacity={0.75}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color="var(--primary-color)" style={{ marginRight: 4 }} />
          ) : (
            <Text
              style={[
                styles.paginationBtnText,
                !hasMore && styles.paginationBtnTextDisabled,
              ]}
            >
              Próxima
            </Text>
          )}
          <ChevronRight
            size={16}
            color={
              !hasMore ? DarkPalette.textDisabled : DarkPalette.textPrimary
            }
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Breadcrumb Bar */}
      <View style={styles.breadcrumbBar}>
        <View style={styles.breadcrumbInner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <ArrowLeft size={16} color="var(--primary-color)" />
            <Text style={styles.backBtnText}>Voltar às galerias</Text>
          </TouchableOpacity>

          {isFaceSearchActive && (
            <View style={styles.activeFaceBanner}>
              <Sparkles size={14} color="var(--primary-color)" />
              <Text style={styles.activeFaceText}>
                Fotos encontradas por reconhecimento facial (
                {filteredPhotos.length})
              </Text>
              <TouchableOpacity
                onPress={clearFaceSearch}
                style={styles.clearFaceTag}
              >
                <X size={12} color="#FFFFFF" />
                <Text style={styles.clearFaceTagText}>Ver todas</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile && styles.scrollContentMobile,
        ]}
      >
        <View style={styles.mainContainer}>
          {/* 1. Header Centered Title */}
          <Text style={styles.eventHeaderTitle}>
            {eventData?.name?.toUpperCase() || 'GALERIA DE EVENTO'}
          </Text>

          {/* 2. Metadata 3 Columns */}
          <View
            style={[
              styles.metaSection,
              isMobile && styles.metaSectionMobile,
            ]}
          >
            {/* Left: Photos & Share */}
            <View style={styles.metaColumnLeft}>
              <View style={styles.metaItem}>
                <Camera size={16} color="#64748B" />
                <Text style={styles.metaText}>{photoCount} fotos</Text>
              </View>
              <TouchableOpacity
                style={styles.metaItem}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <Share2 size={16} color="#64748B" />
                <Text style={styles.metaText}>
                  {linkCopied ? 'Link copiado!' : 'Compartilhar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Center: Date & City */}
            <View style={styles.metaColumnCenter}>
              <View style={styles.metaItem}>
                <CalendarDays size={16} color="#64748B" />
                <Text style={styles.metaText}>
                  {(eventData?.event_date || eventData?.date || eventData?.rawEvent?.event_date)
                    ? formatDateFull(eventData.event_date || eventData.date || eventData.rawEvent?.event_date)
                    : 'Data do evento'}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={16} color="#64748B" />
                <Text style={styles.metaText}>
                  {eventData?.city && eventData?.state
                    ? `${eventData.city}, ${eventData.state}`
                    : eventData?.city || 'Local a confirmar'}
                </Text>
              </View>
            </View>

            {/* Right: Photographer Profile */}
            <View style={styles.metaColumnRight}>
              <Image
                source={{
                  uri:
                    eventData?.owner?.image ||
                    'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg?tr=w-200,h-200,c-at_max',
                }}
                style={styles.metaPhotographerAvatar}
                resizeMode="cover"
              />
              <View style={styles.metaPhotographerInfo}>
                <Text style={styles.metaPhotographerName}>
                  {eventData?.owner?.name || 'Rafael Publicado'}
                </Text>
                {eventData?.owner?.email && (
                  <Text style={styles.metaPhotographerEmail}>
                    {eventData.owner.email}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.metaPhotographerPhoneRow}
                  onPress={() =>
                    openWhatsApp(eventData?.owner?.phone || '5599991297693')
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.metaPhotographerPhone}>
                    {formatPhone(eventData?.owner?.phone || '5599991297693')}
                  </Text>
                  <MessageCircle size={13} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. Facial Recognition Spotlight Card */}
          <View
            style={[
              styles.spotlightCard,
              isMobile && styles.spotlightCardMobile,
            ]}
          >
            <View style={styles.spotlightLeft}>
              <View style={styles.spotlightIconBox}>
                <ScanFace size={26} color="var(--primary-color)" strokeWidth={2} />
              </View>
              <View style={styles.spotlightTextBox}>
                <Text style={styles.spotlightTitle}>
                  Localize suas fotos com facilidade
                </Text>
                <Text style={styles.spotlightSubtitle}>
                  Envie uma selfie ou uma foto para usar nosso reconhecimento
                  facial.
                </Text>
              </View>
            </View>

            {isFaceSearchActive ? (
              <TouchableOpacity
                style={styles.btnClearFaceGreen}
                onPress={clearFaceSearch}
                activeOpacity={0.88}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={styles.btnFaceSearchGreenText}>
                  Ver todas as fotos
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.btnFaceSearchGreen}
                onPress={() => setIsCameraVisible(true)}
                activeOpacity={0.88}
              >
                {isSearchingFace ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnFaceSearchGreenText}>
                    Localizar foto
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {faceSearchError ? (
            <View style={styles.faceErrorBox}>
              <CircleAlert size={16} color="#EF4444" />
              <Text style={styles.faceErrorText}>{faceSearchError}</Text>
            </View>
          ) : null}

          {/* 4. View Mode Toggles (Padrão / Rápida) */}
          <View style={styles.viewModeRow}>
            <View style={styles.viewModePill}>
              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === 'padrao' && styles.viewModeBtnActive,
                ]}
                onPress={() => setViewMode('padrao')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'padrao' && styles.viewModeTextActive,
                  ]}
                >
                  Padrão
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewModeBtn,
                  viewMode === 'rapida' && styles.viewModeBtnActive,
                ]}
                onPress={() => setViewMode('rapida')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === 'rapida' && styles.viewModeTextActive,
                  ]}
                >
                  Rápida
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Media Filter Tabs (Ver fotos / Ver vídeos) */}
          <View style={[styles.tabsRow, isMobile && styles.tabsRowMobile]}>
            <TouchableOpacity
              style={[
                styles.tabCard,
                mediaFilter === 'photo' && styles.tabCardActivePhoto,
              ]}
              onPress={() => handleMediaFilterChange('photo')}
              disabled={loading}
              activeOpacity={0.88}
            >
              <View style={styles.tabCardLeft}>
                <View
                  style={[
                    styles.tabIconCircle,
                    mediaFilter === 'photo' &&
                      styles.tabIconCircleActivePhoto,
                  ]}
                >
                  <Camera
                    size={18}
                    color={mediaFilter === 'photo' ? '#FFFFFF' : '#64748B'}
                  />
                </View>
                <Text
                  style={[
                    styles.tabCardLabel,
                    mediaFilter === 'photo' && styles.tabCardLabelActive,
                  ]}
                >
                  Ver fotos
                </Text>
              </View>
              <View
                style={[
                  styles.tabCardBadge,
                  mediaFilter === 'photo' &&
                    styles.tabCardBadgeActivePhoto,
                ]}
              >
                <Text
                  style={[
                    styles.tabCardBadgeText,
                    mediaFilter === 'photo' &&
                      styles.tabCardBadgeTextActivePhoto,
                  ]}
                >
                  {photoCount}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabCard,
                mediaFilter === 'video' && styles.tabCardActiveVideo,
              ]}
              onPress={() => handleMediaFilterChange('video')}
              disabled={loading}
              activeOpacity={0.88}
            >
              <View style={styles.tabCardLeft}>
                <View
                  style={[
                    styles.tabIconCircle,
                    mediaFilter === 'video' &&
                      styles.tabIconCircleActiveVideo,
                  ]}
                >
                  <Video
                    size={18}
                    color={mediaFilter === 'video' ? '#FFFFFF' : '#64748B'}
                  />
                </View>
                <Text
                  style={[
                    styles.tabCardLabel,
                    mediaFilter === 'video' && styles.tabCardLabelActive,
                  ]}
                >
                  Ver vídeos
                </Text>
              </View>
              <View
                style={[
                  styles.tabCardBadge,
                  mediaFilter === 'video' &&
                    styles.tabCardBadgeActiveVideo,
                ]}
              >
                <Text
                  style={[
                    styles.tabCardBadgeText,
                    mediaFilter === 'video' &&
                      styles.tabCardBadgeTextActiveVideo,
                  ]}
                >
                  {videoCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 6. Photo Grid or Private Lock Message */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="var(--primary-color)" />
              <Text style={styles.loadingText}>
                Carregando fotos da galeria...
              </Text>
            </View>
          ) : isPrivateEvent && !isFaceSearchActive ? (
            <View style={styles.privateEventBox}>
              <View style={styles.privateLockCircle}>
                <Lock size={32} color="var(--primary-color)" />
              </View>
              <Text style={styles.privateEventTitle}>
                Galeria com Privacidade Ativada
              </Text>
              <Text style={styles.privateEventText}>
                As fotos deste evento são privadas para segurança e privacidade dos participantes. Para visualizar e comprar suas fotos, utilize o reconhecimento facial acima.
              </Text>
              <TouchableOpacity
                style={styles.btnPrivateAction}
                onPress={() => setIsCameraVisible(true)}
                activeOpacity={0.88}
              >
                <ScanFace size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.btnPrivateActionText}>
                  Localizar Minhas Fotos
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredPhotos.length === 0 ? (
            <View style={styles.emptyBox}>
              <Camera size={42} color="#94A3B8" />
              <Text style={styles.emptyText}>
                {mediaFilter === 'video'
                  ? 'Nenhum vídeo disponível nesta galeria.'
                  : 'Nenhuma foto encontrada para esta busca.'}
              </Text>
            </View>
          ) : (
            <>
              <View
                nativeID="galeria-fotos-grid"
                style={[
                  styles.photoGrid,
                  isMobile && styles.photoGridMobile,
                  viewMode === 'rapida' && styles.photoGridCompact,
                  loadingMore && { opacity: 0.6 },
                ]}
              >
                {filteredPhotos.map((photo, index) =>
                  renderPhoto({ item: photo, index })
                )}
              </View>
              {renderPagination()}
            </>
          )}
        </View>
      </ScrollView>

      {selectedMediaIndex !== null && (
        <MediaViewer
          photos={filteredPhotos}
          currentIndex={selectedMediaIndex}
          onNavigate={setSelectedMediaIndex}
          onClose={() => setSelectedMediaIndex(null)}
        />
      )}

      <CameraCapture
        visible={isCameraVisible}
        onClose={() => setIsCameraVisible(false)}
        onCapture={handleFaceSearch}
      />

      <CartFloatingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Breadcrumb
  breadcrumbBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: Layout.desktopPadding,
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  breadcrumbInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    color: 'var(--primary-color)',
    fontSize: 13,
    fontWeight: FontWeights.bold,
  },
  activeFaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeFaceText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: FontWeights.semibold,
  },
  clearFaceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'var(--primary-color)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 4,
  },
  clearFaceTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: FontWeights.bold,
  },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 1240,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 80,
  },
  scrollContentMobile: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 60,
  },
  mainContainer: {
    width: '100%',
  },

  // 1. Centered Header Title
  eventHeaderTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  // 2. Metadata Section (3 columns)
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 16,
  },
  metaSectionMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 14,
  },
  metaColumnLeft: {
    gap: 8,
  },
  metaColumnCenter: {
    gap: 8,
  },
  metaColumnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  metaPhotographerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  metaPhotographerInfo: {
    gap: 2,
  },
  metaPhotographerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaPhotographerEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  metaPhotographerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaPhotographerPhone: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },

  // 3. Facial Recognition Spotlight Card
  spotlightCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
    boxShadow: '0 2px 10px rgba(0, 107, 214, 0.04)',
  },
  spotlightCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  spotlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  spotlightIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightTextBox: {
    flex: 1,
  },
  spotlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  spotlightSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  btnFaceSearchGreen: {
    backgroundColor: 'var(--primary-color)',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 107, 214, 0.25)',
  },
  btnClearFaceGreen: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnFaceSearchGreenText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  faceErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  faceErrorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },

  // 4. View Mode Toggles
  viewModeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  viewModePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    padding: 3,
  },
  viewModeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  viewModeBtnActive: {
    backgroundColor: '#0F172A',
  },
  viewModeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // 5. Tabs Row
  tabsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  tabsRowMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  tabCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabCardActivePhoto: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabCardActiveVideo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  tabCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconCircleActivePhoto: {
    backgroundColor: 'var(--primary-color)',
  },
  tabIconCircleActiveVideo: {
    backgroundColor: 'var(--primary-color)',
  },
  tabCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabCardLabelActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
  tabCardBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
  },
  tabCardBadgeActivePhoto: {
    backgroundColor: '#DBEAFE',
  },
  tabCardBadgeActiveVideo: {
    backgroundColor: '#DBEAFE',
  },
  tabCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCardBadgeTextActivePhoto: {
    color: '#1D4ED8',
  },
  tabCardBadgeTextActiveVideo: {
    color: '#1D4ED8',
  },

  // 6. Photo Grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  photoGridMobile: {
    gap: 8,
  },
  photoGridCompact: {
    gap: 10,
  },
  photoCard: {
    width: 'calc(25% - 12px)',
    aspectRatio: 0.68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  photoCardMobile: {
    width: 'calc(50% - 4px)',
    aspectRatio: 0.72,
    borderRadius: 8,
  },
  photoCardCompact: {
    width: 'calc(20% - 8px)',
    aspectRatio: 0.68,
  },
  photoCardImg: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: Radius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFooterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoFooterAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  photoFooterAvatarFallback: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFooterName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },

  // Desktop Hover Overlay
  hoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  btnHoverVer: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 26,
    borderRadius: 6,
    minWidth: 96,
    alignItems: 'center',
  },
  btnHoverVerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnHoverAdd: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 6,
    minWidth: 96,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  },
  btnHoverAddActive: {
    backgroundColor: 'var(--primary-color)',
    boxShadow: '0 2px 8px rgba(0, 107, 214, 0.3)',
  },
  btnHoverAddText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Mobile Quick Cart Button
  cartBtnMobile: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    zIndex: 5,
  },
  cartBtnMobileActive: {
    backgroundColor: 'var(--primary-color)',
    borderColor: 'var(--primary-color)',
  },

  loadingBox: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  privateEventBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 16,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  privateLockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  privateEventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  privateEventText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 520,
  },
  btnPrivateAction: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 8,
    boxShadow: '0 4px 12px rgba(0, 107, 214, 0.25)',
  },
  btnPrivateActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyBox: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.six,
    marginTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  paginationBtnDisabled: {
    opacity: 0.35,
  },
  paginationBtnText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: FontWeights.semibold,
  },
  paginationBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageIndicator: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: FontWeights.medium,
  },
});
