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
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Clock,
  FileText,
  CheckSquare,
  Square,
  Smartphone,
  Copy,
  Layers,
  Settings,
  Flame,
  ShieldCheck,
  Zap,
  RefreshCw,
  Edit3,
  Image as ImageIcon,
  Link2,
  Check,
  Sliders,
} from 'lucide-react-native';
import BrandLogo from '../components/BrandLogo';
import { useAdminConfig } from '../context/AdminConfigContext';
import { fetchWhatsAppLeads } from '../utils/analytics';
import { fetchAllEvents } from '../utils/api';

const API_BASE = 'https://rafaelpublicado.com.br/api';

const DEFAULT_TEMPLATES = [
  {
    id: 'fotos_publicadas',
    title: '📸 Fotos Publicadas',
    name: 'fotos_evento_publicadas',
    headerType: 'IMAGE',
    text: 'Olá {nome}! 📸 Suas fotos do evento *{evento}* já estão disponíveis em alta resolução!\n\n👉 Encontre suas fotos pelo reconhecimento facial:\n{link_evento}\n\nGaranta suas lembranças hoje mesmo!',
    buttonText: 'Ver Minhas Fotos 📸',
  },
  {
    id: 'novo_evento',
    title: '🏁 Novo Evento',
    name: 'novo_evento_disponivel',
    headerType: 'NONE',
    text: 'Olá {nome}! 🏁 Confirmamos a cobertura oficial de fotos no evento *{evento}*!\n\nAcesse o site para acompanhar todas as fotos:\nhttps://rafaelpublicado.com.br',
    buttonText: 'Acessar Site 🌐',
  },
  {
    id: 'cupom_desconto',
    title: '🎟️ Cupom de Desconto',
    name: 'cupom_desconto_fotos',
    headerType: 'NONE',
    text: 'Olá {nome}! 🎉 Preparamos um desconto exclusivo para você adquirir o pacote de fotos do evento *{evento}*!\n\nAcesse o link e aproveite a condição especial:\n{link_evento}',
    buttonText: 'Garantir Desconto 🎟️',
  },
  {
    id: 'personalizado',
    title: '✍️ Texto Livre',
    name: 'mensagem_custom',
    headerType: 'NONE',
    text: 'Olá {nome}! Passando para compartilhar as fotos do evento {evento}:\n{link_evento}',
    buttonText: 'Abrir Galeria',
  },
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

  // Eventos & Seleção
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  // Modelo Selecionado & Mensagem
  const [selectedTemplateId, setSelectedTemplateId] = useState('fotos_publicadas');
  const [messageText, setMessageText] = useState(DEFAULT_TEMPLATES[0].text);
  const [headerImageUrl, setHeaderImageUrl] = useState('');

  // Configuração & Credenciais Meta
  const [metaToken, setMetaToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [hasMetaApi, setHasMetaApi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Envio & Fila
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [testPhone, setTestPhone] = useState('5599991297693');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const sendingRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    loadEvents();
    loadLeadsFromSite();
    loadMetaConfig();
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
          if (evs[0].cover_url) setHeaderImageUrl(evs[0].cover_url);
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
      if (res.ok) {
        setHasMetaApi(true);
        setShowSettings(false);
        alert('Credenciais da Meta salvas com sucesso!');
      }
    } catch {
      alert('Erro ao salvar credenciais.');
    }
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

  // Compila a mensagem final substituindo variáveis
  const compileMessage = (templateText, contactName = 'Cliente') => {
    const ev = currentEvent;
    const eventName = ev.name || 'Evento';
    const eventLink = `https://rafaelpublicado.com.br/evento/${ev.id || ''}`;
    const name = contactName && contactName.trim() ? contactName.trim() : 'Amigo(a)';

    return (templateText || '')
      .replace(/{nome}/g, name)
      .replace(/{evento}/g, eventName)
      .replace(/{link_evento}/g, eventLink)
      .replace(/{{1}}/g, name)
      .replace(/{{2}}/g, eventName)
      .replace(/{{3}}/g, eventLink);
  };

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(tmpl.text);
  };

  // Adicionar contato manual
  const handleAddManualContact = () => {
    const raw = cleanPhoneNumber(newPhone);
    if (raw.length < 10) {
      alert('Informe um número de WhatsApp com DDD.');
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

  // Colar lista de números
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
      alert('Nenhum número válido encontrado no texto.');
    }
  };

  // Enviar Teste Individual
  const handleSendTest = async () => {
    const raw = cleanPhoneNumber(testPhone);
    if (raw.length < 10) {
      alert('Informe seu WhatsApp com DDD.');
      return;
    }

    setIsSendingTest(true);

    if (hasMetaApi) {
      try {
        const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_title: 'Teste Individual',
            template_name: selectedTemplate?.name || 'fotos_evento_publicadas',
            language_code: 'pt_BR',
            event_id: selectedEventId,
            recipients: [
              {
                phone: raw,
                name: 'Fotógrafo',
                bodyParams: ['Fotógrafo', currentEvent.name || 'Evento', `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
              },
            ],
          }),
        });
        const data = await res.json();
        if (res.ok && data.sentSuccess > 0) {
          alert('Mensagem de teste enviada para o seu WhatsApp!');
        } else {
          alert('Erro ao enviar teste pela Meta API.');
        }
      } catch {
        alert('Erro de conexão ao enviar teste.');
      }
    } else {
      const fullMsg = compileMessage(messageText, 'Fotógrafo');
      const url = `https://api.whatsapp.com/send?phone=${raw}&text=${encodeURIComponent(fullMsg)}`;
      if (typeof window !== 'undefined') window.open(url, '_blank');
    }

    setIsSendingTest(false);
  };

  // Iniciar Disparo em Massa
  const startBroadcast = async () => {
    const selected = contacts.filter((c) => c.selected && c.status !== 'sent');
    if (selected.length === 0) {
      alert('Selecione pelo menos 1 contato com status pendente.');
      return;
    }

    // Se tiver Meta API configurada:
    if (hasMetaApi) {
      setIsSending(true);
      try {
        const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_title: `Disparo - ${currentEvent.name || 'Evento'}`,
            template_name: selectedTemplate?.name || 'fotos_evento_publicadas',
            language_code: 'pt_BR',
            event_id: selectedEventId,
            recipients: selected.map((c) => ({
              phone: c.rawPhone,
              name: c.name,
              bodyParams: [c.name || 'Cliente', currentEvent.name || 'Evento', `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
            })),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSentCount((prev) => prev + (data.sentSuccess || 0));
          setContacts((prev) =>
            prev.map((c) => {
              const resObj = (data.results || []).find((r) => r.phone === c.rawPhone);
              return resObj ? { ...c, status: resObj.status === 'sent' ? 'sent' : 'error' } : c;
            })
          );
          alert(`Disparo concluído com sucesso! ${data.sentSuccess} mensagens enviadas via Meta API.`);
        } else {
          alert('Erro ao disparar via Meta API.');
        }
      } catch (err) {
        alert(`Erro: ${err.message}`);
      }
      setIsSending(false);
      return;
    }

    // Disparo Assistido Fila Web:
    setIsSending(true);
    setIsPaused(false);
    sendingRef.current = true;
    pausedRef.current = false;

    let sent = sentCount;

    for (let i = 0; i < selected.length; i++) {
      if (!sendingRef.current) break;
      while (pausedRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (!sendingRef.current) break;
      }
      if (!sendingRef.current) break;

      const current = selected[i];
      setCurrentIndex(i + 1);

      try {
        const fullMsg = compileMessage(messageText, current.name);
        const url = `https://api.whatsapp.com/send?phone=${current.rawPhone}&text=${encodeURIComponent(fullMsg)}`;
        if (typeof window !== 'undefined') window.open(url, '_blank');

        setContacts((prev) =>
          prev.map((c) => (c.id === current.id ? { ...c, status: 'sent' } : c))
        );
        sent++;
        setSentCount(sent);
      } catch {}

      if (i < selected.length - 1 && sendingRef.current) {
        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      }
    }

    setIsSending(false);
    sendingRef.current = false;
    alert(`Disparos finalizados! ${sent} mensagens processadas.`);
  };

  const selectedTemplate = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];
  const selectedCount = contacts.filter((c) => c.selected).length;

  return (
    <View style={styles.page}>
      {/* ── TOPBAR MINIMALISTA ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BrandLogo size="md" />
            <View style={styles.badgeStatus}>
              <View style={[styles.dotStatus, { backgroundColor: hasMetaApi ? '#16A34A' : '#F59E0B' }]} />
              <Text style={styles.badgeStatusText}>
                {hasMetaApi ? 'META API CONECTADA' : 'DISPARO DIRETO'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.btnIconHeader}
              onPress={() => setShowSettings(!showSettings)}
              activeOpacity={0.8}
            >
              <Settings size={15} color="#475569" />
              <Text style={styles.btnIconHeaderText}>Configurar Token</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBack}
              onPress={() => navigation.navigate('Admin')}
              activeOpacity={0.8}
            >
              <ArrowLeft size={14} color="#0F172A" />
              <Text style={styles.btnBackText}>Voltar ao Painel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        
        {/* Painel Flutuante de Configuração Meta */}
        {showSettings && (
          <View style={styles.settingsModal}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                Credenciais da Meta WhatsApp Cloud API
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>Fechar ✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              <TextInput
                style={styles.inputMinimal}
                placeholder="ID do Número de Telefone (Phone Number ID)"
                placeholderTextColor="#94A3B8"
                value={phoneId}
                onChangeText={setPhoneId}
              />
              <TextInput
                style={styles.inputMinimal}
                placeholder="ID da Conta WhatsApp Business (WABA ID)"
                placeholderTextColor="#94A3B8"
                value={wabaId}
                onChangeText={setWabaId}
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
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Salvar Credenciais</Text>
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
                    <Users size={12} color="#006BD6" />
                    <Text style={[styles.btnActionText, { color: '#006BD6' }]}>
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
                    <CheckSquare size={15} color="#006BD6" />
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
                      Nenhum contato adicionado. Puxe os leads do site ou cole números acima.
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
                          <CheckSquare size={15} color="#006BD6" />
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

          {/* ════════ COLUNA 2: MENSAGEM & PRÉVIA AO VIVO ════════ */}
          <View style={styles.colRight}>
            <View style={styles.cardMinimal}>
              
              {/* Evento Alvo */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionLabel}>Evento das Fotos:</Text>
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
                            if (ev.cover_url) setHeaderImageUrl(ev.cover_url);
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

              {/* Seletor de Templates Minimalista */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.sectionLabel}>Modelo da Mensagem:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {DEFAULT_TEMPLATES.map((tmpl) => {
                    const isSel = selectedTemplateId === tmpl.id;
                    return (
                      <TouchableOpacity
                        key={tmpl.id}
                        style={[styles.pillTemplate, isSel && styles.pillTemplateActive]}
                        onPress={() => handleSelectTemplate(tmpl)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pillTemplateText, isSel && styles.pillTemplateTextActive]}>
                          {tmpl.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Editor do Texto */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionLabel}>Texto da Mensagem:</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8' }}>Variáveis: {'{nome}'}, {'{evento}'}, {'{link_evento}'}</Text>
                </View>

                <TextInput
                  style={[styles.inputMinimal, { height: 95, textAlignVertical: 'top', marginTop: 4 }]}
                  multiline
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Escreva a mensagem aqui..."
                />
              </View>

              {/* ─── PRÉVIA OFICIAL WHATSAPP MINIMALISTA ─── */}
              <View style={styles.previewContainer}>
                <View style={styles.previewHeader}>
                  <Smartphone size={13} color="#16A34A" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>
                    Prévia Oficial no WhatsApp
                  </Text>
                </View>

                <View style={styles.previewBubble}>
                  {/* Foto da Capa do Evento */}
                  {selectedTemplate.headerType === 'IMAGE' && (
                    <View style={styles.previewImgBox}>
                      <Image
                        source={{ uri: headerImageUrl || currentEvent.cover_url || 'https://rafaelpublicado.com.br/assets/logo.png' }}
                        style={styles.previewImg}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Texto Formatado */}
                  <Text style={styles.previewText}>
                    {compileMessage(messageText, 'Rafael')}
                  </Text>

                  {/* Rodapé e Checkmark */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Rafael Publicado Audiovisual</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 9, color: '#94A3B8' }}>14:30</Text>
                      <CheckCircle2 size={10} color="#0284C7" />
                    </View>
                  </View>

                  {/* Botão Interativo */}
                  {selectedTemplate.buttonText && (
                    <View style={styles.previewButtonRow}>
                      <ExternalLink size={12} color="#006BD6" />
                      <Text style={styles.previewButtonText}>{selectedTemplate.buttonText}</Text>
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
                  onPress={handleSendTest}
                  disabled={isSendingTest}
                  activeOpacity={0.85}
                >
                  <Send size={12} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ─── BOTÃO PRINCIPAL DE DISPARO ─── */}
              <View style={{ marginTop: 16 }}>
                {!isSending ? (
                  <TouchableOpacity
                    style={styles.btnStartBroadcast}
                    onPress={startBroadcast}
                    activeOpacity={0.88}
                  >
                    <Zap size={18} color="#FFFFFF" />
                    <Text style={styles.btnStartBroadcastText}>
                      DISPARAR PARA {selectedCount} CONTATOS
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 8 }}>
                    <View style={styles.progressBox}>
                      <ActivityIndicator size="small" color="#16A34A" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>
                        Enviando mensagem {currentIndex} de {selectedCount}...
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {isPaused ? (
                        <TouchableOpacity
                          style={[styles.btnCtrl, { backgroundColor: '#16A34A' }]}
                          onPress={() => {
                            setIsPaused(false);
                            pausedRef.current = false;
                          }}
                        >
                          <Play size={14} color="#FFFFFF" />
                          <Text style={styles.btnCtrlText}>Continuar</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.btnCtrl, { backgroundColor: '#D97706' }]}
                          onPress={() => {
                            setIsPaused(true);
                            pausedRef.current = true;
                          }}
                        >
                          <Pause size={14} color="#FFFFFF" />
                          <Text style={styles.btnCtrlText}>Pausar</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.btnCtrl, { backgroundColor: '#DC2626' }]}
                        onPress={() => {
                          setIsSending(false);
                          sendingRef.current = false;
                        }}
                      >
                        <RotateCcw size={14} color="#FFFFFF" />
                        <Text style={styles.btnCtrlText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dotStatus: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
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
    backgroundColor: '#006BD6',
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
    backgroundColor: '#006BD6',
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
    backgroundColor: '#006BD6',
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
    borderColor: '#006BD6',
  },
  pillEventText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillEventTextActive: {
    color: '#006BD6',
    fontWeight: '800',
  },
  pillTemplate: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillTemplateActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  pillTemplateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pillTemplateTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  previewText: {
    fontSize: 12,
    color: '#111827',
    lineHeight: 17,
  },
  previewButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  previewButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006BD6',
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
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
  },
  btnStartBroadcastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  btnCtrl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnCtrlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
