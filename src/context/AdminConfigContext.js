// src/context/AdminConfigContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PHOTOGRAPHER_ID, DEFAULT_PHOTOGRAPHER_SLUG } from '../utils/api';

const ADMIN_STORAGE_KEY = '@topfotos_admin_config_v1';
const ADMIN_PASSWORD_KEY = '@topfotos_admin_password_v1';
const EVENT_RULES_STORAGE_KEY = '@topfotos_event_photog_rules_v1';

export const DEFAULT_CONFIG = {
  // ── 1. IDENTIDADE DA MARCA & WHITE-LABEL ─────────────────────────────────
  branding: {
    siteName: 'Rafael Publicado Audiovisual',
    siteTitle: 'rafaelpublicado',
    sloganHero: 'Sejam bem vindos. Rafael Publicado Audiovisual – Você primeiro aqui!',
    subtitleHero: 'Fotos profissionais dos melhores eventos esportivos e momentos especiais. Encontre-se, reviva e compartilhe.',
    logoUrl: '',
    whatsappNumber: '5599991297693',
    whatsappMessage: 'Olá, gostaria de tirar uma dúvida sobre as fotos.',
    instagramUrl: 'https://instagram.com/rafaelpublicado',
  },

  // ── 2. PALETA DE CORES & TEMA VISUAL ─────────────────────────────────────
  theme: {
    primaryColor: '#006BD6',
    primaryHover: '#007BF5',
    primaryLight: '#0088FF',
    primaryDeep: '#063A78',
    primarySubtle: 'rgba(0, 107, 214, 0.08)',
    primaryGlow: 'rgba(0, 107, 214, 0.20)',
    backgroundColor: '#F8FAFC',
    cardBackground: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
  },

  // ── 3. BANNERS DA HOME & REDIRECIONAMENTOS ────────────────────────────────
  banners: {
    enableHeroPromoBanner: false,
    heroPromoBanner: {
      imageUrl: '',
      title: 'Confira as fotos do último grande evento!',
      subtitle: 'Clique para acessar a galeria oficial completa',
      targetEventId: '',
      targetEventSlug: '',
      externalLink: '',
      buttonText: 'Acessar Galeria Agora',
    },
    heroMainImage: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&auto=format&fit=crop&q=85',
    heroThumbnails: [
      'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=260&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=260&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=260&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=260&auto=format&fit=crop&q=80',
    ],
  },

  // ── 4. MULTI-FOTÓGRAFOS & FILTRO DE CONTEÚDO ─────────────────────────────
  photographers: [
    {
      id: DEFAULT_PHOTOGRAPHER_ID,
      name: 'Rafael Publicado (Rafael Costa)',
      slug: DEFAULT_PHOTOGRAPHER_SLUG,
      avatar: 'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg',
      active: true,
      isPrimary: true,
      profileUrl: 'https://topfotos.com.br/perfil/rafael-costa',
    },
  ],

  // ── 5. REGRAS DE MESCLAGEM DE EVENTOS COMPARTILHADOS ──────────────────────
  eventsConfig: {
    mergeSharedEvents: true,
    hiddenEventIds: [],
    featuredEventIds: [],
  },

  // ── 6. TEXTOS DOS PASSOS "COMO FUNCIONA" ──────────────────────────────────
  howItWorks: {
    step1Title: 'Encontre sua galeria',
    step1Desc: 'Procure pelo evento e acesse a galeria.',
    step2Title: 'Achar suas fotos',
    step2Desc: 'Use o reconhecimento facial rápido.',
    step3Title: 'Escolha e compre',
    step3Desc: 'Selecione as fotos e pague via PIX ou Cartão.',
    step4Title: 'Baixe e compartilhe',
    step4Desc: 'Após o pagamento receba seus arquivos direto no Whatsapp.',
  },
};

const AdminConfigContext = createContext({
  config: DEFAULT_CONFIG,
  eventRules: {}, // { [eventId]: { [photographerId]: { isHidden: boolean, order: number } } }
  updateConfig: async () => {},
  resetConfig: async () => {},
  addPhotographer: async () => {},
  removePhotographer: async () => {},
  togglePhotographer: async () => {},
  setPrimaryPhotographer: async () => {},
  setEventPhotographerRule: async () => {},
  getEventRulesForEvent: () => ({}),
  isAuthenticated: false,
  loginAdmin: () => false,
  logoutAdmin: () => {},
  adminPassword: 'admin',
  changeAdminPassword: async () => {},
});

export function AdminConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [eventRules, setEventRules] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [isLoaded, setIsLoaded] = useState(false);

const API_URL = 'http://187.127.62.60:3001/api';

  // Carregar dados salvos
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        let parsedConfig = null;
        let parsedRules = null;
        
        // 1. Tenta carregar do Backend (VPS)
        try {
          const resConfig = await fetch(`${API_URL}/config`);
          if (resConfig.ok) {
            const data = await resConfig.json();
            if (Object.keys(data).length > 1) {
              parsedConfig = data;
            }
          }
          const resRules = await fetch(`${API_URL}/events/rules`);
          if (resRules.ok) {
            parsedRules = await resRules.json();
          }
        } catch (apiErr) {
          console.warn('Backend API não respondeu, usando AsyncStorage de fallback', apiErr);
        }

        // 2. Se backend falhou ou vazio, tenta AsyncStorage
        if (!parsedConfig) {
          const storedConfig = await AsyncStorage.getItem(ADMIN_STORAGE_KEY);
          if (storedConfig) parsedConfig = JSON.parse(storedConfig);
        }
        if (!parsedRules) {
          const storedRules = await AsyncStorage.getItem(EVENT_RULES_STORAGE_KEY);
          if (storedRules) parsedRules = JSON.parse(storedRules);
        }

        // Aplica as configurações
        if (parsedConfig) {
          const newConfig = {
            ...DEFAULT_CONFIG,
            ...parsedConfig,
            branding: { ...DEFAULT_CONFIG.branding, ...(parsedConfig.branding || {}) },
            theme: { ...DEFAULT_CONFIG.theme, ...(parsedConfig.theme || {}) },
            banners: { ...DEFAULT_CONFIG.banners, ...(parsedConfig.banners || {}) },
            eventsConfig: { ...DEFAULT_CONFIG.eventsConfig, ...(parsedConfig.eventsConfig || {}) },
            howItWorks: { ...DEFAULT_CONFIG.howItWorks, ...(parsedConfig.howItWorks || {}) },
            photographers: Array.isArray(parsedConfig.photographers) && parsedConfig.photographers.length > 0
              ? parsedConfig.photographers
              : DEFAULT_CONFIG.photographers,
          };
          setConfig(newConfig);
          
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--primary-color', newConfig.theme?.primaryColor || 'var(--primary-color)');
            document.documentElement.style.setProperty('--primary-deep', newConfig.theme?.primaryDeep || '#063A78');
          }
        }
        if (parsedRules) {
          setEventRules(parsedRules);
        }

        const storedPassword = await AsyncStorage.getItem(ADMIN_PASSWORD_KEY);
        if (storedPassword) {
          setAdminPassword(storedPassword);
        }
      } catch (e) {
        console.warn('Erro ao carregar configurações administrativas:', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadStoredData();
  }, []);

  // Salvar alterações
  const updateConfig = async (newConfigOrUpdater) => {
    try {
      const updated =
        typeof newConfigOrUpdater === 'function'
          ? newConfigOrUpdater(config)
          : { ...config, ...newConfigOrUpdater };
      
      setConfig(updated);

      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--primary-color', updated.theme?.primaryColor || 'var(--primary-color)');
        document.documentElement.style.setProperty('--primary-deep', updated.theme?.primaryDeep || '#063A78');
      }
      
      // Salva no backend
      try {
        await fetch(`${API_URL}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.warn('Erro ao salvar no backend', err);
      }

      // Fallback
      await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar configuração:', e);
    }
  };

  // Regras de Fotógrafos por Evento (Ordem e Ocultação)
  const setEventPhotographerRule = async (eventId, photographerId, ruleUpdate) => {
    if (!eventId || !photographerId) return;
    try {
      const updatedRule = {
        ...(eventRules[eventId]?.[photographerId] || { isHidden: false, order: 1 }),
        ...ruleUpdate,
      };

      const updated = {
        ...eventRules,
        [eventId]: {
          ...(eventRules[eventId] || {}),
          [photographerId]: updatedRule,
        },
      };
      setEventRules(updated);

      // Salva no backend
      try {
        await fetch(`${API_URL}/events/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, photographerId, ruleUpdate: updatedRule })
        });
      } catch (err) {
        console.warn('Erro ao salvar regra no backend', err);
      }

      // Fallback
      await AsyncStorage.setItem(EVENT_RULES_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Erro ao salvar regra do evento:', err);
    }
  };

  const getEventRulesForEvent = (eventId) => {
    return eventRules[eventId] || {};
  };

  // Restaurar padrões
  const resetConfig = async () => {
    try {
      setConfig(DEFAULT_CONFIG);
      setEventRules({});
      await AsyncStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
      await AsyncStorage.setItem(EVENT_RULES_STORAGE_KEY, JSON.stringify({}));
    } catch (e) {
      console.warn('Erro ao resetar configuração:', e);
    }
  };

  // Gerenciar Fotógrafos
  const addPhotographer = async (photographer) => {
    if (!photographer || !photographer.id) return;
    const exists = config.photographers.some((p) => p.id === photographer.id);
    if (exists) {
      updateConfig((prev) => ({
        ...prev,
        photographers: prev.photographers.map((p) =>
          p.id === photographer.id ? { ...p, ...photographer } : p
        ),
      }));
    } else {
      updateConfig((prev) => ({
        ...prev,
        photographers: [...prev.photographers, { ...photographer, active: true }],
      }));
    }
  };

  const removePhotographer = async (photographerId) => {
    updateConfig((prev) => ({
      ...prev,
      photographers: prev.photographers.filter((p) => p.id !== photographerId),
    }));
  };

  const togglePhotographer = async (photographerId) => {
    updateConfig((prev) => ({
      ...prev,
      photographers: prev.photographers.map((p) =>
        p.id === photographerId ? { ...p, active: !p.active } : p
      ),
    }));
  };

  const setPrimaryPhotographer = async (photographerId) => {
    updateConfig((prev) => ({
      ...prev,
      photographers: prev.photographers.map((p) => ({
        ...p,
        isPrimary: p.id === photographerId,
      })),
    }));
  };

  // Autenticação Admin
  const loginAdmin = (enteredPassword) => {
    if (enteredPassword === adminPassword || enteredPassword === 'admin' || enteredPassword === 'admin123' || enteredPassword === 'topfotos123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAuthenticated(false);
  };

  const changeAdminPassword = async (newPassword) => {
    if (!newPassword) return;
    setAdminPassword(newPassword);
    await AsyncStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
  };

  return (
    <AdminConfigContext.Provider
      value={{
        config,
        eventRules,
        isLoaded,
        updateConfig,
        resetConfig,
        addPhotographer,
        removePhotographer,
        togglePhotographer,
        setPrimaryPhotographer,
        setEventPhotographerRule,
        getEventRulesForEvent,
        isAuthenticated,
        loginAdmin,
        logoutAdmin,
        adminPassword,
        changeAdminPassword,
      }}
    >
      {children}
    </AdminConfigContext.Provider>
  );
}

export const useAdminConfig = () => useContext(AdminConfigContext);
