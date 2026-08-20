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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Search,
  Camera,
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
} from 'lucide-react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import BrandLogo from '../components/BrandLogo';
import { fetchEvents, fetchAllEvents } from '../utils/api';
import { mockEventsData } from '../data/mockEvents';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Radius, Spacing, Layout } from '../constants/theme';

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

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailSubscribed, setEmailSubscribed] = useState(false);

  useEffect(() => {
    loadEventsData();
  }, []);

  const loadEventsData = async () => {
    setLoading(true);
    try {
      // 1. Carrega a página 1 instantaneamente
      const initialRes = await fetchEvents({ page: 1 });
      if (initialRes.ok) {
        const initialData = await initialRes.json();
        if (initialData.results && initialData.results.length > 0) {
          setEvents(initialData.results);
        }
      }

      // 2. Busca todas as páginas da API para carregar todos os 143+ eventos do fotógrafo
      const allRes = await fetchAllEvents();
      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData.results && allData.results.length > 0) {
          setEvents(allData.results);
        }
      }
    } catch {
      if (events.length === 0) {
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
    if (typeof window !== 'undefined') {
      window.open(
        'https://api.whatsapp.com/send?phone=5599991297693&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos.',
        '_blank'
      );
    } else {
      Linking.openURL(
        'https://api.whatsapp.com/send?phone=5599991297693&text=Olá,%20gostaria%20de%20tirar%20uma%20dúvida%20sobre%20as%20fotos.'
      );
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

  // Renderiza dinamicamente os eventos exclusivos de Rafael Publicado
  const displayedGalleries = filteredEvents.map((ev, idx) => ({
    id: ev.id,
    tag: String(idx + 1).padStart(2, '0'),
    dateBadge: formatDateBadge(ev.event_date),
    title: ev.name,
    location: ev.city || 'Maranhão - MA',
    photosCount: 'Ver galeria',
    image: ev.image || 'https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg?tr=w-401,h-401,c-at_max',
    rawEvent: ev,
  }));

  return (
    <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
      {/* ═════════════════════════════════════════════════════════════════════
          1. HERO SECTION (Light Theme)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[s.hero, isMobile && s.heroMobile]}>
        <View style={[s.heroInner, isMobile && s.heroInnerMobile]}>
          {/* Left 45% Content */}
          <View style={[s.heroLeft, isMobile && s.heroLeftMobile]}>
            <Text style={[s.heroTitle, isMobile && s.heroTitleMobile]}>
              {isMobile ? (
                <>
                  Sejam bem vindos.{'\n'}
                  <Text style={s.heroTitleBlue}>Rafael Publicado Audiovisual</Text>
                  {'\n'}– Você primeiro aqui!
                </>
              ) : (
                <>
                  Sejam bem vindos.{'\n'}
                  <Text style={s.heroTitleBlue}>Rafael Publicado{'\n'}Audiovisual</Text>{'\n'}
                  – Você primeiro aqui!
                </>
              )}
            </Text>

            <Text style={[s.heroSubtitle, isMobile && s.heroSubtitleMobile]}>
              Fotos profissionais dos melhores eventos esportivos e momentos especiais.
              Encontre-se, reviva e compartilhe.
            </Text>
          </View>

          {/* Right 55% Hero Visual */}
          {!isMobile && (
            <View style={s.heroRight}>
              {/* Concentric Blue Graphic Rings */}
              <View style={s.blueRingGraphic} />
              <View style={s.blueGlowAura} />

              {/* Main Athlete Visual */}
              <View style={s.heroMainImageWrapper}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&auto=format&fit=crop&q=85',
                  }}
                  style={s.heroAthleteImage}
                  resizeMode="cover"
                />

                {/* Circular Badge: FOTOS PROFISSIONAIS */}
                <View style={s.badgeFotosProfissionais}>
                  <Camera size={20} color="#006BD6" />
                  <Text style={s.badgeFotosText}>FOTOS{'\n'}PROFISSIONAIS</Text>
                </View>
              </View>

              {/* 4 Bottom Action Sport Thumbnails */}
              <View style={s.thumbnailsRow}>
                {[
                  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=260&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=260&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=260&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=260&auto=format&fit=crop&q=80',
                ].map((thumbUrl, idx) => (
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
          2. COMO FUNCIONA (Compact & Modern)
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="como-funciona" style={[s.howSection, isMobile && s.howSectionMobile]}>
        <View style={s.howInner}>
          <Text style={s.howEyebrow}>COMO FUNCIONA</Text>
          <Text style={[s.howTitle, isMobile && s.howTitleMobile]}>
            Simples, <Text style={s.howTitleBlue}>rápido e seguro</Text>
          </Text>

          {/* 4 Step Columns / 2x2 Grid on Mobile */}
          <View style={[s.howStepsRow, isMobile && s.howStepsRowMobile]}>
            {/* Step 1 */}
            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={s.howStepCircle}>
                <Search size={18} color="#006BD6" />
              </View>
              <Text style={s.howStepNum}>01</Text>
              <Text style={s.howStepName}>Encontre sua galeria</Text>
              <Text style={s.howStepDesc}>
                Procure pelo evento e acesse a galeria.
              </Text>
            </View>

            {/* Step 2 */}
            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={s.howStepCircle}>
                <ScanFace size={18} color="#006BD6" />
              </View>
              <Text style={s.howStepNum}>02</Text>
              <Text style={s.howStepName}>Achar suas fotos</Text>
              <Text style={s.howStepDesc}>
                Use o reconhecimento facial rápido.
              </Text>
            </View>

            {/* Step 3 */}
            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={s.howStepCircle}>
                <ShoppingCart size={18} color="#006BD6" />
              </View>
              <Text style={s.howStepNum}>03</Text>
              <Text style={s.howStepName}>Escolha e compre</Text>
              <Text style={s.howStepDesc}>
                Selecione as fotos e pague via PIX ou Cartão.
              </Text>
            </View>

            {/* Step 4 */}
            <View style={[s.howStepItem, isMobile && s.howStepItemMobile]}>
              <View style={s.howStepCircle}>
                <Download size={18} color="#006BD6" />
              </View>
              <Text style={s.howStepNum}>04</Text>
              <Text style={s.howStepName}>Baixe e compartilhe</Text>
              <Text style={s.howStepDesc}>
                Após o pagamento receba seus arquivos direto no Whatsapp.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          3. GALERIAS EM DESTAQUE
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="galerias-destaque" style={s.galleriesSection}>
        <View style={s.galleriesInner}>
          {/* Title with lines */}
          <View style={s.sectionTitleHeader}>
            <View style={s.titleLine} />
            <Text style={s.sectionHeaderTitle}>
              GALERIAS <Text style={s.sectionHeaderTitleBlue}>EM DESTAQUE</Text>
            </Text>
            <View style={s.titleLine} />
          </View>

          {/* Event Search Bar */}
          <View style={[s.searchBarContainer, isMobile && s.searchBarContainerMobile]}>
            <View style={s.searchBarWrapper}>
              <Search size={18} color="#006BD6" style={s.searchIcon} />
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
            </View>
          </View>

          {/* Empty State when search returns 0 results */}
          {displayedGalleries.length === 0 ? (
            <View style={s.emptyStateContainer}>
              <View style={s.emptyIconCircle}>
                <Search size={28} color="#94A3B8" />
              </View>
              <Text style={s.emptyTitle}>Nenhum evento encontrado</Text>
              <Text style={s.emptySubtitle}>
                Não encontramos nenhum evento correspondente a "{searchQuery}".
              </Text>
              <TouchableOpacity
                style={s.btnResetSearch}
                onPress={() => setSearchQuery('')}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca e ver todos os eventos"
              >
                <Text style={s.btnResetSearchText}>Ver todos os eventos</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Cards Grid com os eventos de Rafael Publicado */
            <View style={[s.cardsGrid, isMobile && s.cardsGridMobile]}>
              {displayedGalleries.map((gal, idx) => (
                <View key={gal.id || idx} style={[s.cardWrapper, !isMobile && { minWidth: 260, flexBasis: '22%', flexGrow: 1, marginBottom: 24 }]}>
                  <TouchableOpacity
                    style={[s.eventCard, isMobile && s.eventCardMobile]}
                    onPress={() =>
                      navigation.navigate('EventDetails', {
                        event: gal.rawEvent || events.find((e) => e.id === gal.id) || events[0],
                      })
                    }
                    activeOpacity={0.9}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Acessar galeria do evento ${gal.title}, realizada em ${gal.location}`}
                  >
                    {/* Card Image */}
                    <View style={[s.cardImageContainer, isMobile && s.cardImageContainerMobile]}>
                      <Image
                        source={{ uri: gal.image }}
                        style={s.cardImage}
                        resizeMode="cover"
                        accessibilityLabel={`Foto de capa do evento ${gal.title}`}
                      />

                      {/* Date Badge if present */}
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

                        <View style={[s.btnVerGaleria, isMobile && s.btnVerGaleriaMobile]}>
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
          4. DIFERENCIAIS E GARANTIAS (Trust Pillars)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[s.trustSection, isMobile && s.trustSectionMobile]}>
        <View style={s.trustInner}>
          <View style={[s.trustGrid, isMobile && s.trustGridMobile]}>
            {/* Feature 1 */}
            <View style={[s.trustCard, isMobile && s.trustCardMobile]}>
              <View style={s.trustIconCircle}>
                <Camera size={22} color="#006BD6" />
              </View>
              <View style={isMobile && s.trustTextWrapperMobile}>
                <Text style={s.trustTitle}>Fotos profissionais</Text>
                <Text style={s.trustDesc}>
                  Equipamentos de alta performance e qualidade excepcional.
                </Text>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={[s.trustCard, isMobile && s.trustCardMobile]}>
              <View style={s.trustIconCircle}>
                <Lock size={22} color="#006BD6" />
              </View>
              <View style={isMobile && s.trustTextWrapperMobile}>
                <Text style={s.trustTitle}>Compra segura</Text>
                <Text style={s.trustDesc}>
                  Ambiente 100% seguro e pagamentos protegidos com criptografia.
                </Text>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={[s.trustCard, isMobile && s.trustCardMobile]}>
              <View style={s.trustIconCircle}>
                <DownloadCloud size={22} color="#006BD6" />
              </View>
              <View style={isMobile && s.trustTextWrapperMobile}>
                <Text style={s.trustTitle}>Download ilimitado</Text>
                <Text style={s.trustDesc}>
                  Baixe suas fotos em alta resolução quantas vezes quiser.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          5. NEWSLETTER BANNER (Light Theme & Mobile Optimized)
      ═════════════════════════════════════════════════════════════════════ */}
      <View style={[s.newsletterSection, isMobile && s.newsletterSectionMobile]}>
        <View style={s.newsletterInner}>
          <View style={[s.newsletterCard, isMobile && s.newsletterCardMobile]}>
            {/* Left Mail Icon & Text */}
            <View style={[s.newsletterLeft, isMobile && s.newsletterLeftMobile]}>
              <View style={s.newsletterMailCircle}>
                <Mail size={22} color="#006BD6" />
              </View>
              <View style={s.newsletterTextGroup}>
                <Text style={s.newsletterTitle}>
                  Fique por dentro dos próximos eventos
                </Text>
                <Text style={s.newsletterSubtitle}>
                  Receba novidades e avisos de novas galerias em primeira mão.
                </Text>
              </View>
            </View>

            {/* Right Input Form */}
            <View style={[s.newsletterForm, isMobile && s.newsletterFormMobile]}>
              <TextInput
                style={[s.newsletterInput, isMobile && s.newsletterInputMobile]}
                placeholder="Seu melhor e-mail"
                placeholderTextColor="#94A3B8"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                accessible={true}
                accessibilityLabel="Digite seu e-mail para receber novidades"
              />
              <TouchableOpacity
                style={[s.btnSubscribe, isMobile && s.btnSubscribeMobile]}
                onPress={handleSubscribe}
                activeOpacity={0.88}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cadastrar e-mail na newsletter"
              >
                <Text style={s.btnSubscribeText}>
                  {emailSubscribed ? 'Cadastrado com sucesso!' : 'Quero receber'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ═════════════════════════════════════════════════════════════════════
          5. FOOTER (Light Theme & Accessible)
      ═════════════════════════════════════════════════════════════════════ */}
      <View nativeID="duvidas" style={[s.footer, isMobile && s.footerMobile]}>
        <View style={s.footerInner}>
          {/* Top Row with 4 Columns */}
          <View style={[s.footerGrid, isMobile && s.footerGridMobile]}>
            {/* Col 1: Brand Logo */}
            <View style={s.footerColBrand}>
              <BrandLogo size={isMobile ? 'sm' : 'md'} />
              <Text style={s.footerBrandDesc}>
                Plataforma oficial de fotografia profissional e venda de galerias digitais.
              </Text>
            </View>

            {/* Col 2: Navegação */}
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>NAVEGAÇÃO</Text>
              <TouchableOpacity
                onPress={() => scrollToSection('como-funciona')}
                accessible={true}
                accessibilityRole="link"
                accessibilityLabel="Como funciona"
                style={s.footerLinkTouchable}
              >
                <Text style={s.footerLink}>Como funciona</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollToSection('galerias-destaque')}
                accessible={true}
                accessibilityRole="link"
                accessibilityLabel="Galerias"
                style={s.footerLinkTouchable}
              >
                <Text style={s.footerLink}>Galerias</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => scrollToSection('duvidas')}
                accessible={true}
                accessibilityRole="link"
                accessibilityLabel="Dúvidas"
                style={s.footerLinkTouchable}
              >
                <Text style={s.footerLink}>Dúvidas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openWhatsApp}
                accessible={true}
                accessibilityRole="link"
                accessibilityLabel="Contato pelo WhatsApp"
                style={s.footerLinkTouchable}
              >
                <Text style={s.footerLink}>Contato</Text>
              </TouchableOpacity>
            </View>

            {/* Col 3: Legal / Suporte */}
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>LEGAL</Text>
              <TouchableOpacity style={s.footerLinkTouchable} accessible={true} accessibilityRole="link">
                <Text style={s.footerLink}>Termos de uso</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerLinkTouchable} accessible={true} accessibilityRole="link">
                <Text style={s.footerLink}>Política de privacidade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.footerLinkTouchable} accessible={true} accessibilityRole="link">
                <Text style={s.footerLink}>Trocas e reembolsos</Text>
              </TouchableOpacity>
            </View>

            {/* Col 4: Siga-nos */}
            <View style={s.footerCol}>
              <Text style={s.footerColTitle}>SIGA-NOS</Text>
              <View style={s.socialIconsRow}>
                <TouchableOpacity
                  style={s.socialIconBtn}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Acessar Instagram"
                  onPress={() => Linking.openURL('https://www.instagram.com/rafaelpublicado')}
                >
                  <InstagramIcon size={18} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.socialIconBtn}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Acessar Facebook"
                >
                  <FacebookIcon size={18} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.socialIconBtn}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Acessar YouTube"
                >
                  <YoutubeIcon size={18} color="#475569" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.socialIconBtn}
                  onPress={openWhatsApp}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Conversar no WhatsApp"
                >
                  <MessageCircle size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom Copyright */}
          <View style={s.footerBottom}>
            <Text style={s.footerCopyrightText}>
              © {new Date().getFullYear()} Rafael Publicado Audiovisual. Todos os direitos reservados.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pageContent: {
    paddingBottom: 0,
  },

  // ── HERO ───────────────────────────────────────────────────────────────────
  hero: {
    paddingVertical: 36,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroMobile: {
    paddingVertical: 20,
    paddingHorizontal: Spacing.four,
  },
  heroInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },
  heroInnerMobile: {
    flexDirection: 'column',
    gap: 0,
  },

  heroLeft: {
    flex: 5,
    alignItems: 'flex-start',
  },
  heroLeftMobile: {
    width: '100%',
  },

  heroTitle: {
    fontSize: 50,
    lineHeight: 56,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
    marginBottom: Spacing.four,
  },
  heroTitleMobile: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroTitleBlue: {
    color: '#006BD6',
  },

  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    maxWidth: 480,
    marginBottom: 0,
  },
  heroSubtitleMobile: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 0,
  },

  // Right Hero Visual
  heroRight: {
    flex: 5.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  blueRingGraphic: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 107, 214, 0.2)',
  },
  blueGlowAura: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(0, 107, 214, 0.06)',
  },
  heroMainImageWrapper: {
    width: '100%',
    maxWidth: 480,
    height: 340,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.1)',
  },
  heroAthleteImage: {
    width: '100%',
    height: '100%',
  },
  badgeFotosProfissionais: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
  },
  badgeFotosText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 12,
  },

  // 4 Action Thumbnails
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
    maxWidth: 480,
  },
  thumbCard: {
    flex: 1,
    height: 70,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },

  // ── COMO FUNCIONA ─────────────────────────────────────────────────────────
  howSection: {
    paddingVertical: 36,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  howSectionMobile: {
    paddingVertical: 20,
    paddingHorizontal: Spacing.four,
  },
  howInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
  },
  howEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006BD6',
    letterSpacing: 2,
    marginBottom: 4,
  },
  howTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  howTitleMobile: {
    fontSize: 18,
    marginBottom: 16,
  },
  howTitleBlue: {
    color: '#006BD6',
  },
  howStepsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  howStepsRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  howStepItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  howStepItemMobile: {
    flex: undefined,
    width: '48%',
    padding: 10,
    marginBottom: 4,
  },
  howStepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  howStepNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006BD6',
    marginBottom: 2,
  },
  howStepName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
    textAlign: 'center',
  },
  howStepDesc: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    textAlign: 'center',
    maxWidth: 180,
  },

  // ── GALERIAS EM DESTAQUE ──────────────────────────────────────────────────
  galleriesSection: {
    paddingVertical: 48,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    marginBottom: 36,
  },
  titleLine: {
    height: 1,
    backgroundColor: '#CBD5E1',
    width: 60,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  sectionHeaderTitleBlue: {
    color: '#006BD6',
  },

  // ── SEARCH BAR ───────────────────────────────────────────────────────────
  searchBarContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    marginBottom: 28,
  },
  searchBarContainerMobile: {
    maxWidth: '100%',
    marginBottom: 20,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    height: 48,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 14,
    outlineStyle: 'none',
  },
  searchClearBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    marginLeft: 8,
  },
  searchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  searchResultCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── EMPTY STATE ───────────────────────────────────────────────────────────
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 18,
  },
  btnResetSearch: {
    backgroundColor: '#006BD6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.full,
    boxShadow: '0 4px 12px rgba(0, 107, 214, 0.2)',
  },
  btnResetSearchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  cardsGridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  cardWrapper: {
    flex: 1,
  },

  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
  eventCardMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Radius.lg,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
  },
  cardImageContainer: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  cardImageContainerMobile: {
    width: 105,
    height: 90,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 2,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  },
  dateBadgeMobile: {
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateBadgeDay: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 14,
  },
  dateBadgeDayMobile: {
    fontSize: 10,
    lineHeight: 12,
  },
  dateBadgeMonth: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  dateBadgeMonthMobile: {
    fontSize: 8,
  },

  tagPill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(0, 107, 214, 0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
  },
  tagPillMobile: {
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006BD6',
  },
  tagPillTextMobile: {
    fontSize: 8,
  },

  cardBody: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  cardBodyMobile: {
    padding: 0,
    paddingLeft: 12,
    paddingRight: 4,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardTitleMobile: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  cardLocationMobile: {
    fontSize: 11,
    marginBottom: 6,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardFooterRowMobile: {
    paddingTop: 0,
    borderTopWidth: 0,
    marginTop: 2,
  },
  photosCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photosCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  photosCountTextMobile: {
    fontSize: 11,
  },
  btnVerGaleria: {
    backgroundColor: '#006BD6',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },
  btnVerGaleriaMobile: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnVerGaleriaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnVerGaleriaTextMobile: {
    fontSize: 11,
  },

  // ── DIFERENCIAIS E GARANTIAS (Bottom Trust Section) ──────────────────────
  trustSection: {
    paddingVertical: 44,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  trustSectionMobile: {
    paddingVertical: 24,
    paddingHorizontal: Spacing.four,
  },
  trustInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
  },
  trustGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 28,
  },
  trustGridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  trustCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
  },
  trustCardMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  trustIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexShrink: 0,
  },
  trustTextWrapperMobile: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  trustDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  // ── NEWSLETTER BANNER (Light Theme) ───────────────────────────────────────
  newsletterSection: {
    paddingVertical: 40,
    paddingHorizontal: Layout.desktopPadding,
    backgroundColor: '#F8FAFC',
  },
  newsletterSectionMobile: {
    paddingVertical: 24,
    paddingHorizontal: Spacing.four,
  },
  newsletterInner: {
    maxWidth: Layout.containerXl,
    alignSelf: 'center',
    width: '100%',
  },
  newsletterCard: {
    backgroundColor: '#006BD6',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    height: 44,
    color: '#0F172A',
    fontSize: 13,
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
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
  },
  btnSubscribeMobile: {
    width: '100%',
  },
  btnSubscribeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── FOOTER (Light Theme) ──────────────────────────────────────────────────
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
