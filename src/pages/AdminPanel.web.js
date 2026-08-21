// src/pages/AdminPanel.web.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ShieldCheck,
  Users,
  Image as ImageIcon,
  Palette,
  Calendar,
  Layers,
  Settings,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Sliders,
  Sparkles,
  Link2,
  Check,
  FileText,
  Download,
  Upload,
  ArrowUp,
  ArrowDown,
  Camera,
  Search,
} from 'lucide-react-native';
import { useAdminConfig } from '../context/AdminConfigContext';
import {
  resolvePhotographerProfile,
  fetchAllEvents,
  fetchPhotos,
  fetchPhotographersForEvent,
} from '../utils/api';
import { useBreakpoint } from '../hooks/useBreakpoint';
import BrandLogo from '../components/BrandLogo';

export default function AdminPanel() {
  const navigation = useNavigation();
  const { isMobile, isTablet } = useBreakpoint();
  const {
    config,
    eventRules,
    updateConfig,
    resetConfig,
    addPhotographer,
    removePhotographer,
    togglePhotographer,
    setPrimaryPhotographer,
    setEventPhotographerRule,
    isAuthenticated,
    loginAdmin,
    logoutAdmin,
    changeAdminPassword,
  } = useAdminConfig();

  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState('eventSettings'); // 'eventSettings' | 'photographers' | 'banners' | 'branding' | 'theme' | 'events' | 'advanced'

  // Tab: Photographers
  const [newPhotographerInput, setNewPhotographerInput] = useState('');
  const [resolvingPhotographer, setResolvingPhotographer] = useState(false);
  const [photographerFeedback, setPhotographerFeedback] = useState({ type: '', msg: '' });

  // Tab: Event Settings (Ordem & Ocultação por Evento)
  const [allEventsList, setAllEventsList] = useState([]);
  const [loadingEventsList, setLoadingEventsList] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventPhotogsList, setEventPhotogsList] = useState([]);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);

  // Tab: Banners
  const [bannerForm, setBannerForm] = useState(config.banners);

  // Tab: Branding & Texts
  const [brandingForm, setBrandingForm] = useState(config.branding);
  const [howItWorksForm, setHowItWorksForm] = useState(config.howItWorks);

  // Tab: Theme & Colors
  const [themeForm, setThemeForm] = useState(config.theme);

  // General feedback message
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Preset Palettes
  const PRESET_PALETTES = [
    { name: 'Azul Top Fotos (Padrão)', primary: 'var(--primary-color)', deep: "var(--primary-deep)", hover: '#007BF5' },
    { name: 'Dourado / Premium Gold', primary: '#D97706', deep: '#78350F', hover: '#B45309' },
    { name: 'Verde Esmeralda', primary: '#059669', deep: '#064E3B', hover: '#047857' },
    { name: 'Roxo Neon / Creator', primary: '#7C3AED', deep: '#4C1D95', hover: '#6D28D9' },
    { name: 'Vermelho Vibrante', primary: '#DC2626', deep: '#7F1D1D', hover: '#B91C1C' },
    { name: 'Preto / Cinza Minimal', primary: '#1E293B', deep: '#0F172A', hover: '#334155' },
  ];

  // Carrega lista de eventos para a aba de Configuração por Evento
  useEffect(() => {
    if (isAuthenticated) {
      loadAllEventsForAdmin();
    }
  }, [isAuthenticated]);

  const loadAllEventsForAdmin = async () => {
    setLoadingEventsList(true);
    try {
      const res = await fetchAllEvents();
      if (res.ok) {
        const data = await res.json();
        const evs = data.results || [];
        setAllEventsList(evs);
        if (evs.length > 0 && !selectedEventId) {
          setSelectedEventId(evs[0].id);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar eventos no admin:', err);
    } finally {
      setLoadingEventsList(false);
    }
  };

  // Quando o evento selecionado muda, busca os fotógrafos daquele evento (sem re-escanear ao mudar regras locais)
  useEffect(() => {
    if (selectedEventId) {
      loadPhotographersForSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  const loadPhotographersForSelectedEvent = async (evId) => {
    setLoadingEventDetails(true);
    try {
      // 1. Busca todos os fotógrafos presentes no evento (detectados nas fotos + cadastrados)
      const allFound = await fetchPhotographersForEvent(evId, config.photographers || []);
      const currentRules = eventRules[evId] || {};

      // 2. Mapeia com a regra ativa de ordem e ocultação
      const mapped = allFound.map((p, idx) => {
        const rule = currentRules[p.id] || { isHidden: false, order: idx + 1 };
        return {
          ...p,
          isHidden: Boolean(rule.isHidden),
          order: rule.order || idx + 1,
        };
      });

      // 3. Ordena de acordo com o `order`
      mapped.sort((a, b) => a.order - b.order);
      setEventPhotogsList(mapped);
    } catch (err) {
      console.warn('Erro ao carregar fotógrafos do evento:', err);
    } finally {
      setLoadingEventDetails(false);
    }
  };

  // ─── LOGIN HANDLER ────────────────────────────────────────────────────────
  const handleLogin = () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      setLoginError('Digite o e-mail e a senha.');
      return;
    }
    const ok = loginAdmin(emailInput.trim(), passwordInput.trim());
    if (!ok) {
      setLoginError('Credenciais incorretas.');
    } else {
      setLoginError('');
      setPasswordInput('');
      setEmailInput('');
    }
  };

  // ─── ADICIONAR FOTÓGRAFO POR LINK OU SLUG ─────────────────────────────────
  const handleAddPhotographer = async () => {
    if (!newPhotographerInput.trim()) {
      setPhotographerFeedback({ type: 'error', msg: 'Cole o link do perfil ou o ID do fotógrafo.' });
      return;
    }
    setResolvingPhotographer(true);
    setPhotographerFeedback({ type: '', msg: '' });

    try {
      const resolved = await resolvePhotographerProfile(newPhotographerInput.trim());
      await addPhotographer(resolved);
      setNewPhotographerInput('');
      setPhotographerFeedback({
        type: 'success',
        msg: `Fotógrafo "${resolved.name}" adicionado com sucesso!`,
      });
      setTimeout(() => setPhotographerFeedback({ type: '', msg: '' }), 4000);
    } catch (err) {
      setPhotographerFeedback({
        type: 'error',
        msg: err.message || 'Não foi possível resolver o perfil deste fotógrafo na Top Fotos.',
      });
    } finally {
      setResolvingPhotographer(false);
    }
  };

  // ─── ALTERAR VISIBILIDADE / ORDEM NO EVENTO (INSTANTÂNEO / 0ms) ───────────
  const handleTogglePhotographerInEvent = async (photogId) => {
    if (!selectedEventId) return;

    // Atualização Otimista Imediata na UI (sem piscar nem recarregar)
    setEventPhotogsList((prev) =>
      prev.map((p) =>
        p.id === photogId ? { ...p, isHidden: !p.isHidden } : p
      )
    );

    const currentRule = eventRules[selectedEventId]?.[photogId] || { isHidden: false, order: 1 };
    await setEventPhotographerRule(selectedEventId, photogId, {
      isHidden: !currentRule.isHidden,
    });
    showSavedBadge();
  };

  const handleMoveOrder = async (index, direction) => {
    if (!selectedEventId) return;
    const newList = [...eventPhotogsList];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    // Troca Imediata na UI
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    setEventPhotogsList(newList);

    // Salva em background
    for (let i = 0; i < newList.length; i++) {
      const p = newList[i];
      await setEventPhotographerRule(selectedEventId, p.id, {
        order: i + 1,
      });
    }
    showSavedBadge();
  };

  // ─── SALVAR CONFIGURAÇÕES ──────────────────────────────────────────────────
  const showSavedBadge = () => {
    setSaveSuccessMsg('Alterações salvas com sucesso no site!');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  const handleSaveBanners = async () => {
    await updateConfig({ banners: bannerForm });
    showSavedBadge();
  };

  const handleSaveBranding = async () => {
    await updateConfig({ branding: brandingForm, howItWorks: howItWorksForm });
    showSavedBadge();
  };

  const handleSaveTheme = async (themeToSave = themeForm) => {
    await updateConfig({ theme: themeToSave });
    showSavedBadge();
  };

  const applyPalette = (palette) => {
    const updated = {
      ...themeForm,
      primaryColor: palette.primary,
      primaryDeep: palette.deep,
      primaryHover: palette.hover,
      primaryLight: palette.primary,
      primarySubtle: `${palette.primary}15`,
      primaryGlow: `${palette.primary}35`,
    };
    setThemeForm(updated);
    handleSaveTheme(updated);
  };

  const filteredEventsForSelect = allEventsList.filter((ev) => {
    if (!eventSearchQuery.trim()) return true;
    return (ev.name || '').toLowerCase().includes(eventSearchQuery.toLowerCase());
  });

  const selectedEventObj = allEventsList.find((e) => e.id === selectedEventId);

  // ─── TELA DE LOGIN ADMIN (Caso não esteja logado) ───────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={styles.loginPage}>
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <BrandLogo size="medium" />
            <Text style={styles.loginTitle}>Entrar</Text>
            <Text style={styles.loginSubtitle}>
              Faça login para acessar o sistema.
            </Text>
          </View>

          {loginError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#EF4444" />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu e-mail"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailInput}
              onChangeText={(v) => {
                setEmailInput(v);
                setLoginError('');
              }}
              onSubmitEditing={handleLogin}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={passwordInput}
              onChangeText={(v) => {
                setPasswordInput(v);
                setLoginError('');
              }}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleLogin}
            activeOpacity={0.88}
          >
            <Lock size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Entrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnBack}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.btnBackText}>← Voltar para a Loja</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── PAINEL PRINCIPAL (Autenticado) ─────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── TOPBAR DO ADMIN ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={styles.brandRow}>
            <TouchableOpacity
              style={styles.btnBackStore}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <ArrowLeft size={16} color="var(--primary-color)" />
              {!isMobile && <Text style={styles.btnBackStoreText}>Ver Loja</Text>}
            </TouchableOpacity>
            <BrandLogo size="small" />
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>MODO ADMIN ATIVO</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.btnLogout}
            onPress={logoutAdmin}
            activeOpacity={0.8}
          >
            <Text style={styles.btnLogoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── ALERTA DE SUCESSO FLUTUANTE ── */}
      {saveSuccessMsg ? (
        <View style={styles.toastSuccess}>
          <CheckCircle2 size={16} color="#059669" />
          <Text style={styles.toastSuccessText}>{saveSuccessMsg}</Text>
        </View>
      ) : null}

      {/* ── NAVEGAÇÃO DE ABAS DO ADMIN ── */}
      <View style={styles.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsBarInner}
        >
          {[
            { key: 'eventSettings', label: 'Fotos por Evento', icon: Sliders },
            { key: 'photographers', label: 'Multi-Fotógrafos', icon: Users },
            { key: 'banners', label: 'Banners & Hero', icon: ImageIcon },
            { key: 'theme', label: 'Cores & White-Label', icon: Palette },
            { key: 'branding', label: 'Textos & Marca', icon: FileText },
            { key: 'events', label: 'Mesclagem de Eventos', icon: Calendar },
            { key: 'advanced', label: 'Backup & Config', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
              >
                <Icon
                  size={16}
                  color={isActive ? 'var(--primary-color)' : '#64748B'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTEÚDO DA ABA ATIVA ── */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* ═══════════════════════════════════════════════════════════════════
            0. ABA: CONFIGURAÇÃO DE FOTOS POR EVENTO (ORDEM & OCULTAÇÃO)
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'eventSettings' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Configuração de Fotos por Evento</Text>
              <Text style={styles.sectionDesc}>
                O sistema lista automaticamente **todos os fotógrafos com fotos no evento** (incluindo fotógrafos cadastrados e detectados). Você pode definir a **ordem de exibição das fotos** ou **ocultar completamente as fotos** de qualquer fotógrafo neste evento específico.
              </Text>
            </View>

            {/* Seletor de Evento */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>1. Selecione o Evento para Configurar</Text>
              
              <View style={styles.searchEventRow}>
                <Search size={16} color="#64748B" />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingVertical: 4 }]}
                  placeholder="Filtrar evento por nome..."
                  placeholderTextColor="#94A3B8"
                  value={eventSearchQuery}
                  onChangeText={setEventSearchQuery}
                />
              </View>

              <ScrollView style={styles.eventPickerList} nestedScrollEnabled>
                {loadingEventsList ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="var(--primary-color)" />
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Carregando eventos...</Text>
                  </View>
                ) : filteredEventsForSelect.length === 0 ? (
                  <Text style={{ padding: 12, fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                    Nenhum evento encontrado.
                  </Text>
                ) : (
                  filteredEventsForSelect.slice(0, 20).map((ev) => {
                    const isSelected = ev.id === selectedEventId;
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        style={[styles.eventPickerItem, isSelected && styles.eventPickerItemActive]}
                        onPress={() => setSelectedEventId(ev.id)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: ev.image || 'https://ik.imagekit.io/yg7h35ptj/public/assets/company/banner-default.jpg' }}
                          style={styles.eventPickerThumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eventPickerTitle, isSelected && styles.eventPickerTitleActive]} numberOfLines={1}>
                            {ev.name}
                          </Text>
                          <Text style={styles.eventPickerSub} numberOfLines={1}>
                            {ev.city || 'Cidade não informada'} • ID: {ev.id}
                          </Text>
                        </View>
                        {isSelected && <CheckCircle2 size={16} color="var(--primary-color)" />}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Controle de Fotógrafos no Evento Selecionado */}
            {selectedEventObj && (
              <View style={styles.cardBox}>
                <View style={styles.cardBoxHeaderBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardBoxTitle}>
                      2. Fotógrafos com Fotos neste Evento ({eventPhotogsList.length}):
                    </Text>
                    <Text style={styles.selectedEventNameHighlight}>
                      "{selectedEventObj.name}"
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.btnOpenGalleryPreview}
                      onPress={() => loadPhotographersForSelectedEvent(selectedEventObj.id)}
                      activeOpacity={0.8}
                    >
                      <RefreshCw size={13} color="var(--primary-color)" />
                      <Text style={styles.btnOpenGalleryPreviewText}>Re-Escanear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnOpenGalleryPreview}
                      onPress={() => navigation.navigate('EventDetails', { id: selectedEventObj.id, event: selectedEventObj })}
                    >
                      <ExternalLink size={13} color="var(--primary-color)" />
                      <Text style={styles.btnOpenGalleryPreviewText}>Ver Galeria</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loadingEventDetails ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="var(--primary-color)" />
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                      Identificando fotógrafos presentes nas fotos do evento...
                    </Text>
                  </View>
                ) : eventPhotogsList.length === 0 ? (
                  <Text style={{ padding: 12, fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                    Nenhum fotógrafo identificado para este evento.
                  </Text>
                ) : (
                  <View style={styles.photogOrderList}>
                    {eventPhotogsList.map((p, idx) => (
                      <View
                        key={p.id}
                        style={[
                          styles.photogOrderCard,
                          p.isHidden && styles.photogOrderCardHidden,
                        ]}
                      >
                        {/* Posição / Prioridade */}
                        <View style={[styles.orderNumberBadge, p.isHidden && styles.orderNumberBadgeHidden]}>
                          <Text style={styles.orderNumberBadgeText}>{idx + 1}º</Text>
                        </View>

                        {/* Avatar e Nome */}
                        <Image
                          source={{ uri: p.avatar || 'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg' }}
                          style={styles.photogAvatarSmall}
                          resizeMode="cover"
                        />

                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[styles.photogOrderName, p.isHidden && { color: '#94A3B8', textDecorationLine: 'line-through' }]}>
                              {p.name}
                            </Text>
                            {p.isPrimary && (
                              <View style={styles.primaryMiniBadge}>
                                <Text style={styles.primaryMiniBadgeText}>PRINCIPAL</Text>
                              </View>
                            )}
                            {p.detectedInEvent && (
                              <View style={styles.detectedMiniBadge}>
                                <Text style={styles.detectedMiniBadgeText}>DETECTADO NO EVENTO</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.photogOrderSub}>
                            {p.isHidden ? '❌ Fotos Ocultas na galeria deste evento' : '✅ Fotos exibidas na galeria deste evento'}
                          </Text>
                        </View>

                        {/* Botões de Mover Ordem */}
                        <View style={styles.orderControlsRow}>
                          <TouchableOpacity
                            style={[styles.btnArrow, idx === 0 && styles.btnArrowDisabled]}
                            onPress={() => handleMoveOrder(idx, -1)}
                            disabled={idx === 0}
                            activeOpacity={0.8}
                          >
                            <ArrowUp size={14} color={idx === 0 ? '#CBD5E1' : '#0F172A'} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.btnArrow, idx === eventPhotogsList.length - 1 && styles.btnArrowDisabled]}
                            onPress={() => handleMoveOrder(idx, 1)}
                            disabled={idx === eventPhotogsList.length - 1}
                            activeOpacity={0.8}
                          >
                            <ArrowDown size={14} color={idx === eventPhotogsList.length - 1 ? '#CBD5E1' : '#0F172A'} />
                          </TouchableOpacity>
                        </View>

                        {/* Botão de Ocultar / Mostrar */}
                        <TouchableOpacity
                          style={[
                            styles.btnVisibilityToggle,
                            p.isHidden ? styles.btnVisibilityToggleHidden : styles.btnVisibilityToggleVisible,
                          ]}
                          onPress={() => handleTogglePhotographerInEvent(p.id)}
                          activeOpacity={0.8}
                        >
                          {p.isHidden ? <EyeOff size={14} color="#DC2626" /> : <Eye size={14} color="#059669" />}
                          <Text
                            style={[
                              styles.btnVisibilityToggleText,
                              p.isHidden ? { color: '#DC2626' } : { color: '#059669' },
                            ]}
                          >
                            {p.isHidden ? 'Ocultar' : 'Exibindo'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            1. ABA: MULTI-FOTÓGRAFOS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'photographers' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gerenciamento de Fotógrafos</Text>
              <Text style={styles.sectionDesc}>
                Adicione outros fotógrafos usando o link do perfil público da Top Fotos (ex: https://topfotos.com.br/perfil/nome-do-fotografo). As fotos e eventos deles serão sincronizados e integrados à sua loja.
              </Text>
            </View>

            {/* Card para Adicionar Novo Fotógrafo */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Adicionar Fotógrafo pelo Perfil</Text>
              <View style={[styles.addRow, isMobile && styles.addRowMobile]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Cole aqui o link ou slug do fotógrafo..."
                  placeholderTextColor="#94A3B8"
                  value={newPhotographerInput}
                  onChangeText={setNewPhotographerInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleAddPhotographer}
                />
                <TouchableOpacity
                  style={[styles.btnActionPrimary, resolvingPhotographer && styles.btnDisabled]}
                  onPress={handleAddPhotographer}
                  disabled={resolvingPhotographer}
                  activeOpacity={0.88}
                >
                  {resolvingPhotographer ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.btnActionPrimaryText}>Adicionar Fotógrafo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {photographerFeedback.msg ? (
                <View
                  style={[
                    styles.feedbackBox,
                    photographerFeedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
                  ]}
                >
                  {photographerFeedback.type === 'error' ? (
                    <AlertCircle size={15} color="#DC2626" />
                  ) : (
                    <CheckCircle2 size={15} color="#059669" />
                  )}
                  <Text
                    style={[
                      styles.feedbackText,
                      photographerFeedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess,
                    ]}
                  >
                    {photographerFeedback.msg}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Lista de Fotógrafos Cadastrados */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>
                Fotógrafos Ativos na Vitrine ({config.photographers.length})
              </Text>

              <View style={styles.photographersList}>
                {config.photographers.map((p) => (
                  <View key={p.id} style={styles.photographerRow}>
                    <Image
                      source={{ uri: p.avatar || 'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg' }}
                      style={styles.photographerAvatar}
                    />

                    <View style={styles.photographerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.photographerName}>{p.name}</Text>
                        {p.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>FOTÓGRAFO PRINCIPAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.photographerSub}>
                        ID: {p.id} • Slug: {p.slug || 'N/A'}
                      </Text>
                      {p.profileUrl && (
                        <TouchableOpacity
                          style={styles.linkRow}
                          onPress={() => Platform.OS === 'web' && window.open(p.profileUrl, '_blank')}
                        >
                          <ExternalLink size={12} color="var(--primary-color)" />
                          <Text style={styles.linkText}>Ver Perfil Top Fotos</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.btnToggle, p.active ? styles.btnToggleActive : styles.btnToggleInactive]}
                        onPress={() => togglePhotographer(p.id)}
                        activeOpacity={0.8}
                      >
                        {p.active ? <Eye size={14} color="#059669" /> : <EyeOff size={14} color="#94A3B8" />}
                        <Text style={[styles.btnToggleText, p.active ? styles.btnToggleTextActive : styles.btnToggleTextInactive]}>
                          {p.active ? 'Exibindo' : 'Oculto'}
                        </Text>
                      </TouchableOpacity>

                      {!p.isPrimary && (
                        <TouchableOpacity
                          style={styles.btnDelete}
                          onPress={() => removePhotographer(p.id)}
                          activeOpacity={0.8}
                        >
                          <Trash2 size={15} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            2. ABA: BANNERS & HERO
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'banners' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Banners Promocionais & Redirecionamentos</Text>
              <Text style={styles.sectionDesc}>
                Configure banners chamativos na página inicial que redirecionam direto para uma galeria de evento específico ou link externo.
              </Text>
            </View>

            {/* Banner Promocional de Destaque */}
            <View style={styles.cardBox}>
              <View style={styles.cardBoxHeaderBetween}>
                <Text style={styles.cardBoxTitle}>Banner Promocional no Topo da Home</Text>
                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    bannerForm.enableHeroPromoBanner ? styles.btnToggleActive : styles.btnToggleInactive,
                  ]}
                  onPress={() =>
                    setBannerForm((prev) => ({
                      ...prev,
                      enableHeroPromoBanner: !prev.enableHeroPromoBanner,
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.btnToggleText,
                      bannerForm.enableHeroPromoBanner ? styles.btnToggleTextActive : styles.btnToggleTextInactive,
                    ]}
                  >
                    {bannerForm.enableHeroPromoBanner ? 'ATIVADO ✓' : 'DESATIVADO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Título do Banner</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerForm.heroPromoBanner?.title}
                    onChangeText={(v) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        heroPromoBanner: { ...prev.heroPromoBanner, title: v },
                      }))
                    }
                    placeholder="Ex: Fotos Oficiais do Maratona 2026 Já Disponíveis!"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subtítulo / Descrição</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerForm.heroPromoBanner?.subtitle}
                    onChangeText={(v) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        heroPromoBanner: { ...prev.heroPromoBanner, subtitle: v },
                      }))
                    }
                    placeholder="Ex: Encontre-se pelo reconhecimento facial e baixe em alta resolução."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>ID do Evento de Destino (Redirecionamento Interno)</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerForm.heroPromoBanner?.targetEventId}
                    onChangeText={(v) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        heroPromoBanner: { ...prev.heroPromoBanner, targetEventId: v },
                      }))
                    }
                    placeholder="Ex: aa12f6ec-5d65-4fa7-a435-5da6155be6a0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Ou Link Externo Opcional (WhatsApp / Patrocinador)</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerForm.heroPromoBanner?.externalLink}
                    onChangeText={(v) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        heroPromoBanner: { ...prev.heroPromoBanner, externalLink: v },
                      }))
                    }
                    placeholder="Ex: https://wa.me/5599991297693"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>URL da Imagem de Fundo do Banner (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={bannerForm.heroPromoBanner?.imageUrl}
                    onChangeText={(v) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        heroPromoBanner: { ...prev.heroPromoBanner, imageUrl: v },
                      }))
                    }
                    placeholder="https://images.unsplash.com/..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnPrimarySave}
                onPress={handleSaveBanners}
                activeOpacity={0.88}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimarySaveText}>Salvar Configuração de Banners</Text>
              </TouchableOpacity>
            </View>

            {/* Imagem Principal do Hero Visual */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Foto Principal do Hero (Atleta / Capa)</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>URL da Imagem do Hero</Text>
                <TextInput
                  style={styles.input}
                  value={bannerForm.heroMainImage}
                  onChangeText={(v) =>
                    setBannerForm((prev) => ({ ...prev, heroMainImage: v }))
                  }
                  placeholder="URL da foto principal..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {bannerForm.heroMainImage ? (
                <View style={styles.previewBox}>
                  <Image source={{ uri: bannerForm.heroMainImage }} style={styles.previewImage} resizeMode="cover" />
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.btnPrimarySave}
                onPress={handleSaveBanners}
                activeOpacity={0.88}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimarySaveText}>Salvar Foto do Hero</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            3. ABA: CORES & WHITE-LABEL
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'theme' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Paleta de Cores & Customização White-Label</Text>
              <Text style={styles.sectionDesc}>
                Altere a identidade visual completa do site. Escolha um dos temas prontos ou digite seus próprios códigos de cor HEX.
              </Text>
            </View>

            {/* Paletas Prontas */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Paletas Pré-definidas</Text>
              <View style={styles.presetGrid}>
                {PRESET_PALETTES.map((pal, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.presetCard,
                      themeForm.primaryColor === pal.primary && styles.presetCardActive,
                    ]}
                    onPress={() => applyPalette(pal)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.presetColorCircle, { backgroundColor: pal.primary }]} />
                    <Text style={styles.presetName}>{pal.name}</Text>
                    {themeForm.primaryColor === pal.primary && (
                      <CheckCircle2 size={16} color="#059669" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Seletor Customizado HEX */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Cores Personalizadas (HEX)</Text>
              <View style={styles.formGrid}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cor Primária (Botões, Títulos, Destaques)</Text>
                  <View style={styles.colorInputRow}>
                    <View style={[styles.colorPreview, { backgroundColor: themeForm.primaryColor }]} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={themeForm.primaryColor}
                      onChangeText={(v) =>
                        setThemeForm((prev) => ({ ...prev, primaryColor: v, primaryHover: v }))
                      }
                      placeholder="var(--primary-color)"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cor Primária Profunda (Hover / Gradientes)</Text>
                  <View style={styles.colorInputRow}>
                    <View style={[styles.colorPreview, { backgroundColor: themeForm.primaryDeep }]} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={themeForm.primaryDeep}
                      onChangeText={(v) =>
                        setThemeForm((prev) => ({ ...prev, primaryDeep: v }))
                      }
                      placeholder="var(--primary-deep)"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnPrimarySave}
                onPress={() => handleSaveTheme(themeForm)}
                activeOpacity={0.88}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimarySaveText}>Salvar Nova Paleta de Cores</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            4. ABA: TEXTOS & MARCA
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'branding' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Textos Institucionais & Contato</Text>
              <Text style={styles.sectionDesc}>
                Altere o nome da marca, frases de impacto, número de WhatsApp e descrições dos passos na Home.
              </Text>
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Identidade da Marca</Text>
              <View style={styles.formGrid}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nome do Site / Marca</Text>
                  <TextInput
                    style={styles.input}
                    value={brandingForm.siteName}
                    onChangeText={(v) =>
                      setBrandingForm((prev) => ({ ...prev, siteName: v }))
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Título da Aba do Navegador</Text>
                  <TextInput
                    style={styles.input}
                    value={brandingForm.siteTitle}
                    onChangeText={(v) =>
                      setBrandingForm((prev) => ({ ...prev, siteTitle: v }))
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Frase Principal do Hero</Text>
                  <TextInput
                    style={styles.input}
                    value={brandingForm.sloganHero}
                    onChangeText={(v) =>
                      setBrandingForm((prev) => ({ ...prev, sloganHero: v }))
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Subtítulo do Hero</Text>
                  <TextInput
                    style={styles.input}
                    value={brandingForm.subtitleHero}
                    onChangeText={(v) =>
                      setBrandingForm((prev) => ({ ...prev, subtitleHero: v }))
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>WhatsApp para Atendimento e Envio</Text>
                  <TextInput
                    style={styles.input}
                    value={brandingForm.whatsappNumber}
                    onChangeText={(v) =>
                      setBrandingForm((prev) => ({ ...prev, whatsappNumber: v }))
                    }
                    placeholder="5599991297693"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnPrimarySave}
                onPress={handleSaveBranding}
                activeOpacity={0.88}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimarySaveText}>Salvar Textos e Marca</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            5. ABA: MESCLAGEM DE EVENTOS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'events' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Regras de Mesclagem & Deduplicação</Text>
              <Text style={styles.sectionDesc}>
                Quando dois ou mais fotógrafos cadastrados participam do mesmo evento, o site exibe apenas 1 card consolidado na vitrine da Home.
              </Text>
            </View>

            <View style={styles.cardBox}>
              <View style={styles.cardBoxHeaderBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBoxTitle}>Mesclagem Automática de Eventos Compartilhados</Text>
                  <Text style={styles.cardBoxSub}>
                    Ative para unificar eventos com o mesmo ID ou slug em um único card, carregando as fotos de ambos os fotógrafos na galeria.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    config.eventsConfig?.mergeSharedEvents ? styles.btnToggleActive : styles.btnToggleInactive,
                  ]}
                  onPress={() =>
                    updateConfig((prev) => ({
                      ...prev,
                      eventsConfig: {
                        ...prev.eventsConfig,
                        mergeSharedEvents: !prev.eventsConfig?.mergeSharedEvents,
                      },
                    }))
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.btnToggleText,
                      config.eventsConfig?.mergeSharedEvents ? styles.btnToggleTextActive : styles.btnToggleTextInactive,
                    ]}
                  >
                    {config.eventsConfig?.mergeSharedEvents ? 'ATIVADA ✓' : 'DESATIVADA'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            6. ABA: BACKUP & AVANÇADO
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'advanced' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Backup e Segurança</Text>
              <Text style={styles.sectionDesc}>
                Exporte suas configurações ou restaure os valores originais da plataforma.
              </Text>
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Segurança da Senha de Acesso</Text>
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nova senha de administrador..."
                  secureTextEntry
                  id="new-admin-pass"
                />
                <TouchableOpacity
                  style={styles.btnActionPrimary}
                  onPress={() => {
                    const el = document.getElementById('new-admin-pass');
                    if (el && el.value) {
                      changeAdminPassword(el.value);
                      el.value = '';
                      showSavedBadge();
                    }
                  }}
                >
                  <Text style={styles.btnActionPrimaryText}>Alterar Senha</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>Restaurar Padrões de Fábrica</Text>
              <Text style={styles.cardBoxSub}>
                Restaura todas as cores, textos, banners e lista de fotógrafos para as configurações originais do Rafael Publicado.
              </Text>
              <TouchableOpacity
                style={styles.btnResetDanger}
                onPress={() => {
                  if (confirm('Tem certeza que deseja restaurar todas as configurações originais?')) {
                    resetConfig();
                    showSavedBadge();
                  }
                }}
              >
                <RefreshCw size={15} color="#EF4444" />
                <Text style={styles.btnResetDangerText}>Restaurar Configurações Originais</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── ESTILOS DO PAINEL ADMIN ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loginPage: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
  },
  loginHeader: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: 'var(--primary-color)',
    fontSize: 11,
    fontWeight: '800',
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none',
  },
  btnPrimary: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnBack: {
    marginTop: 16,
    alignItems: 'center',
  },
  btnBackText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // Topbar
  topbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topbarInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnBackStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnBackStoreText: {
    color: 'var(--primary-color)',
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  btnLogout: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  btnLogoutText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  // Tabs Bar
  tabsBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsBarInner: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: 'var(--primary-color)',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabItemTextActive: {
    color: 'var(--primary-color)',
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
  },
  contentInner: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  section: {
    gap: 18,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  cardBoxHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBoxSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  selectedEventNameHighlight: {
    fontSize: 13,
    fontWeight: '600',
    color: 'var(--primary-color)',
    marginTop: 2,
  },
  btnOpenGalleryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnOpenGalleryPreviewText: {
    color: 'var(--primary-color)',
    fontSize: 12,
    fontWeight: '700',
  },

  // Event Picker in EventSettings
  searchEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  eventPickerList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  eventPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  eventPickerItemActive: {
    backgroundColor: '#EFF6FF',
  },
  eventPickerThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  eventPickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  eventPickerTitleActive: {
    color: 'var(--primary-color)',
    fontWeight: '700',
  },
  eventPickerSub: {
    fontSize: 11,
    color: '#64748B',
  },

  // Photog Order List in EventSettings
  photogOrderList: {
    gap: 10,
  },
  photogOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photogOrderCardHidden: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    opacity: 0.75,
  },
  orderNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'var(--primary-color)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNumberBadgeHidden: {
    backgroundColor: '#94A3B8',
  },
  orderNumberBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  photogAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  photogOrderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  primaryMiniBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  primaryMiniBadgeText: {
    color: 'var(--primary-color)',
    fontSize: 9,
    fontWeight: '800',
  },
  detectedMiniBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  detectedMiniBadgeText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
  },
  photogOrderSub: {
    fontSize: 11,
    color: '#64748B',
  },
  orderControlsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  btnArrow: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnArrowDisabled: {
    opacity: 0.3,
  },
  btnVisibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnVisibilityToggleVisible: {
    backgroundColor: '#ECFDF5',
  },
  btnVisibilityToggleHidden: {
    backgroundColor: '#FEE2E2',
  },
  btnVisibilityToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  btnActionPrimary: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackTextSuccess: {
    color: '#059669',
  },
  feedbackTextError: {
    color: '#DC2626',
  },

  // Photographers List
  photographersList: {
    gap: 10,
  },
  photographerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photographerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  photographerInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  photographerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  primaryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: 'var(--primary-color)',
    fontSize: 9,
    fontWeight: '800',
  },
  photographerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  linkText: {
    fontSize: 11,
    color: 'var(--primary-color)',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnToggleActive: {
    backgroundColor: '#ECFDF5',
  },
  btnToggleInactive: {
    backgroundColor: '#F1F5F9',
  },
  btnToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnToggleTextActive: {
    color: '#059669',
  },
  btnToggleTextInactive: {
    color: '#94A3B8',
  },
  btnDelete: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },

  // Form Grid
  formGrid: {
    gap: 12,
  },
  btnPrimarySave: {
    backgroundColor: 'var(--primary-color)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  btnPrimarySaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  // Presets
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 220,
    flex: 1,
  },
  presetCardActive: {
    borderColor: 'var(--primary-color)',
    backgroundColor: '#EFF6FF',
  },
  presetColorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  // Toast
  toastSuccess: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
  },
  toastSuccessText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },

  btnResetDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 4,
  },
  btnResetDangerText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});
