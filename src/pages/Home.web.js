// src/pages/Home.web.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  Camera,
  LayoutGrid,
  List,
  ScanFace,
  Lock,
  DownloadCloud,
  ArrowRight,
  Play,
  ShoppingCart,
  Download,
  Mail,
  MessageCircle,
  X,
  Sparkles,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import BrandLogo from '../components/BrandLogo';
import { fetchMultiPhotographerEvents } from '../utils/api';
import { mockEventsData } from '../data/mockEvents';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Radius, Spacing, Layout } from '../constants/theme';
import { useAdminConfig } from '../context/AdminConfigContext';

// Inline Vector Icons for Social Media
function InstagramIcon({ size = 18, color = '#475569' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={color} />
    </Svg>
  );
}

function FacebookIcon({ size = 18, color = '#475569' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}

function YoutubeIcon({ size = 18, color = '#475569' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <Path d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z" fill={color} />
    </Svg>
  );
}

export default function Home() {
  const navigation = useNavigation();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const { config } = useAdminConfig();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [emailInput, setEmailInput] = useState('');
  const [emailSubscribed, setEmailSubscribed] = useState(false);

  const activePhotographers = (config.photographers || []).filter((p) => p.active !== false);

  useEffect(() => {
    loadEventsData();
  }, [config.photographers]);

  const loadEventsData = async () => {
    setLoading(true);
    let hasLoadedApiEvents = false;

    try {
      // Busca os eventos para todos os fotógrafos ativos com streaming progressivo
      const allRes = await fetchMultiPhotographerEvents(
        activePhotographers,
        {},
        {},
        (intermediateResults) => {
          if (intermediateResults && intermediateResults.length > 0) {
            hasLoadedApiEvents = true;
            setEvents(intermediateResults);
            setLoading(false); // Libera a tela imediatamente assim que a página 1 chega!
          }
        }
      );
      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData.results && allData.results.length > 0) {
          hasLoadedApiEvents = true;
          setEvents(allData.results);
        }
      }
    } catch (error) {
      console.warn('Não foi possível carregar todos os eventos multi-fotógrafo:', error);
      if (!hasLoadedApiEvents) {
        setEvents(mockEventsData.results);
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId) => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = () => {
    const num = config.branding?.whatsappNumber || '5599991297693';
    const msg = encodeURIComponent(config.branding?.whatsappMessage || 'Olá, gostaria de tirar uma dúvida sobre as fotos.');
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${msg}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleSubscribe = () => {
    if (emailInput.includes('@')) {
      setEmailSubscribed(true);
      setTimeout(() => setEmailSubscribed(false), 4000);
      setEmailInput('');
    }
  };

  const formatDateBadge = (dateString) => {
    if (!dateString) return null;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return null;
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const month = months[d.getMonth()];
      return `${day} ${month}`;
    } catch {
      return null;
    }
  };

  // Filtra dinamicamente os eventos pelo nome ou cidade
  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (ev.name || '').toLowerCase().includes(q);
    const cityMatch = (ev.city || '').toLowerCase().includes(q);
    return nameMatch || cityMatch;
  });

  // Renderiza dinamicamente os eventos consolidados
  const displayedGalleries = filteredEvents.map((ev, idx) => ({
    id: ev.id,
    tag: String(idx + 1).padStart(2, '0'),
    dateBadge: formatDateBadge(ev.event_date || ev.date),
    title: ev.name,
    location: ev.city || 'Maranhão - MA',
    photosCount: 'Ver galeria',
    image: ev.image || 'https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg?tr=w-401,h-401,c-at_max',
    rawEvent: ev,
  }));

  // Cores dinâmicas do tema White-Label
  const primaryColor = config.theme?.primaryColor || 'var(--primary-color)';
  const primaryDeep = config.theme?.primaryDeep || "var(--primary-deep)";

  return (
    <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
      {/* ═════════════════════════════════════════════════════════════════════
          1. HERO SECTION (Light Theme & White-Label)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[s.hero, isMobile && s.heroMobile]}>
        <View style={[s.heroInner, isMobile && s.heroInnerMobile]}>
          {/* Left 45% Content */}
          <View style={[s.heroLeft, isMobile && s.heroLeftMobile]}>
            <Text style={[s.heroTitle, isMobile && s.heroTitleMobile]}>
              {config.branding?.sloganHero || 'Sejam bem vindos. Rafael Publicado Audiovisual – Você primeiro aqui!'}
            </Text>

            <Text style={[s.heroSubtitle, isMobile && s.heroSubtitleMobile]}>
              {config.branding?.subtitleHero ||
                'Fotos profissionais dos melhores eventos esportivos e momentos especiais. Encontre-se, reviva e compartilhe.'}
            </Text>

      



            {/* Fotógrafos Ativos na Vitrine */}
            {activePhotographers.length > 1 && (
              <View style={s.multiPhotogBadgeRow}>
                <Text style={s.multiPhotogLabel}>Cobertura Oficial por:</Text>
                <View style={s.photogAvatarsRow}>
                  {activePhotographers.map((p) => (
                    <View key={p.id} style={s.photogAvatarItem}>
                      <Image source={{ uri: p.avatar || 'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg' }} style={s.photogMiniAvatar} />
                      <Text style={s.photogMiniName} numberOfLines={1}>{p.name.split(' ')[0]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right 55% Hero Visual */}
          {!isMobile && (
            <View style={s.heroRight}>
              {/* Concentric Graphic Rings */}
              <View style={[s.blueRingGraphic, { borderColor: `${primaryColor}25` }]} />
              <View style={[s.blueGlowAura, { backgroundColor: `${primaryColor}15` }]} />

              {/* Main Visual */}
              <View style={s.heroMainImageWrapper}>
                <Image
                  source={{
                    uri:
                      config.banners?.heroMainImage ||
                      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&auto=format&fit=crop&q=85',
                  }}
                  style={s.heroAthleteImage}
                  resizeMode="cover"
                />

                {/* Circular Badge: FOTOS PROFISSIONAIS */}
                <View style={s.badgeFotosProfissionais}>
                  <Camera size={20} color={primaryColor} />
                  <Text style={s.badgeFotosText}>FOTOS{'\n'}PROFISSIONAIS</Text>
                </View>
              </View>

              {/* 4 Bottom Action Sport Thumbnails */}
              <View style={s.thumbnailsRow}>
                {(
                  config.banners?.heroThumbnails || [
                    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=260&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=260&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=260&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=260&auto=format&fit=crop&q=80',
                  ]
                ).map((thumbUrl, idx) => (
                  <View key={idx} style={s.thumbCard}>
                    <Image
                      source={{ uri: thumbUrl }}
                      style={s.thumbImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </View>

{/* ═════════════════════════════════════════════════════════════════════
          0. BANNER PROMOCIONAL CONFIGURÁVEL (Redirecionamento para Evento)
      ═════════════════════════════════════════════════════════════════════ */}
      {config.banners?.enableHeroPromoBanner && config.banners?.promoBanners?.map((banner, i) => (
        <View key={banner.id || i} style={[s.promoBannerWrapper, { marginTop: i === 0 ? 0 : -10 }]}>
          <TouchableOpacity
            style={[s.promoBannerCard, { backgroundColor: primaryDeep, overflow: 'hidden' }]}
            onPress={() => {
              if (banner.link) {
                 if (banner.link.startsWith('http')) {
                    if (typeof window !== 'undefined') window.open(banner.link, '_blank');
                    else Linking.openURL(banner.link);
                 } else {
                    navigation.navigate('EventDetails', { id: banner.link });
                 }
              } else {
                scrollToSection('galerias-destaque');
              }
            }}
            activeOpacity={0.9}
          >
            {banner.imageUrl ? (
              <>
                <Image source={{ uri: banner.imageUrl }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14 }} />
              </>
            ) : null}
            <View style={s.promoBannerContent}>
              <View style={s.promoBannerLeft}>
                <View style={s.promoSparkleBadge}>
                  <Sparkles size={14} color="#F59E0B" />
                  <Text style={s.promoSparkleText}>DESTAQUE ESPECIAL</Text>
                </View>
                <Text style={[s.promoBannerTitle, banner.imageUrl && { color: '#FFF' }]}>{banner.title}</Text>
                {banner.subtitle ? (
                  <Text style={[s.promoBannerSubtitle, banner.imageUrl && { color: '#E2E8F0' }]}>{banner.subtitle}</Text>
                ) : null}
              </View>

              <View style={[s.btnPromoAction, { backgroundColor: primaryColor }]}>
                <Text style={s.btnPromoActionText}>
                  {banner.buttonText || 'Acessar Galeria'}
                </Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ))}

      {/* ═════════════════════════════════════════════════════════════════════
          2. COMO FUNCIONA (Compact & Modern)
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="como-funciona" style={[s.howSection, isMobile && s.howSectionMobile]}>
        <View style={s.howInner}>
          <Text style={[s.howEyebrow, { color: primaryColor }]}>COMO FUNCIONA</Text>
          <Text style={[s.howTitle, isMobile && s.howTitleMobile]}>
            Simples, <Text style={{ color: primaryColor }}>rápido e seguro</Text>
          </Text>

          
          {/* 4 Step Columns / Horizontal on Mobile */}
          <View style={[s.howStepsRow, isMobile && s.howStepsRowMobile]}>

            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={[s.howStepCircle, { backgroundColor: `${primaryColor}15` }]}>
                <Search size={isMobile ? 16 : 18} color={primaryColor} />
              </View>
              <Text style={[s.howStepNum, isMobile && s.howStepNumMobile]}>01</Text>
              <View style={isMobile && s.howStepTextGroupMobile}>
                <Text style={[s.howStepName, isMobile && s.howStepNameMobile]}>{config.howItWorks?.step1Title || 'Encontre sua galeria'}</Text>
                <Text style={[s.howStepDesc, isMobile && s.howStepDescMobile]}>
                  {config.howItWorks?.step1Desc || 'Procure pelo evento e acesse a galeria.'}
                </Text>
              </View>
            </View>

            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={[s.howStepCircle, { backgroundColor: `${primaryColor}15` }]}>
                <ScanFace size={isMobile ? 16 : 18} color={primaryColor} />
              </View>
              <Text style={[s.howStepNum, isMobile && s.howStepNumMobile]}>02</Text>
              <View style={isMobile && s.howStepTextGroupMobile}>
                <Text style={[s.howStepName, isMobile && s.howStepNameMobile]}>{config.howItWorks?.step2Title || 'Achar suas fotos'}</Text>
                <Text style={[s.howStepDesc, isMobile && s.howStepDescMobile]}>
                  {config.howItWorks?.step2Desc || 'Use o reconhecimento facial rápido.'}
                </Text>
              </View>
            </View>

            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={[s.howStepCircle, { backgroundColor: `${primaryColor}15` }]}>
                <ShoppingCart size={isMobile ? 16 : 18} color={primaryColor} />
              </View>
              <Text style={[s.howStepNum, isMobile && s.howStepNumMobile]}>03</Text>
              <View style={isMobile && s.howStepTextGroupMobile}>
                <Text style={[s.howStepName, isMobile && s.howStepNameMobile]}>{config.howItWorks?.step3Title || 'Escolha e compre'}</Text>
                <Text style={[s.howStepDesc, isMobile && s.howStepDescMobile]}>
                  {config.howItWorks?.step3Desc || 'Selecione as fotos e pague via PIX ou Cartão.'}
                </Text>
              </View>
            </View>

            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={[s.howStepCircle, { backgroundColor: `${primaryColor}15` }]}>
                <Download size={isMobile ? 16 : 18} color={primaryColor} />
              </View>
              <Text style={[s.howStepNum, isMobile && s.howStepNumMobile]}>04</Text>
              <View style={isMobile && s.howStepTextGroupMobile}>
                <Text style={[s.howStepName, isMobile && s.howStepNameMobile]}>{config.howItWorks?.step4Title || 'Baixe e compartilhe'}</Text>
                <Text style={[s.howStepDesc, isMobile && s.howStepDescMobile]}>
                  {config.howItWorks?.step4Desc || 'Após o pagamento receba seus arquivos direto no Whatsapp.'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          3. GALERIAS EM DESTAQUE (Mescladas e Deduplicadas)
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="galerias-destaque" style={s.galleriesSection}>
        <View style={s.galleriesInner}>
          {/* Title with lines */}
          <View style={s.sectionTitleHeader}>
            <View style={s.titleLine} />
            <Text style={s.sectionHeaderTitle}>
              GALERIAS <Text style={{ color: primaryColor }}>EM DESTAQUE</Text>
            </Text>
            <View style={s.titleLine} />
          </View>

          {/* Event Search Bar */}
          <View style={[s.searchBarContainer, isMobile && s.searchBarContainerMobile]}>
            <View style={s.searchBarWrapper}>
              <Search size={18} color={primaryColor} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar evento por nome ou cidade..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessible={true}
                accessibilityLabel="Buscar eventos por nome ou cidade"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={s.searchClearBtn}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar busca de eventos"
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Results Counter */}
            <View style={s.searchMetaRow}>
              <Text style={s.searchResultCount}>
                {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
                {searchQuery.trim() ? ` para "${searchQuery}"` : ''}
              </Text>
              {!isMobile && (
                <View style={s.viewToggleGroup}>
                  <TouchableOpacity 
                    style={[s.viewToggleBtn, viewMode === 'grid' && s.viewToggleBtnActive]} 
                    onPress={() => setViewMode('grid')}
                    activeOpacity={0.8}
                  >
                    <LayoutGrid size={16} color={viewMode === 'grid' ? primaryColor : '#94A3B8'} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.viewToggleBtn, viewMode === 'list' && s.viewToggleBtnActive]} 
                    onPress={() => setViewMode('list')}
                    activeOpacity={0.8}
                  >
                    <List size={16} color={viewMode === 'list' ? primaryColor : '#94A3B8'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Loading Indicator */}
          {loading && (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
              <Text style={s.loadingText}>Carregando galerias oficiais...</Text>
            </View>
          )}

          {/* Empty State when search returns 0 results */}
          {!loading && displayedGalleries.length === 0 ? (
            <View style={s.emptyStateContainer}>
              <View style={s.emptyIconCircle}>
                <Search size={28} color="#94A3B8" />
              </View>
              <Text style={s.emptyTitle}>Nenhum evento encontrado</Text>
              <Text style={s.emptySubtitle}>
                Não encontramos nenhum evento correspondente a "{searchQuery}".
              </Text>
              <TouchableOpacity
                style={[s.btnResetSearch, { backgroundColor: primaryColor }]}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.85}
              >
                <Text style={s.btnResetSearchText}>Ver todos os eventos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Cards Grid */
            <View style={[s.cardsGrid, (isMobile || viewMode === 'list') && s.cardsGridList]}>
              {displayedGalleries.map((gal, idx) => (
                <View key={gal.id || idx} style={[s.cardWrapper, (!isMobile && viewMode === 'grid') && s.cardWrapperGrid]}>
                  <TouchableOpacity
                    style={[s.eventCard, (isMobile || viewMode === 'list') && s.eventCardList, isMobile && { height: 120 }]}
                    onPress={() =>
                      navigation.navigate('EventDetails', {
                        id: gal.id,
                        event: gal.rawEvent || events.find((e) => e.id === gal.id) || events[0],
                      })
                    }
                    activeOpacity={0.9}
                  >
                    {/* Card Image */}
                    <View style={[s.cardImageContainer, (isMobile || viewMode === 'list') && s.cardImageContainerList, isMobile && { width: 140 }]}>
                      <Image
                        source={{ uri: gal.image }}
                        style={s.cardImage}
                        resizeMode="cover"
                      />

                      {/* Date Badge */}
                      {gal.dateBadge && (
                        <View style={[s.dateBadge, isMobile && s.dateBadgeMobile]}>
                          <Text style={[s.dateBadgeDay, isMobile && s.dateBadgeDayMobile]}>
                            {gal.dateBadge.split(' ')[0]}
                          </Text>
                          <Text style={[s.dateBadgeMonth, isMobile && s.dateBadgeMonthMobile]}>
                            {gal.dateBadge.split(' ')[1]}
                          </Text>
                        </View>
                      )}

                      {/* Tag Number pill */}
                      <View style={[s.tagPill, isMobile && s.tagPillMobile]}>
                        <Text style={[s.tagPillText, isMobile && s.tagPillTextMobile]}>{gal.tag}</Text>
                      </View>
                    </View>

                    {/* Card Details */}
                    <View style={[s.cardBody, isMobile && s.cardBodyMobile]}>
                      <Text style={[s.cardTitle, isMobile && s.cardTitleMobile]} numberOfLines={2}>
                        {gal.title}
                      </Text>
                      <Text style={[s.cardLocation, isMobile && s.cardLocationMobile]} numberOfLines={1}>
                        {gal.location}
                      </Text>

                      <View style={[s.cardFooterRow, isMobile && s.cardFooterRowMobile]}>
                        <View style={s.photosCountRow}>
                          <Camera size={isMobile ? 12 : 14} color="#64748B" />
                          <Text style={[s.photosCountText, isMobile && s.photosCountTextMobile]}>{gal.photosCount}</Text>
                        </View>

                        <View style={[s.btnVerGaleria, { backgroundColor: primaryColor }, isMobile && s.btnVerGaleriaMobile]}>
                          <Text style={[s.btnVerGaleriaText, isMobile && s.btnVerGaleriaTextMobile]}>Ver galeria</Text>
                          {isMobile && <ArrowRight size={11} color="#FFFFFF" />}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          4. PERGUNTAS FREQUENTES (FAQ)
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="duvidas" style={s.faqSection}>
        <View style={s.faqInner}>
          <Text style={[s.faqEyebrow, { color: primaryColor }]}>DÚVIDAS FREQUENTES</Text>
          <Text style={s.faqTitle}>Perguntas Frequentes</Text>

          <View style={s.faqList}>
            {[
              {
                q: 'Como encontro minhas fotos no evento?',
                a: 'Basta entrar na galeria do seu evento e clicar em "Localizar Minhas Fotos". Faça o upload de uma selfie nítida para nossa inteligência artificial buscar seu rosto em segundos.',
              },
              {
                q: 'Como recebo as fotos após o pagamento?',
                a: 'Após a confirmação instantânea do PIX ou aprovação do Cartão, suas fotos em alta resolução serão enviadas diretamente no seu WhatsApp e ficam disponíveis para download imediato.',
              },
              {
                q: 'As fotos possuem marca d\'água?',
                a: 'Não! As fotos compradas são entregues limpas, em alta resolução original e sem qualquer marca d\'água.',
              },
            ].map((faq, i) => (
              <View key={i} style={s.faqCard}>
                <Text style={s.faqQuestion}>{faq.q}</Text>
                <Text style={s.faqAnswer}>{faq.a}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          5. NEWSLETTER
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={s.newsletterSection}>
        <View style={s.newsletterInner}>
          <View style={[s.newsletterCard, { backgroundColor: primaryColor }, isMobile && s.newsletterCardMobile]}>
            <View style={[s.newsletterLeft, isMobile && s.newsletterLeftMobile]}>
              <View style={s.newsletterMailCircle}>
                <Mail size={22} color={primaryColor} />
              </View>
              <View style={s.newsletterTextGroup}>
                <Text style={s.newsletterTitle}>Fique por dentro dos próximos eventos</Text>
                <Text style={s.newsletterSubtitle}>Receba em primeira mão quando as fotos forem publicadas.</Text>
              </View>
            </View>

            <View style={[s.newsletterForm, isMobile && s.newsletterFormMobile]}>
              <TextInput
                style={[s.newsletterInput, isMobile && s.newsletterInputMobile]}
                placeholder="Seu melhor e-mail..."
                placeholderTextColor="#94A3B8"
                value={emailInput}
                onChangeText={setEmailInput}
              />
              <TouchableOpacity
                style={[s.btnSubscribe, isMobile && s.btnSubscribeMobile]}
                onPress={handleSubscribe}
                activeOpacity={0.88}
              >
                <Text style={s.btnSubscribeText}>{emailSubscribed ? 'Inscrito ✓' : 'Inscrever-se'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          6. FOOTER (Light Theme)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[s.footer, isMobile && s.footerMobile]}>
        <View style={s.footerInner}>
          <View style={[s.footerGrid, isMobile && s.footerGridMobile]}>
            <View style={s.footerColBrand}>
              <BrandLogo size="md" />
              <Text style={s.footerBrandDesc}>
                {config.branding?.subtitleHero ||
                  'Especialista em fotografia esportiva, eventos e momentos únicos. Eternizando cada conquista.'}
              </Text>
            </View>

            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>NAVEGAÇÃO</Text>
              <TouchableOpacity style={s.footerLinkTouchable} onPress={() => scrollToSection('como-funciona')}>
                <Text style={s.footerLink}>Como funciona</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerLinkTouchable} onPress={() => scrollToSection('galerias-destaque')}>
                <Text style={s.footerLink}>Galerias</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerLinkTouchable} onPress={() => scrollToSection('duvidas')}>
                <Text style={s.footerLink}>Dúvidas frequentes</Text>
              </TouchableOpacity>
            </View>

            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>PAINEL & ATENDIMENTO</Text>
              <TouchableOpacity style={s.footerLinkTouchable} onPress={openWhatsApp}>
                <Text style={s.footerLink}>Suporte via WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerLinkTouchable} onPress={() => navigation.navigate('MinhasCompras')}>
                <Text style={s.footerLink}>Minhas Compras</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.footerLinkTouchable, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                onPress={() => navigation.navigate('Admin')}
              >
                <ShieldCheck size={14} color={primaryColor} />
                <Text style={[s.footerLink, { color: primaryColor, fontWeight: '700' }]}>Painel Administrativo</Text>
              </TouchableOpacity>
            </View>

            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>REDES SOCIAIS</Text>
              <View style={s.socialIconsRow}>
                <TouchableOpacity
                  style={s.socialIconBtn}
                  onPress={() => Platform.OS === 'web' && window.open(config.branding?.instagramUrl || 'https://instagram.com/rafaelpublicado', '_blank')}
                >
                  <InstagramIcon size={18} color="#0F172A" />
                </TouchableOpacity>
                <TouchableOpacity style={s.socialIconBtn} onPress={openWhatsApp}>
                  <MessageCircle size={18} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.footerBottom}>
            <Text style={s.footerCopyrightText}>
              © {new Date().getFullYear()} {config.branding?.siteName || 'Rafael Publicado Audiovisual'}. Todos os direitos reservados.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── ESTILOS DA HOME ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pageContent: {
    paddingBottom: 0,
  },

  // Promo Banner
  promoBannerWrapper: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Layout.desktopPadding,
    marginTop: -20,
    marginBottom: 40,
    zIndex: 10,
  },
  promoBannerCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 120,
    justifyContent: 'center',
  },
  promoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  promoBannerLeft: {
    flex: 1,
    minWidth: 260,
    gap: 4,
  },
  promoSparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoSparkleText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoBannerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  promoBannerSubtitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Hero Section
  hero: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 64,
    paddingHorizontal: Layout.desktopPadding,
  },
  heroMobile: {
    paddingVertical: 32,
    paddingHorizontal: Spacing.four,
  },
  heroInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
  },
  heroInnerMobile: {
    flexDirection: 'column',
    gap: 24,
  },
  heroLeft: {
    flex: 1,
    maxWidth: 540,
    gap: 16,
  },
  heroLeftMobile: {
    maxWidth: '100%',
    textAlign: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  heroTitleMobile: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  heroSubtitleMobile: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  multiPhotogBadgeRow: {
    marginTop: 8,
    gap: 6,
  },
  multiPhotogLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photogAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  photogAvatarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photogMiniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  photogMiniName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Hero Right Visual
  heroRight: {
    flex: 1,
    maxWidth: 520,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blueRingGraphic: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    borderWidth: 2,
    zIndex: 0,
  },
  blueGlowAura: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    zIndex: 0,
    filter: 'blur(40px)',
  },
  heroMainImageWrapper: {
    width: 380,
    height: 380,
    borderRadius: 190,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: '#FFFFFF',
    boxShadow: '0 12px 36px rgba(0, 107, 214, 0.2)',
    zIndex: 1,
    position: 'relative',
  },
  heroAthleteImage: {
    width: '100%',
    height: '100%',
  },
  badgeFotosProfissionais: {
    position: 'absolute',
    bottom: 16,
    right: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
  },
  badgeFotosText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 12,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    zIndex: 2,
  },
  thumbCard: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  // Como Funciona
  howSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 56,
    paddingHorizontal: Layout.desktopPadding,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  howSectionMobile: {
    paddingVertical: 32,
    paddingHorizontal: Spacing.four,
  },
  howInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  howEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  howTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 36,
  },
  howTitleMobile: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  howStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  howStepsRowMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  howStepItem: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
    gap: 6,
  },
  howStepItemMobile: {
    flexDirection: 'row',
    textAlign: 'left',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  howStepTextGroupMobile: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  howStepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  howStepNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  howStepName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  howStepNameMobile: {
    fontSize: 13,
  },
  howStepDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  howStepDescMobile: {
    textAlign: 'left',
    fontSize: 11,
    lineHeight: 14,
  },
  howStepNumMobile: {
    fontSize: 13,
  },

  // Galerias em Destaque
  galleriesSection: {
    paddingVertical: 56,
    paddingHorizontal: Layout.desktopPadding,
  },
  galleriesInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  titleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  searchBarContainer: {
    marginBottom: 28,
    alignItems: 'center',
  },
  searchBarContainerMobile: {
    width: '100%',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  searchClearBtn: {
    padding: 4,
  },
  searchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  searchResultCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  viewToggleBtn: {
    padding: 6,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  btnResetSearch: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnResetSearchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  cardsGridList: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  cardWrapper: {
    width: '100%',
  },
  cardWrapperGrid: {
    minWidth: 260,
    flexBasis: '22%',
    flexGrow: 1,
    marginBottom: 24,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    flexDirection: 'column',
    height: 'auto',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
    transition: 'all 200ms ease',
  },
  eventCardList: {
    flexDirection: 'row',
    height: 140,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    height: 'auto',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImageContainerList: {
    width: 220,
    height: '100%',
    aspectRatio: 'auto',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  dateBadgeMobile: {
    top: 6,
    left: 6,
  },
  dateBadgeDay: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  dateBadgeDayMobile: {
    fontSize: 9,
  },
  dateBadgeMonth: {
    color: '#93C5FD',
    fontSize: 8,
    fontWeight: '700',
  },
  dateBadgeMonthMobile: {
    fontSize: 7,
  },
  tagPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagPillMobile: {
    top: 6,
    right: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  tagPillTextMobile: {
    fontSize: 8,
  },
  cardBody: {
    padding: 14,
    gap: 6,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardBodyMobile: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  cardTitleMobile: {
    fontSize: 12,
    lineHeight: 15,
  },
  cardLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  cardLocationMobile: {
    fontSize: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardFooterRowMobile: {
    marginTop: 2,
  },
  photosCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photosCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  photosCountTextMobile: {
    fontSize: 10,
  },
  btnVerGaleria: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnVerGaleriaMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnVerGaleriaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  btnVerGaleriaTextMobile: {
    fontSize: 10,
  },

  // FAQ
  faqSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 56,
    paddingHorizontal: Layout.desktopPadding,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqInner: {
    maxWidth: Layout.containerLg,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  faqEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 28,
  },
  faqList: {
    width: '100%',
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  // Newsletter
  newsletterSection: {
    paddingVertical: 48,
    paddingHorizontal: Layout.desktopPadding,
  },
  newsletterInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
  },
  newsletterCard: {
    borderRadius: Radius.xl,
    paddingVertical: 28,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 8px 30px rgba(0, 107, 214, 0.25)',
    gap: 24,
  },
  newsletterCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 20,
    gap: 16,
  },
  newsletterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  newsletterLeftMobile: {
    gap: 12,
  },
  newsletterMailCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  newsletterTextGroup: {
    flex: 1,
  },
  newsletterTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  newsletterSubtitle: {
    fontSize: 12,
    color: '#E0F2FE',
    lineHeight: 16,
  },
  newsletterForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 400,
  },
  newsletterFormMobile: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  newsletterInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 44,
    color: '#0F172A',
    fontSize: 13,
    outlineStyle: 'none',
  },
  newsletterInputMobile: {
    width: '100%',
  },
  btnSubscribe: {
    backgroundColor: '#0F172A',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubscribeMobile: {
    width: '100%',
  },
  btnSubscribeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerMobile: {
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: Spacing.four,
  },
  footerInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
    gap: 32,
  },
  footerGridMobile: {
    flexDirection: 'column',
    gap: 24,
    marginBottom: 28,
  },
  footerColBrand: {
    flex: 1.5,
  },
  footerBrandDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 260,
  },
  footerCol: {
    flex: 1,
    gap: 4,
  },
  footerColTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 1,
    marginBottom: 8,
  },
  footerLinkTouchable: {
    paddingVertical: 6,
  },
  footerLink: {
    fontSize: 13,
    color: '#475569',
  },
  socialIconsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  socialIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerBottom: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  footerCopyrightText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
