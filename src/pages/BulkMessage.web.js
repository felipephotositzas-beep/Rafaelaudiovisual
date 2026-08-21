import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Send, Users, ExternalLink, ArrowLeft, Settings, ShieldCheck,
  Zap, RefreshCw, CheckSquare, Square, Smartphone, Check,
  Lock, Upload, Plus, Trash2, AlertCircle,
} from 'lucide-react-native';
import BrandLogo from '../components/BrandLogo';
import { useAdminConfig } from '../context/AdminConfigContext';
import { fetchWhatsAppLeads } from '../utils/analytics';
import { fetchAllEvents } from '../utils/api';

const API_BASE = 'https://rafaelpublicado.com.br/api';

export default function BulkMessage() {
  const navigation = useNavigation();

  // Contatos
  const [contacts, setContacts] = useState([]);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Eventos
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  // Templates — apenas da Meta, sem fallback hardcoded
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Credenciais Meta
  const [metaToken, setMetaToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [hasMetaApi, setHasMetaApi] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Envio
  const [testPhone, setTestPhone] = useState('5599991297693');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

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
        if (evs.length > 0) setSelectedEventId(evs[0].id);
      }
    } catch {}
  };

  const loadLeadsFromSite = async () => {
    setLoadingLeads(true);
    try {
      const leads = await fetchWhatsAppLeads();
      if (leads && leads.length > 0) {
        setContacts(leads.map((l, idx) => ({
          id: l.id || `lead_${idx}`,
          name: l.name || '',
          phone: formatPhone(l.whatsapp),
          rawPhone: cleanPhone(l.whatsapp),
          selected: true,
          status: 'pending',
        })));
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
          const connected = Boolean(data.config.has_token);
          setHasMetaApi(connected);
          // Se já tem token, puxar templates reais
          if (connected) fetchRealTemplates();
        }
      }
    } catch {}
  };

  // Busca templates salvos no banco (que foram puxados da Meta)
  const fetchRealTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/meta/templates`);
      if (res.ok) {
        const data = await res.json();
        const templates = data.templates || [];
        setMetaTemplates(templates);
        if (templates.length > 0) setSelectedTemplate(templates[0]);
      }
    } catch {}
  };

  const handleSaveMetaConfig = async () => {
    if (!wabaId || !phoneId || !metaToken) {
      alert('Preencha o WABA ID, Phone Number ID e Token de Acesso.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/meta/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_id: phoneId, waba_id: wabaId, access_token: metaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasMetaApi(true);
        // Sincroniza templates imediatamente após salvar
        await handleSyncTemplates(wabaId, metaToken);
        setShowSettings(false);
      } else {
        alert(data.error || 'Erro ao salvar credenciais.');
      }
    } catch {
      alert('Erro de conexão ao salvar credenciais.');
    }
  };

  const handleSyncTemplates = async (wid, tok) => {
    setSyncingMeta(true);
    try {
      const res = await fetch(`${API_BASE}/meta/sync-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waba_id: wid || wabaId, access_token: tok || metaToken }),
      });
      const data = await res.json();
      if (res.ok && data.templates && data.templates.length > 0) {
        setMetaTemplates(data.templates);
        setSelectedTemplate(data.templates[0]);
        if (!tok) alert(`${data.templates.length} modelos carregados da sua conta Meta!`);
      } else {
        if (!tok) alert(data.error || 'Nenhum modelo APPROVED encontrado na conta Meta.');
      }
    } catch (err) {
      if (!tok) alert(`Falha: ${err.message}`);
    }
    setSyncingMeta(false);
  };

  const cleanPhone = (phone) => {
    if (!phone) return '';
    let c = String(phone).replace(/\D/g, '');
    if (c.length === 10 || c.length === 11) c = `55${c}`;
    return c;
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const c = String(phone).replace(/\D/g, '');
    if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
    if (c.length === 13 && c.startsWith('55')) {
      const n = c.slice(4);
      return `+55 (${c.slice(2, 4)}) ${n.slice(0, 5)}-${n.slice(5)}`;
    }
    return phone;
  };

  const currentEvent = eventsList.find((e) => e.id === selectedEventId) || eventsList[0] || {};

  const compilePreview = (bodyText, contactName = 'Rafael Costa') => {
    const name = contactName.trim() || 'Amigo(a)';
    const eventName = currentEvent.name || 'Evento';
    const eventLink = `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`;
    return (bodyText || '')
      .replace(/{{1}}/g, name)
      .replace(/{{2}}/g, eventName)
      .replace(/{{3}}/g, eventLink);
  };

  const handleAddContact = () => {
    const raw = cleanPhone(newPhone);
    if (raw.length < 10) { alert('Informe um número de WhatsApp válido com DDD.'); return; }
    setContacts((prev) => [{
      id: `manual_${Date.now()}`, name: newName.trim(),
      phone: formatPhone(newPhone), rawPhone: raw, selected: true, status: 'pending',
    }, ...prev]);
    setNewPhone(''); setNewName('');
  };

  const handleImportPasted = () => {
    const lines = pasteText.split(/[\n,;]+/);
    const newItems = [];
    lines.forEach((line) => {
      const t = line.trim(); if (!t) return;
      let name = '', phone = t;
      if (t.includes('-') && !t.match(/^\+?[0-9()\s-]+$/)) {
        const p = t.split('-'); name = p[0].trim(); phone = p[1].trim();
      }
      const raw = cleanPhone(phone);
      if (raw.length >= 10) newItems.push({
        id: `p_${Date.now()}_${Math.random()}`, name, phone: formatPhone(phone),
        rawPhone: raw, selected: true, status: 'pending',
      });
    });
    if (newItems.length > 0) {
      setContacts((prev) => [...newItems, ...prev]);
      setPasteText(''); setShowPasteBox(false);
      alert(`${newItems.length} contatos adicionados!`);
    } else alert('Nenhum número válido encontrado.');
  };

  const handleSendTest = async () => {
    if (!hasMetaApi) { alert('Configure o Token da Meta antes de enviar.'); return; }
    if (!selectedTemplate) { alert('Selecione um modelo para enviar.'); return; }
    const raw = cleanPhone(testPhone);
    if (raw.length < 10) { alert('Informe seu WhatsApp com DDD.'); return; }
    setIsSendingTest(true);
    try {
      const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_title: 'Teste Individual Meta',
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language || 'pt_BR',
          event_id: selectedEventId,
          recipients: [{
            phone: raw, name: 'Fotógrafo',
            headerImage: currentEvent.cover_url || '',
            bodyParams: ['Fotógrafo', currentEvent.name || 'Evento',
              `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
          }],
        }),
      });
      const data = await res.json();
      if (res.ok && data.sentSuccess > 0) {
        alert('✅ Mensagem oficial Meta enviada com sucesso para seu WhatsApp!');
      } else {
        alert(`❌ Erro Meta: ${data.error || (data.results?.[0]?.error) || 'Verifique as credenciais.'}`);
      }
    } catch (err) { alert(`Erro: ${err.message}`); }
    setIsSendingTest(false);
  };

  const handleBroadcast = async () => {
    if (!hasMetaApi) { alert('Configure o Token da Meta antes de disparar.'); return; }
    if (!selectedTemplate) { alert('Selecione um modelo aprovado da Meta.'); return; }
    const selected = contacts.filter((c) => c.selected && c.status !== 'sent');
    if (selected.length === 0) { alert('Selecione pelo menos 1 contato pendente.'); return; }

    setIsSendingBroadcast(true);
    try {
      const res = await fetch(`${API_BASE}/meta/send-template-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_title: `Disparo Meta - ${currentEvent.name || 'Evento'}`,
          template_name: selectedTemplate.name,
          language_code: selectedTemplate.language || 'pt_BR',
          event_id: selectedEventId,
          recipients: selected.map((c) => ({
            phone: c.rawPhone, name: c.name,
            headerImage: currentEvent.cover_url || '',
            bodyParams: [c.name || 'Cliente', currentEvent.name || 'Evento',
              `https://rafaelpublicado.com.br/evento/${currentEvent.id || ''}`],
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContacts((prev) => prev.map((c) => {
          const r = (data.results || []).find((x) => x.phone === c.rawPhone);
          return r ? { ...c, status: r.status === 'sent' ? 'sent' : 'error' } : c;
        }));
        alert(`✅ Disparo concluído! ${data.sentSuccess} enviadas, ${data.sentErrors} erros.`);
      } else {
        alert(`❌ Erro: ${data.error || 'Verifique as credenciais da API'}`);
      }
    } catch (err) { alert(`Erro: ${err.message}`); }
    setIsSendingBroadcast(false);
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

  let parsedButtons = [];
  try {
    if (selectedTemplate?.buttons) {
      parsedButtons = typeof selectedTemplate.buttons === 'string'
        ? JSON.parse(selectedTemplate.buttons) : selectedTemplate.buttons;
    }
  } catch {}

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={s.page}>

      {/* TOPBAR */}
      <View style={s.topbar}>
        <View style={s.topbarInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <BrandLogo size="md" />
            <View style={s.metaBadge}>
              <Zap size={12} color="#0084FF" />
              <Text style={s.metaBadgeText}>META WHATSAPP CLOUD API</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {hasMetaApi && (
              <TouchableOpacity style={s.btnSync} onPress={() => handleSyncTemplates()} disabled={syncingMeta} activeOpacity={0.8}>
                <RefreshCw size={13} color="#0084FF" />
                <Text style={s.btnSyncText}>{syncingMeta ? 'Sincronizando...' : 'Atualizar Templates'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.btnIconHeader} onPress={() => setShowSettings(!showSettings)} activeOpacity={0.8}>
              <Settings size={14} color={hasMetaApi ? '#16A34A' : '#DC2626'} />
              <Text style={[s.btnIconHeaderText, { color: hasMetaApi ? '#16A34A' : '#DC2626' }]}>
                {hasMetaApi ? '✓ Meta Conectada' : '⚠ Inserir Token Meta'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnBack} onPress={() => navigation.navigate('Admin')} activeOpacity={0.8}>
              <ArrowLeft size={14} color="#0F172A" />
              <Text style={s.btnBackText}>Painel Admin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* PAINEL CREDENCIAIS META */}
        {showSettings && (
          <View style={s.settingsBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                Credenciais Oficiais — Meta WhatsApp Cloud API
              </Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '700' }}>Fechar ✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8 }}>
              <TextInput style={s.input} placeholder="ID da Conta WhatsApp Business (WABA ID)" placeholderTextColor="#94A3B8" value={wabaId} onChangeText={setWabaId} />
              <TextInput style={s.input} placeholder="ID do Número de Telefone (Phone Number ID)" placeholderTextColor="#94A3B8" value={phoneId} onChangeText={setPhoneId} />
              <TextInput style={[s.input, { height: 60 }]} multiline placeholder="Token de Acesso Permanente Meta (EAA...)" placeholderTextColor="#94A3B8" value={metaToken} onChangeText={setMetaToken} secureTextEntry />
              <TouchableOpacity style={s.btnSave} onPress={handleSaveMetaConfig} activeOpacity={0.88}>
                <Check size={15} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Salvar e Puxar Templates da Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* GRID PRINCIPAL */}
        <View style={s.grid}>

          {/* ── COL 1: DESTINATÁRIOS ── */}
          <View style={s.col}>
            <View style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle}>Destinatários ({contacts.length})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={s.btnAction} onPress={loadLeadsFromSite} disabled={loadingLeads} activeOpacity={0.8}>
                    <Users size={12} color="#0084FF" />
                    <Text style={[s.btnActionTxt, { color: '#0084FF' }]}>{loadingLeads ? 'Puxando...' : 'Puxar Leads'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnAction} onPress={() => setShowPasteBox(!showPasteBox)} activeOpacity={0.8}>
                    <Upload size={12} color="#475569" />
                    <Text style={s.btnActionTxt}>Colar Lista</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showPasteBox && (
                <View style={s.pasteBox}>
                  <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Cole números aqui (por linha, vírgula ou ponto-e-vírgula)..." placeholderTextColor="#94A3B8" value={pasteText} onChangeText={setPasteText} />
                  <TouchableOpacity style={[s.btnSave, { marginTop: 6 }]} onPress={handleImportPasted} activeOpacity={0.85}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Importar</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Nome (opcional)" placeholderTextColor="#94A3B8" value={newName} onChangeText={setNewName} />
                <TextInput style={[s.input, { width: 140 }]} placeholder="WhatsApp com DDD" placeholderTextColor="#94A3B8" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
                <TouchableOpacity style={s.btnAdd} onPress={handleAddContact} activeOpacity={0.85}>
                  <Plus size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={s.selBar}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => { const all = contacts.every((c) => c.selected); setContacts((p) => p.map((c) => ({ ...c, selected: !all }))); }}>
                  {contacts.length > 0 && contacts.every((c) => c.selected)
                    ? <CheckSquare size={15} color="#0084FF" /> : <Square size={15} color="#94A3B8" />}
                  <Text style={{ fontSize: 12, color: '#475569', fontWeight: '600' }}>Todos ({selectedCount})</Text>
                </TouchableOpacity>
                {contacts.length > 0 && (
                  <TouchableOpacity onPress={() => { if (confirm('Limpar todos?')) setContacts([]); }}>
                    <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={s.contactList} nestedScrollEnabled>
                {contacts.length === 0 ? (
                  <View style={{ padding: 28, alignItems: 'center' }}>
                    <Users size={28} color="#CBD5E1" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                      Nenhum contato. Puxe os leads do site ou cole números acima.
                    </Text>
                  </View>
                ) : contacts.map((c, i) => (
                  <View key={c.id || i} style={s.contactItem}>
                    <TouchableOpacity onPress={() => setContacts((p) => p.map((x) => x.id === c.id ? { ...x, selected: !x.selected } : x))} style={{ padding: 4 }}>
                      {c.selected ? <CheckSquare size={15} color="#0084FF" /> : <Square size={15} color="#CBD5E1" />}
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{c.name || 'Cliente / Lead'}</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>{c.phone}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {c.status === 'sent' && <View style={s.badgeSent}><Text style={s.badgeSentTxt}>Enviado ✓</Text></View>}
                      {c.status === 'error' && <View style={s.badgeErr}><Text style={s.badgeErrTxt}>Erro ✗</Text></View>}
                      <TouchableOpacity onPress={() => setContacts((p) => p.filter((x) => x.id !== c.id))} style={{ padding: 4 }}>
                        <Trash2 size={13} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* ── COL 2: TEMPLATES META & PREVIEW ── */}
          <View style={[s.col, { flex: 1.2 }]}>
            <View style={s.card}>

              {/* Evento */}
              <View style={{ marginBottom: 14 }}>
                <Text style={s.label}>Evento vinculado:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {eventsList.map((ev) => {
                      const sel = ev.id === selectedEventId;
                      return (
                        <TouchableOpacity key={ev.id} style={[s.pill, sel && s.pillActive]} onPress={() => setSelectedEventId(ev.id)} activeOpacity={0.8}>
                          <Text style={[s.pillTxt, sel && s.pillTxtActive]}>{ev.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Templates — bloqueia se não tiver token */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.label}>Modelos Aprovados na Meta (HSM):</Text>
                  {metaTemplates.length > 0 && (
                    <View style={s.badgeApproved}>
                      <ShieldCheck size={11} color="#16A34A" />
                      <Text style={s.badgeApprovedTxt}>APROVADO META</Text>
                    </View>
                  )}
                </View>

                {!hasMetaApi ? (
                  /* Estado: sem token */
                  <View style={s.noTokenBox}>
                    <AlertCircle size={22} color="#F59E0B" />
                    <Text style={s.noTokenTitle}>Token Meta não configurado</Text>
                    <Text style={s.noTokenSub}>Clique em "⚠ Inserir Token Meta" no topo para conectar sua conta e carregar seus modelos HSM aprovados.</Text>
                    <TouchableOpacity style={s.btnConnectMeta} onPress={() => setShowSettings(true)} activeOpacity={0.85}>
                      <Settings size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Conectar com a Meta</Text>
                    </TouchableOpacity>
                  </View>
                ) : metaTemplates.length === 0 ? (
                  /* Token OK mas sem templates aprovados ainda */
                  <View style={s.noTokenBox}>
                    <RefreshCw size={22} color="#0084FF" />
                    <Text style={s.noTokenTitle}>Nenhum modelo carregado</Text>
                    <Text style={s.noTokenSub}>Clique em "Atualizar Templates" no topo para puxar seus modelos aprovados da conta Meta.</Text>
                    <TouchableOpacity style={[s.btnConnectMeta, { backgroundColor: '#0084FF' }]} onPress={() => handleSyncTemplates()} disabled={syncingMeta} activeOpacity={0.85}>
                      <RefreshCw size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        {syncingMeta ? 'Carregando...' : 'Puxar Templates Agora'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Templates reais da conta Meta */
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {metaTemplates.map((tmpl) => {
                      const sel = selectedTemplate?.id === tmpl.id;
                      const displayName = tmpl.displayName || tmpl.name;
                      const category = tmpl.category || '';
                      return (
                        <TouchableOpacity key={tmpl.id} style={[s.tmplPill, sel && s.tmplPillActive]} onPress={() => setSelectedTemplate(tmpl)} activeOpacity={0.8}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[s.tmplPillTitle, sel && s.tmplPillTitleActive]}>{displayName}</Text>
                            <Text style={s.tmplCategory}>{category}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Texto do Modelo (bloqueado p/ edição livre conforme política Meta) */}
              {selectedTemplate && (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Lock size={12} color="#64748B" />
                    <Text style={s.label}>Texto Oficial do Modelo:</Text>
                  </View>
                  <View style={s.lockedBox}>
                    <Text style={s.lockedTxt}>{selectedTemplate.body_text}</Text>
                  </View>
                </View>
              )}

              {/* Preview WhatsApp */}
              {selectedTemplate && (
                <View style={s.preview}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Smartphone size={13} color="#16A34A" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Pré-visualização no WhatsApp</Text>
                  </View>
                  <View style={s.bubble}>
                    {selectedTemplate.header_type === 'IMAGE' && (
                      <View style={s.previewImg}>
                        <Image source={{ uri: currentEvent.cover_url || 'https://rafaelpublicado.com.br/assets/logo.png' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </View>
                    )}
                    {selectedTemplate.header_type === 'TEXT' && (
                      <Text style={s.previewHeaderTxt}>{selectedTemplate.header_content}</Text>
                    )}
                    <Text style={s.previewBody}>{compilePreview(selectedTemplate.body_text)}</Text>
                    {selectedTemplate.footer_text && (
                      <Text style={s.previewFooter}>{selectedTemplate.footer_text}</Text>
                    )}
                    {parsedButtons.length > 0 && (
                      <View style={s.previewBtns}>
                        {parsedButtons.map((btn, i) => (
                          <View key={i} style={s.previewBtn}>
                            <ExternalLink size={11} color="#0084FF" />
                            <Text style={s.previewBtnTxt}>{btn.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Teste Individual */}
              {hasMetaApi && selectedTemplate && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  <TextInput style={[s.input, { flex: 1, height: 36, paddingVertical: 4 }]} value={testPhone} onChangeText={setTestPhone} placeholder="Seu WhatsApp (5599...)" keyboardType="phone-pad" />
                  <TouchableOpacity style={s.btnTest} onPress={handleSendTest} disabled={isSendingTest} activeOpacity={0.85}>
                    <Send size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isSendingTest ? 'Enviando...' : 'Testar'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Botão Principal */}
              <TouchableOpacity
                style={[s.btnBroadcast, (!hasMetaApi || !selectedTemplate || selectedCount === 0) && s.btnBroadcastDisabled]}
                onPress={handleBroadcast}
                disabled={isSendingBroadcast || !hasMetaApi || !selectedTemplate || selectedCount === 0}
                activeOpacity={0.88}
              >
                {isSendingBroadcast ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Zap size={18} color="#fff" />
                    <Text style={s.btnBroadcastTxt}>
                      {!hasMetaApi ? 'Configure o Token Meta para Disparar' :
                       !selectedTemplate ? 'Selecione um Modelo Meta' :
                       selectedCount === 0 ? 'Selecione Contatos para Disparar' :
                       `DISPARAR PARA ${selectedCount} CONTATOS`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  topbar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', height: 64, justifyContent: 'center', position: 'sticky', top: 0, zIndex: 100 },
  topbarInner: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  metaBadgeText: { fontSize: 10, fontWeight: '800', color: '#0084FF', letterSpacing: 0.3 },
  btnSync: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  btnSyncText: { fontSize: 12, fontWeight: '700', color: '#0084FF' },
  btnIconHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  btnIconHeaderText: { fontSize: 12, fontWeight: '700' },
  btnBack: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  btnBackText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  scroll: { flex: 1 },
  scrollContent: { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 20 },
  settingsBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  btnSave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0084FF', paddingVertical: 10, borderRadius: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  col: { flex: 1, minWidth: 340 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  btnAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  btnActionTxt: { fontSize: 11, fontWeight: '600', color: '#475569' },
  pasteBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, marginBottom: 10 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: '#0F172A' },
  btnAdd: { width: 36, height: 36, backgroundColor: '#0084FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  selBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 6 },
  contactList: { maxHeight: 380 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  badgeSent: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeSentTxt: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  badgeErr: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeErrTxt: { fontSize: 10, fontWeight: '800', color: '#DC2626' },
  label: { fontSize: 12, fontWeight: '700', color: '#334155' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  pillActive: { backgroundColor: '#EFF6FF', borderColor: '#0084FF' },
  pillTxt: { fontSize: 11, fontWeight: '600', color: '#475569' },
  pillTxtActive: { color: '#0084FF', fontWeight: '800' },
  noTokenBox: { marginTop: 10, padding: 20, borderRadius: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center', gap: 8 },
  noTokenTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  noTokenSub: { fontSize: 12, color: '#92400E', textAlign: 'center', lineHeight: 17 },
  btnConnectMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D97706', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  badgeApproved: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeApprovedTxt: { fontSize: 9, fontWeight: '800', color: '#16A34A' },
  tmplPill: { padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  tmplPillActive: { backgroundColor: '#EFF6FF', borderColor: '#0084FF', borderWidth: 1.5 },
  tmplPillTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  tmplPillTitleActive: { color: '#0084FF', fontWeight: '800' },
  tmplCategory: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  lockedBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10 },
  lockedTxt: { fontSize: 12, color: '#475569', lineHeight: 17 },
  preview: { backgroundColor: '#EFEAE2', borderRadius: 10, padding: 10, marginBottom: 14 },
  bubble: { backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  previewImg: { width: '100%', height: 110, borderRadius: 6, overflow: 'hidden', marginBottom: 8, backgroundColor: '#0F172A' },
  previewHeaderTxt: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  previewBody: { fontSize: 12, color: '#111827', lineHeight: 17 },
  previewFooter: { fontSize: 10, color: '#94A3B8', marginTop: 6 },
  previewBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 8, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  previewBtnTxt: { fontSize: 11, fontWeight: '700', color: '#0084FF' },
  btnTest: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 10, height: 36, borderRadius: 8 },
  btnBroadcast: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0084FF', paddingVertical: 14, borderRadius: 10 },
  btnBroadcastDisabled: { backgroundColor: '#94A3B8' },
  btnBroadcastTxt: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});
