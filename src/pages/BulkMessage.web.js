import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Send,
  Users,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckSquare,
  Square,
  Smartphone,
  Check,
  Lock,
} from 'lucide-react-native';
import BrandLogo from '../components/BrandLogo';
import { useAdminConfig } from '../context/AdminConfigContext';
import { fetchWhatsAppLeads } from '../utils/analytics';
import { fetchAllEvents } from '../utils/api';

const API_BASE = 'https://rafaelpublicado.com.br/api';

const OFFICIAL_META_TEMPLATES = [
  {
    id: '1',
    name: 'fotos_evento_publicadas',
    displayName: '📸 Fotos Publicadas (com Capa e Botão)',
    category: 'MARKETING',
    language: 'pt_BR',
    header_type: 'IMAGE',
    header_content: 'https://rafaelpublicado.com.br/assets/logo.png',
    body_text: 'Olá {{1}}! 📸 Suas fotos do evento *{{2}}* já estão disponíveis em alta resolução no site oficial! Clique no botão abaixo para encontrar suas fotos em segundos pelo reconhecimento facial:',
    footer_text: 'Rafael Publicado Audiovisual • Atendimento oficial',
    buttons: [
      { type: 'URL', text: 'Ver Minhas Fotos 📸', url: 'https://rafaelpublicado.com.br/evento/{{1}}' },
      { type: 'QUICK_REPLY', text: 'Falar no Suporte 💬' }
    ],
    meta_status: 'APPROVED',
  },
  {
    id: '2',
    name: 'novo_evento_disponivel',
    displayName: '🏁 Novo Evento Confirmado',
    category: 'UTILITY',
    language: 'pt_BR',
    header_type: 'TEXT',
    header_content: 'Cobertura Oficial Confirmada 🏁',
    body_text: 'Olá {{1}}, tudo bem? Confirmamos a cobertura oficial de fotos no próximo evento *{{2}}*! Acompanhe as novidades e garanta seu registro.',
    footer_text: 'Rafael Publicado Audiovisual',
    buttons: [
      { type: 'URL', text: 'Acessar Site Oficial 🌐', url: 'https://rafaelpublicado.com.br' }
    ],
    meta_status: 'APPROVED',
  },
  {
    id: '3',
    name: 'cupom_desconto_fotos',
    displayName: '🎟️ Cupom de Desconto Especial',
    category: 'MARKETING',
    language: 'pt_BR',
    header_type: 'TEXT',
    header_content: 'Desconto Especial de Fotos 🎟️',
    body_text: 'Olá {{1}}! Preparamos um desconto progressivo exclusivo para você garantir todas as suas fotos do evento *{{2}}*. Acesse pelo link abaixo e aplique seu desconto:',
    footer_text: 'Rafael Publicado Audiovisual',
    buttons: [
      { type: 'URL', text: 'Garantir Desconto 🎟️', url: 'https://rafaelpublicado.com.br/evento/{{1}}' },
      { type: 'QUICK_REPLY', text: 'Tirar Dúvidas' }
    ],
    meta_status: 'APPROVED',
  }
];

export default function BulkMessage() {
  const navigation = useNavigation();
  const { config } = useAdminConfig();

  // Contatos
  const [contacts, setContacts] = useState([]);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Eventos Cadastrados
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  // Modelos Oficiais da Meta
  const [metaTemplates, setMetaTemplates] = useState(OFFICIAL_META_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState(OFFICIAL_META_TEMPLATES[0]);
  const [customHeaderImg, setCustomHeaderImg] = useState('');

  // Configuração & Credenciais Meta
  const [metaToken, setMetaToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [hasMetaApi, setHasMetaApi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Teste & Disparo
  const [testPhone, setTestPhone] = useState('5599991297693');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [sentSuccessCount, setSentSuccessCount] = useState(0);

  useEffect(() => {
    loadEvents();
    loadLeadsFromSite();
    loadMetaConfig();
    loadMetaTemplates();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetchAllEvents();
      if (res.ok) {
        const data = await res.json();
        const evs = data.results || [];
        setEventsList(evs);
        if (evs.length > 0) {
          setSelectedEventId(evs[0].id);
          if (evs[0].cover_url) setCustomHeaderImg(evs[0].cover_url);
        }
      }
    } catch {}
  };

  const loadLeadsFromSite = async () => {
    setLoadingLeads(true);
    try {
      const leads = await fetchWhatsAppLeads();
      if (leads && leads.length > 0) {
        const formatted = leads.map((l, idx) => ({
          id: l.id || `lead_${idx}`,
          name: l.name || '',
          phone: formatPhone(l.whatsapp),
          rawPhone: cleanPhoneNumber(l.whatsapp),
          selected: true,
          status: 'pending',
        }));
        setContacts(formatted);
      }
    } catch {}
    setLoadingLeads(false);
  };

  const loadMetaConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/meta/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setPhoneId(data.config.phone_number_id || '');
          setWabaId(data.config.waba_id || '');
          setHasMetaApi(Boolean(data.config.has_token));
        }
      }
    } catch {}
  };

  const loadMetaTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/meta/templates`);
      if (res.ok) {
        const data = await res.json();
        if (data.templates && data.templates.length > 0) {
          setMetaTemplates(data.templates);
          setSelectedTemplate(data.templates[0]);
        }
      }
    } catch {}
  };

  const handleSaveMetaConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/meta/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phoneId,
          waba_id: wabaId,
          access_token: metaToken,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasMetaApi(true);
        setShowSettings(false);
        loadMetaTemplates();
        alert(data.message || 'Credenciais da Meta salvas com sucesso!');
      }
    } catch {
      alert('Erro ao salvar credenciais.');
    }
  };

  const handleSyncTemplates = async () => {
    setSyncingMeta(true);
    try {
      const res = await fetch(`${API_BASE}/meta/sync-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waba_id: wabaId,
          access_token: metaToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.templates) {
        setMetaTemplates(data.templates);
        if (data.templates.length > 0) setSelectedTemplate(data.templates[0]);
        alert(data.message || 'Modelos Meta sincronizados com sucesso!');
      } else {
        alert(data.error || 'Erro ao sincronizar com a Meta.');
      }
    } catch (err) {
      alert(`Falha na conexão: ${err.message}`);
    }
    setSyncingMeta(false);
  };

  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    let clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      clean = `55${clean}`;
    }
    return clean;
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    if (clean.length === 13 && clean.startsWith('55')) {
      const ddd = clean.slice(2, 4);
      const num = clean.slice(4);
      return `+55 (${ddd}) ${num.length === 9 ? num.slice(0, 5) + '-' + num.slice(5) : num}`;
    }
    return phone;
  };

  const getSelectedEventObj = () => {
    return eventsList.find((e) => e.id === selectedEventId) || eventsList[0] || {};
  };

  const currentEvent = getSelectedEventObj();

  // Substituição dinâmica das variáveis Meta {{1}}, {{2}}, {{3}}
  const compileMetaMessage = (bodyText, contactName = 'Cliente') => {
    const eventName = currentEvent.name || 'Evento';
    const eventLink = `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`;
    const name = contactName && contactName.trim() ? contactName.trim() : 'Amigo(a)';

    return (bodyText || '')
      .replace(/{{1}}/g, name)
      .replace(/{{2}}/g, eventName)
      .replace(/{{3}}/g, eventLink);
  };

  // Adicionar contato manual
  const handleAddManualContact = () => {
    const raw = cleanPhoneNumber(newPhone);
    if (raw.length < 10) {
      alert('Informe um número de WhatsApp válido com DDD.');
      return;
    }

    const newC = {
      id: `manual_${Date.now()}`,
      name: newName.trim(),
      phone: formatPhone(newPhone),
      rawPhone: raw,
      selected: true,
      status: 'pending',
    };

    setContacts((prev) => [newC, ...prev]);
    setNewPhone('');
    setNewName('');
  };

  // Colar múltiplos números
  const handleImportPasted = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/[\n,;]+/);
    const newItems = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let name = '';
      let phone = trimmed;

      if (trimmed.includes('-') && !trimmed.match(/^\+?[0-9()\s-]+$/)) {
        const parts = trimmed.split('-');
        name = parts[0].trim();
        phone = parts[1].trim();
      }

      const raw = cleanPhoneNumber(phone);
      if (raw.length >= 10) {
        newItems.push({
          id: `paste_${Date.now()}_${Math.random()}`,
          name,
          phone: formatPhone(phone),
          rawPhone: raw,
          selected: true,
          status: 'pending',
        });
      }
    });

    if (newItems.length > 0) {
      setContacts((prev) => [...newItems, ...prev]);
      setPasteText('');
      setShowPasteBox(false);
      alert(`${newItems.length} contatos adicionados!`);
    } else {
      alert('Nenhum número válido encontrado.');
    }
  };

  // Disparo de Teste Individual
  const handleSendTestMessage = async () => {
    const raw = cleanPhoneNumber(testPhone);
    if (raw.length < 10) {
      alert('Informe seu WhatsApp com DDD para testar.');
      return;
    }

    setIsSendingTest(true);

    if (hasMetaApi) {
      try {
        const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_title: 'Teste Individual Meta',
            template_name: selectedTemplate?.name,
            language_code: selectedTemplate?.language || 'pt_BR',
            event_id: selectedEventId,
            recipients: [
              {
                phone: raw,
                name: 'Fotógrafo',
                headerImage: customHeaderImg || currentEvent.cover_url,
                bodyParams: ['Fotógrafo', currentEvent.name || 'Evento', `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
              },
            ],
          }),
        });
        const data = await res.json();
        if (res.ok && data.sentSuccess > 0) {
          alert('Mensagem oficial da Meta enviada com sucesso para seu WhatsApp!');
        } else {
          alert(`Erro Meta: ${data.error || 'Verifique as credenciais da API'}`);
        }
      } catch (err) {
        alert(`Erro de envio: ${err.message}`);
      }
    } else {
      // Disparo direto Web
      const fullMsg = compileMetaMessage(selectedTemplate?.body_text, 'Fotógrafo');
      const footer = selectedTemplate?.footer_text ? `\n\n_${selectedTemplate.footer_text}_` : '';
      const encoded = encodeURIComponent(`${fullMsg}${footer}`);
      const url = `https://api.whatsapp.com/send?phone=${raw}&text=${encoded}`;
      if (typeof window !== 'undefined') window.open(url, '_blank');
    }

    setIsSendingTest(false);
  };

  // Disparo em Massa Oficial Meta
  const startMetaBroadcast = async () => {
    const selected = contacts.filter((c) => c.selected && c.status !== 'sent');
    if (selected.length === 0) {
      alert('Selecione pelo menos 1 contato com status pendente.');
      return;
    }

    setIsSendingBroadcast(true);

    if (hasMetaApi) {
      try {
        const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_title: `Disparo Meta - ${currentEvent.name || 'Evento'}`,
            template_name: selectedTemplate?.name,
            language_code: selectedTemplate?.language || 'pt_BR',
            event_id: selectedEventId,
            recipients: selected.map((c) => ({
              phone: c.rawPhone,
              name: c.name,
              headerImage: customHeaderImg || currentEvent.cover_url,
              bodyParams: [c.name || 'Cliente', currentEvent.name || 'Evento', `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
            })),
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSentSuccessCount((prev) => prev + (data.sentSuccess || 0));
          setContacts((prev) =>
            prev.map((c) => {
              const resObj = (data.results || []).find((r) => r.phone === c.rawPhone);
              return resObj ? { ...c, status: resObj.status === 'sent' ? 'sent' : 'error' } : c;
            })
          );
          alert(`Disparo Oficial Meta Concluído! ${data.sentSuccess} mensagens enviadas via Meta Cloud API.`);
        } else {
          alert(`Erro Meta: ${data.error || 'Verifique as credenciais da API'}`);
        }
      } catch (err) {
        alert(`Erro de conexão: ${err.message}`);
      }
    } else {
      // Disparo em fila Web caso ainda não tenha inserido o token
      for (let i = 0; i < selected.length; i++) {
        const current = selected[i];
        const fullMsg = compileMetaMessage(selectedTemplate?.body_text, current.name);
        const footer = selectedTemplate?.footer_text ? `\n\n_${selectedTemplate.footer_text}_` : '';
        const url = `https://api.whatsapp.com/send?phone=${current.rawPhone}&text=${encodeURIComponent(fullMsg + footer)}`;
        if (typeof window !== 'undefined') window.open(url, '_blank');

        setContacts((prev) =>
          prev.map((c) => (c.id === current.id ? { ...c, status: 'sent' } : c))
        );
        await new Promise((r) => setTimeout(r, 4000));
      }
      alert('Disparos finalizados com sucesso!');
    }

    setIsSendingBroadcast(false);
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

  // Botões do template selecionado
  let parsedButtons = [];
  try {
    if (selectedTemplate?.buttons) {
      parsedButtons = typeof selectedTemplate.buttons === 'string'
        ? JSON.parse(selectedTemplate.buttons)
        : selectedTemplate.buttons;
    }
  } catch {}

  return (
    <View style={styles.page}>
      {/* ── TOPBAR MINIMALISTA ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BrandLogo size="md" />
            <View style={styles.metaBadge}>
              <Zap size={13} color="#0084FF" />
              <Text style={styles.metaBadgeText}>META WHATSAPP CLOUD API</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {hasMetaApi && (
              <TouchableOpacity
                style={styles.btnSyncTop}
                onPress={handleSyncTemplates}
                disabled={syncingMeta}
                activeOpacity={0.8}
              >
                <RefreshCw size={13} color="#0084FF" />
                <Text style={styles.btnSyncTopText}>
                  {syncingMeta ? 'Sincronizando...' : 'Puxar Templates da Meta'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btnIconHeader}
              onPress={() => setShowSettings(!showSettings)}
              activeOpacity={0.8}
            >
              <Settings size={14} color="#475569" />
              <Text style={styles.btnIconHeaderText}>
                {hasMetaApi ? 'Credenciais Conectadas ✓' : 'Inserir Token Meta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBack}
              onPress={() => navigation.navigate('Admin')}
              activeOpacity={0.8}
            >
              <ArrowLeft size={14} color="#0F172A" />
              <Text style={styles.btnBackText}>Painel Admin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Painel de Configuração Meta API (Abre apenas se solicitado) */}
        {showSettings && (
          <View style={styles.settingsModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                Credenciais Oficiais da Meta (WhatsApp Business Cloud API)
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>Fechar ✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <TextInput
                style={styles.inputMinimal}
                placeholder="ID da Conta WhatsApp Business (WABA ID)"
                placeholderTextColor="#94A3B8"
                value={wabaId}
                onChangeText={setWabaId}
              />
              <TextInput
                style={styles.inputMinimal}
                placeholder="ID do Número de Telefone (Phone Number ID)"
                placeholderTextColor="#94A3B8"
                value={phoneId}
                onChangeText={setPhoneId}
              />
              <TextInput
                style={[styles.inputMinimal, { height: 60 }]}
                multiline
                placeholder="Token de Acesso Permanente Meta (Bearer EAA...)"
                placeholderTextColor="#94A3B8"
                value={metaToken}
                onChangeText={setMetaToken}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.btnSaveSettings}
                onPress={handleSaveMetaConfig}
                activeOpacity={0.88}
              >
                <Check size={15} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Salvar e Sincronizar Modelos</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── GRID PRINCIPAL: 2 COLUNAS LIMPAS ── */}
        <View style={styles.mainGrid}>
          
          {/* ════════ COLUNA 1: DESTINATÁRIOS (AUDIÊNCIA) ════════ */}
          <View style={styles.colLeft}>
            <View style={styles.cardMinimal}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>1. Destinatários ({contacts.length})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.btnAction}
                    onPress={loadLeadsFromSite}
                    disabled={loadingLeads}
                    activeOpacity={0.8}
                  >
                    <Users size={12} color="#0084FF" />
                    <Text style={[styles.btnActionText, { color: '#0084FF' }]}>
                      {loadingLeads ? 'Puxando...' : 'Puxar Leads'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAction}
                    onPress={() => setShowPasteBox(!showPasteBox)}
                    activeOpacity={0.8}
                  >
                    <Upload size={12} color="#475569" />
                    <Text style={styles.btnActionText}>Colar Lista</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Caixa Rápida para Colar Vários Números */}
              {showPasteBox && (
                <View style={styles.pasteBox}>
                  <TextInput
                    style={[styles.inputMinimal, { height: 75, textAlignVertical: 'top' }]}
                    multiline
                    placeholder="Cole os números aqui (separados por vírgula ou linha)..."
                    placeholderTextColor="#94A3B8"
                    value={pasteText}
                    onChangeText={setPasteText}
                  />
                  <TouchableOpacity
                    style={styles.btnImportPaste}
                    onPress={handleImportPasted}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Importar Contatos</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Adicionar Contato Manual */}
              <View style={styles.rowAddContact}>
                <TextInput
                  style={[styles.inputMinimal, { flex: 1 }]}
                  placeholder="Nome (opcional)"
                  placeholderTextColor="#94A3B8"
                  value={newName}
                  onChangeText={setNewName}
                />
                <TextInput
                  style={[styles.inputMinimal, { width: 140 }]}
                  placeholder="WhatsApp com DDD"
                  placeholderTextColor="#94A3B8"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={styles.btnAdd}
                  onPress={handleAddManualContact}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Barra de Seleção */}
              <View style={styles.selectionBar}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => {
                    const allSel = contacts.every((c) => c.selected);
                    setContacts((prev) => prev.map((c) => ({ ...c, selected: !allSel })));
                  }}
                >
                  {contacts.length > 0 && contacts.every((c) => c.selected) ? (
                    <CheckSquare size={15} color="#0084FF" />
                  ) : (
                    <Square size={15} color="#94A3B8" />
                  )}
                  <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>
                    Selecionar Todos ({selectedCount})
                  </Text>
                </TouchableOpacity>

                {contacts.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (confirm('Limpar todos os contatos?')) setContacts([]);
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Limpar Lista</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Lista Scrollável de Contatos */}
              <ScrollView style={styles.contactsScroll} nestedScrollEnabled>
                {contacts.length === 0 ? (
                  <View style={{ padding: 28, alignItems: 'center' }}>
                    <Users size={28} color="#CBD5E1" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: '#94A3B8' }}>
                      Nenhum contato na lista. Puxe os leads do site ou cole números acima.
                    </Text>
                  </View>
                ) : (
                  contacts.map((c, idx) => (
                    <View key={c.id || idx} style={styles.contactItem}>
                      <TouchableOpacity
                        onPress={() =>
                          setContacts((prev) =>
                            prev.map((item) => (item.id === c.id ? { ...item, selected: !item.selected } : item))
                          )
                        }
                        style={{ padding: 4 }}
                      >
                        {c.selected ? (
                          <CheckSquare size={15} color="#0084FF" />
                        ) : (
                          <Square size={15} color="#CBD5E1" />
                        )}
                      </TouchableOpacity>

                      <View style={{ flex: 1, marginLeft: 6 }}>
                        <Text style={styles.contactItemName}>{c.name || 'Cliente / Lead'}</Text>
                        <Text style={styles.contactItemPhone}>{c.phone}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {c.status === 'sent' && (
                          <View style={styles.badgeSent}>
                            <Text style={styles.badgeSentText}>Enviado ✓</Text>
                          </View>
                        )}

                        <TouchableOpacity
                          onPress={() => setContacts((prev) => prev.filter((item) => item.id !== c.id))}
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={13} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>

          {/* ════════ COLUNA 2: MODELOS META OFICIAIS & PREVIEW ════════ */}
          <View style={styles.colRight}>
            <View style={styles.cardMinimal}>
              
              {/* Evento Alvo */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionLabel}>Evento Vinculado:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {eventsList.map((ev) => {
                      const isSel = ev.id === selectedEventId;
                      return (
                        <TouchableOpacity
                          key={ev.id}
                          style={[styles.pillEvent, isSel && styles.pillEventActive]}
                          onPress={() => {
                            setSelectedEventId(ev.id);
                            if (ev.cover_url) setCustomHeaderImg(ev.cover_url);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.pillEventText, isSel && styles.pillEventTextActive]}>
                            {ev.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Seletor de Modelos Aprovados da Meta */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionLabel}>Modelos Aprovados na Meta (HSM):</Text>
                  <View style={styles.badgeMetaApproved}>
                    <ShieldCheck size={11} color="#16A34A" />
                    <Text style={styles.badgeMetaApprovedText}>APROVADO META</Text>
                  </View>
                </View>

                <View style={{ gap: 6, marginTop: 6 }}>
                  {metaTemplates.map((tmpl) => {
                    const isSel = selectedTemplate?.id === tmpl.id;
                    return (
                      <TouchableOpacity
                        key={tmpl.id}
                        style={[styles.templateMetaPill, isSel && styles.templateMetaPillActive]}
                        onPress={() => setSelectedTemplate(tmpl)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.templateMetaPillTitle, isSel && styles.templateMetaPillTitleActive]}>
                            {tmpl.displayName || tmpl.name}
                          </Text>
                          <Text style={styles.templateMetaCategory}>{tmpl.category}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Texto do Modelo Meta (Bloqueado para edição livre conforme norma da Meta) */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Lock size={12} color="#64748B" />
                  <Text style={styles.sectionLabel}>Texto Oficial do Modelo:</Text>
                </View>

                <View style={styles.lockedTemplateBox}>
                  <Text style={styles.lockedTemplateText}>
                    {selectedTemplate?.body_text}
                  </Text>
                </View>
              </View>

              {/* ─── PRÉVIA OFICIAL WHATSAPP MINIMALISTA ─── */}
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Smartphone size={13} color="#16A34A" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>
                    Pré-visualização Oficial no WhatsApp
                  </Text>
                </View>

                <View style={styles.previewBubble}>
                  {/* Foto da Capa do Evento no Header */}
                  {selectedTemplate?.header_type === 'IMAGE' && (
                    <View style={styles.previewImgBox}>
                      <Image
                        source={{ uri: customHeaderImg || currentEvent.cover_url || 'https://rafaelpublicado.com.br/assets/logo.png' }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Header de Texto */}
                  {selectedTemplate?.header_type === 'TEXT' && (
                    <Text style={styles.previewHeaderText}>
                      {selectedTemplate.header_content || 'Aviso Oficial'}
                    </Text>
                  )}

                  {/* Texto com Variáveis Resolvidas */}
                  <Text style={styles.previewText}>
                    {compileMetaMessage(selectedTemplate?.body_text, 'Rafael Costa')}
                  </Text>

                  {/* Rodapé Oficial */}
                  {selectedTemplate?.footer_text && (
                    <Text style={styles.previewFooterText}>
                      {selectedTemplate.footer_text}
                    </Text>
                  )}

                  {/* Botões Oficiais da Meta */}
                  {parsedButtons.length > 0 && (
                    <View style={styles.previewButtonRow}>
                      {parsedButtons.map((btn, bIdx) => (
                        <View key={bIdx} style={styles.previewBtnItem}>
                          <ExternalLink size={11} color="#0084FF" />
                          <Text style={styles.previewButtonText}>{btn.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Testar Individualmente */}
              <View style={styles.rowTest}>
                <TextInput
                  style={[styles.inputMinimal, { flex: 1, height: 36, paddingVertical: 4 }]}
                  value={testPhone}
                  onChangeText={setTestPhone}
                  placeholder="Seu WhatsApp (ex: 5599991297693)"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={styles.btnTest}
                  onPress={handleSendTestMessage}
                  disabled={isSendingTest}
                  activeOpacity={0.85}
                >
                  <Send size={12} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ─── BOTÃO PRINCIPAL DE DISPARO VIA META ─── */}
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.btnStartBroadcast}
                  onPress={startMetaBroadcast}
                  disabled={isSendingBroadcast}
                  activeOpacity={0.88}
                >
                  {isSendingBroadcast ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Zap size={18} color="#FFFFFF" />
                      <Text style={styles.btnStartBroadcastText}>
                        DISPARAR VIA META CLOUD API ({selectedCount} CONTATOS)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

// ─── ESTILOS MINIMALISTAS E MODERNOS ──────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    height: 64,
    justifyContent: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  topbarInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0084FF',
    letterSpacing: 0.3,
  },
  btnSyncTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnSyncTopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0084FF',
  },
  btnIconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  btnIconHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  btnBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
  },
  settingsModal: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  btnSaveSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0084FF',
    paddingVertical: 10,
    borderRadius: 8,
  },
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  colLeft: {
    flex: 1,
    minWidth: 340,
  },
  colRight: {
    flex: 1.2,
    minWidth: 360,
  },
  cardMinimal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inputMinimal: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },
  pasteBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  btnImportPaste: {
    backgroundColor: '#0084FF',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  rowAddContact: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  btnAdd: {
    width: 36,
    height: 36,
    backgroundColor: '#0084FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 6,
  },
  contactsScroll: {
    maxHeight: 380,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  contactItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactItemPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  badgeSent: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pillEvent: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillEventActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0084FF',
  },
  pillEventText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillEventTextActive: {
    color: '#0084FF',
    fontWeight: '800',
  },
  badgeMetaApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMetaApprovedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  templateMetaPill: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateMetaPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0084FF',
    borderWidth: 1.5,
  },
  templateMetaPillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  templateMetaPillTitleActive: {
    color: '#0084FF',
    fontWeight: '800',
  },
  templateMetaCategory: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  lockedTemplateBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  lockedTemplateText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  previewContainer: {
    backgroundColor: '#EFEAE2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  previewBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
  },
  previewImgBox: {
    width: '100%',
    height: 110,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#0F172A',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 17,
  },
  previewFooterText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
  },
  previewButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewBtnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  previewButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0084FF',
  },
  rowTest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnTest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 8,
  },
  btnStartBroadcast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0084FF',
    paddingVertical: 14,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0, 132, 255, 0.25)',
  },
  btnStartBroadcastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
