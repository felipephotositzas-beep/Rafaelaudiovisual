import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Send, Users, ExternalLink, ArrowLeft, Settings, ShieldCheck,
  Zap, RefreshCw, CheckSquare, Square, Smartphone, Check,
  Lock, Upload, Plus, Trash2, AlertCircle, FileText, List,
  Play, Clock, XCircle, ChevronRight, Download, Edit2,
  BarChart2, X, Search, Tag, BookOpen, Layers, Inbox,
} from 'lucide-react-native';
import BrandLogo from '../components/BrandLogo';
import { fetchWhatsAppLeads } from '../utils/analytics';
import { fetchAllEvents } from '../utils/api';

const API = 'https://rafaelpublicado.com.br/api';

const TABS = [
  { id: 'campaigns', label: '📋 Campanhas', icon: Layers },
  { id: 'contacts',  label: '👥 Contatos',  icon: Users  },
  { id: 'lists',     label: '📁 Listas',    icon: List   },
  { id: 'meta',      label: '⚙️ Meta API',  icon: Settings },
];

const STATUS_COLORS = {
  draft:   { bg: '#F1F5F9', text: '#475569', label: 'Rascunho' },
  running: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Enviando...' },
  done:    { bg: '#DCFCE7', text: '#16A34A', label: 'Concluída' },
  error:   { bg: '#FEE2E2', text: '#DC2626', label: 'Erro' },
  paused:  { bg: '#FEF9C3', text: '#92400E', label: 'Pausada' },
};

function cleanPhone(p) {
  if (!p) return '';
  let c = String(p).replace(/\D/g, '');
  if (c.length === 10 || c.length === 11) c = `55${c}`;
  return c;
}

function fmtPhone(p) {
  if (!p) return '';
  const c = String(p).replace(/\D/g, '');
  if (c.length >= 12 && c.startsWith('55')) {
    const n = c.slice(4);
    return `+55 (${c.slice(2,4)}) ${n.slice(0,5)}-${n.slice(5)}`;
  }
  if (c.length === 11) return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`;
  return p;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function BulkMessage() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('campaigns');

  // ── State Global ──
  const [eventsList, setEventsList]     = useState([]);
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [hasMetaApi, setHasMetaApi]     = useState(false);

  // ── Meta API Settings ──
  const [metaToken, setMetaToken] = useState('');
  const [phoneId,   setPhoneId]   = useState('');
  const [wabaId,    setWabaId]    = useState('');
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [savingMeta, setSavingMeta]   = useState(false);

  // ── Campaigns ──
  const [campaigns, setCampaigns]         = useState([]);
  const [loadingCamps, setLoadingCamps]   = useState(false);
  const [showNewCamp, setShowNewCamp]     = useState(false);
  const [campForm, setCampForm]           = useState({ name:'', list_id:'', template_name:'', event_id:'' });
  const [savingCamp, setSavingCamp]       = useState(false);
  const [selectedCamp, setSelectedCamp]   = useState(null);
  const [campLogs, setCampLogs]           = useState([]);
  const [launchingId, setLaunchingId]     = useState(null);
  const [editingCamp, setEditingCamp]     = useState(null);

  // ── Contacts ──
  const [contacts, setContacts]     = useState([]);
  const [loadingCtcs, setLoadingCtcs] = useState(false);
  const [ctcSearch, setCtcSearch]   = useState('');
  const [ctcForm, setCtcForm]       = useState({ name:'', phone:'', tags:'', notes:'' });
  const [showCtcForm, setShowCtcForm] = useState(false);
  const [pasteText, setPasteText]   = useState('');
  const [showPaste, setShowPaste]   = useState(false);
  const [importingLeads, setImportingLeads] = useState(false);
  const [selectedCtcs, setSelectedCtcs] = useState(new Set());

  // ── Lists ──
  const [lists, setLists]         = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [openList, setOpenList]   = useState(null);
  const [listContacts, setListContacts] = useState([]);
  const [listForm, setListForm]   = useState({ name:'', description:'' });
  const [showListForm, setShowListForm] = useState(false);
  const [addToListMode, setAddToListMode] = useState(false);

  useEffect(() => {
    loadEvents();
    loadMetaConfig();
    loadCampaigns();
    loadContacts();
    loadLists();
  }, []);

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadEvents = async () => {
    try {
      const res = await fetchAllEvents();
      if (res.ok) {
        const d = await res.json();
        setEventsList(d.results || []);
      }
    } catch {}
  };

  const loadMetaConfig = async () => {
    try {
      const res = await fetch(`${API}/meta/config`);
      if (res.ok) {
        const d = await res.json();
        if (d.config) {
          setPhoneId(d.config.phone_number_id || '');
          setWabaId(d.config.waba_id || '');
          const ok = Boolean(d.config.has_token);
          setHasMetaApi(ok);
          if (ok) fetchMetaTemplates();
        }
      }
    } catch {}
  };

  const fetchMetaTemplates = async () => {
    try {
      const res = await fetch(`${API}/meta/templates`);
      if (res.ok) {
        const d = await res.json();
        setMetaTemplates(d.templates || []);
      }
    } catch {}
  };

  const loadCampaigns = async () => {
    setLoadingCamps(true);
    try {
      const res = await fetch(`${API}/crm/campaigns`);
      if (res.ok) { const d = await res.json(); setCampaigns(d.campaigns || []); }
    } catch {}
    setLoadingCamps(false);
  };

  const loadContacts = async (search = '') => {
    setLoadingCtcs(true);
    try {
      const url = search ? `${API}/crm/contacts?search=${encodeURIComponent(search)}` : `${API}/crm/contacts`;
      const res = await fetch(url);
      if (res.ok) { const d = await res.json(); setContacts(d.contacts || []); }
    } catch {}
    setLoadingCtcs(false);
  };

  const loadLists = async () => {
    setLoadingLists(true);
    try {
      const res = await fetch(`${API}/crm/lists`);
      if (res.ok) { const d = await res.json(); setLists(d.lists || []); }
    } catch {}
    setLoadingLists(false);
  };

  const openListDetails = async (list) => {
    setOpenList(list);
    try {
      const res = await fetch(`${API}/crm/lists/${list.id}/contacts`);
      if (res.ok) { const d = await res.json(); setListContacts(d.contacts || []); }
    } catch {}
  };

  // ─── Meta API ────────────────────────────────────────────────────────────────
  const handleSaveMeta = async () => {
    if (!wabaId || !phoneId || !metaToken) { alert('Preencha todos os campos da Meta.'); return; }
    setSavingMeta(true);
    try {
      const res = await fetch(`${API}/meta/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_id: phoneId, waba_id: wabaId, access_token: metaToken }),
      });
      if (res.ok) {
        setHasMetaApi(true);
        await handleSyncTemplates(wabaId, metaToken);
        alert('Conectado com a Meta com sucesso!');
      } else { alert('Erro ao salvar credenciais.'); }
    } catch { alert('Erro de conexão.'); }
    setSavingMeta(false);
  };

  const handleSyncTemplates = async (wid, tok) => {
    setSyncingMeta(true);
    try {
      const res = await fetch(`${API}/meta/sync-templates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waba_id: wid || wabaId, access_token: tok || metaToken }),
      });
      const d = await res.json();
      if (res.ok && d.templates?.length > 0) {
        setMetaTemplates(d.templates);
        if (!tok) alert(`${d.templates.length} modelos carregados da Meta!`);
      } else {
        if (!tok) alert(d.error || 'Nenhum modelo APPROVED encontrado.');
      }
    } catch (err) { if (!tok) alert(`Erro: ${err.message}`); }
    setSyncingMeta(false);
  };

  // ─── Campaigns ───────────────────────────────────────────────────────────────
  const handleCreateCampaign = async () => {
    if (!campForm.name) { alert('Nome da campanha obrigatório.'); return; }
    setSavingCamp(true);
    try {
      const res = await fetch(`${API}/crm/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campForm.name,
          list_id: campForm.list_id || null,
          template_name: campForm.template_name,
          template_language: 'pt_BR',
          event_id: campForm.event_id || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCampaigns(prev => [d.campaign, ...prev]);
        setShowNewCamp(false);
        setCampForm({ name:'', list_id:'', template_name:'', event_id:'' });
      } else alert(d.error || 'Erro ao criar campanha.');
    } catch { alert('Erro de conexão.'); }
    setSavingCamp(false);
  };

  const handleUpdateCampaign = async () => {
    if (!editingCamp) return;
    try {
      const res = await fetch(`${API}/crm/campaigns/${editingCamp.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingCamp.name,
          list_id: editingCamp.list_id || null,
          template_name: editingCamp.template_name,
          template_language: 'pt_BR',
          event_id: editingCamp.event_id || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === d.campaign.id ? d.campaign : c));
        setEditingCamp(null);
      } else alert(d.error || 'Erro.');
    } catch { alert('Erro.'); }
  };

  const handleLaunchCampaign = async (campId) => {
    if (!confirm('Confirma o disparo desta campanha via Meta Cloud API?')) return;
    setLaunchingId(campId);
    try {
      const res = await fetch(`${API}/crm/campaigns/${campId}/launch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (res.ok) {
        alert(`✅ Disparo concluído!\n${d.sentCount} enviadas | ${d.errorCount} erros | ${d.total} total`);
        loadCampaigns();
      } else alert(`❌ Erro: ${d.error}`);
    } catch (err) { alert(`Erro: ${err.message}`); }
    setLaunchingId(null);
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Excluir campanha?')) return;
    await fetch(`${API}/crm/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (selectedCamp?.id === id) setSelectedCamp(null);
  };

  const openCampaignLogs = async (camp) => {
    setSelectedCamp(camp);
    try {
      const res = await fetch(`${API}/crm/campaigns/${camp.id}`);
      if (res.ok) { const d = await res.json(); setCampLogs(d.logs || []); }
    } catch {}
  };

  // ─── Contacts ────────────────────────────────────────────────────────────────
  const handleSaveContact = async () => {
    const p = cleanPhone(ctcForm.phone);
    if (!p) { alert('Telefone inválido.'); return; }
    try {
      const res = await fetch(`${API}/crm/contacts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ctcForm.name, phone: p, tags: ctcForm.tags, notes: ctcForm.notes }),
      });
      const d = await res.json();
      if (res.ok) {
        setContacts(prev => {
          const exists = prev.find(c => c.id === d.contact.id);
          return exists ? prev.map(c => c.id === d.contact.id ? d.contact : c) : [d.contact, ...prev];
        });
        setCtcForm({ name:'', phone:'', tags:'', notes:'' });
        setShowCtcForm(false);
      } else alert(d.error || 'Erro.');
    } catch { alert('Erro.'); }
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Excluir contato?')) return;
    await fetch(`${API}/crm/contacts/${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
    setSelectedCtcs(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleImportPasted = async () => {
    const lines = pasteText.split(/[\n,;]+/);
    const parsed = [];
    lines.forEach(line => {
      const t = line.trim(); if (!t) return;
      let name = '', phone = t;
      if (t.includes('-') && !t.match(/^\+?[0-9()\s-]+$/)) {
        const pts = t.split('-'); name = pts[0].trim(); phone = pts.slice(1).join('-').trim();
      }
      const p = cleanPhone(phone);
      if (p.length >= 8) parsed.push({ name, phone: p });
    });
    if (parsed.length === 0) { alert('Nenhum número válido.'); return; }
    const res = await fetch(`${API}/crm/contacts/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: parsed, source: 'paste' }),
    });
    const d = await res.json();
    if (res.ok) {
      alert(`${d.imported} importados, ${d.skipped} ignorados.`);
      setPasteText(''); setShowPaste(false);
      loadContacts(ctcSearch);
    } else alert(d.error || 'Erro.');
  };

  const handleImportLeads = async () => {
    setImportingLeads(true);
    try {
      const leads = await fetchWhatsAppLeads();
      if (!leads?.length) { alert('Nenhum lead encontrado.'); setImportingLeads(false); return; }
      const parsed = leads.map(l => ({ name: l.name || '', phone: cleanPhone(l.whatsapp) })).filter(l => l.phone.length >= 8);
      const res = await fetch(`${API}/crm/contacts/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsed, source: 'site_lead' }),
      });
      const d = await res.json();
      if (res.ok) { alert(`${d.imported} leads importados!`); loadContacts(ctcSearch); }
    } catch { alert('Erro ao importar leads.'); }
    setImportingLeads(false);
  };

  // ─── Lists ───────────────────────────────────────────────────────────────────
  const handleCreateList = async () => {
    if (!listForm.name) { alert('Nome da lista obrigatório.'); return; }
    const res = await fetch(`${API}/crm/lists`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listForm),
    });
    const d = await res.json();
    if (res.ok) {
      setLists(prev => [{ ...d.list, contact_count: 0 }, ...prev]);
      setListForm({ name:'', description:'' }); setShowListForm(false);
    } else alert(d.error || 'Erro.');
  };

  const handleDeleteList = async (id) => {
    if (!confirm('Excluir lista?')) return;
    await fetch(`${API}/crm/lists/${id}`, { method: 'DELETE' });
    setLists(prev => prev.filter(l => l.id !== id));
    if (openList?.id === id) setOpenList(null);
  };

  const handleRemoveFromList = async (contactId) => {
    if (!openList) return;
    await fetch(`${API}/crm/lists/${openList.id}/contacts/${contactId}`, { method: 'DELETE' });
    setListContacts(prev => prev.filter(c => c.id !== contactId));
    setLists(prev => prev.map(l => l.id === openList.id ? { ...l, contact_count: (l.contact_count || 1) - 1 } : l));
  };

  const handleAddSelectedToList = async (listId) => {
    if (selectedCtcs.size === 0) { alert('Selecione contatos na aba Contatos primeiro.'); return; }
    const ids = Array.from(selectedCtcs);
    const res = await fetch(`${API}/crm/lists/${listId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: ids }),
    });
    const d = await res.json();
    if (res.ok) {
      alert(`${d.added} contatos adicionados à lista!`);
      setSelectedCtcs(new Set());
      loadLists();
    } else alert(d.error || 'Erro.');
  };

  // ─── Preview ─────────────────────────────────────────────────────────────────
  const getPreviewTemplate = (name) => metaTemplates.find(t => t.name === name);
  const getListById = (id) => lists.find(l => String(l.id) === String(id));
  const getEventById = (id) => eventsList.find(e => e.id === id);

  const compilePreview = (bodyText) => {
    return (bodyText || '').replace(/{{1}}/g, 'Rafael Costa').replace(/{{2}}/g, 'Evento Exemplo').replace(/{{3}}/g, 'https://rafaelpublicado.com.br/evento/...');
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.page}>

      {/* TOPBAR */}
      <View style={s.topbar}>
        <View style={s.topbarInner}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            <BrandLogo size="md" />
            <View style={s.badge}>
              <Zap size={12} color="#0084FF" />
              <Text style={s.badgeTxt}>CRM WHATSAPP</Text>
            </View>
            {hasMetaApi && (
              <View style={[s.badge, { backgroundColor:'#DCFCE7', borderColor:'#86EFAC' }]}>
                <ShieldCheck size={12} color="#16A34A" />
                <Text style={[s.badgeTxt, { color:'#16A34A' }]}>META CONECTADA</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={s.btnBack} onPress={() => navigation.navigate('Admin')} activeOpacity={0.8}>
            <ArrowLeft size={14} color="#0F172A" />
            <Text style={s.btnBackTxt}>Painel Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB BAR */}
      <View style={s.tabBar}>
        <View style={s.tabBarInner}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[s.tabItem, tab === t.id && s.tabItemActive]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
              <Text style={[s.tabTxt, tab === t.id && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* ══════════════════════════════════════════════════════════════════════
            ABA: CAMPANHAS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'campaigns' && (
          <View>
            {/* Header */}
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Campanhas de Disparo</Text>
                <Text style={s.sectionSub}>Crie, gerencie e acompanhe o histórico de cada envio.</Text>
              </View>
              <TouchableOpacity style={s.btnPrimary} onPress={() => setShowNewCamp(true)} activeOpacity={0.85}>
                <Plus size={15} color="#fff" />
                <Text style={s.btnPrimaryTxt}>Nova Campanha</Text>
              </TouchableOpacity>
            </View>

            {/* Form Nova Campanha */}
            {showNewCamp && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Nova Campanha</Text>
                <View style={s.formGrid}>
                  <TextInput style={s.input} placeholder="Nome da campanha *" placeholderTextColor="#94A3B8" value={campForm.name} onChangeText={v => setCampForm(f => ({...f, name:v}))} />
                  
                  <View style={s.selectBox}>
                    <Text style={s.selectLabel}>Lista de Audiência:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                        {lists.map(l => (
                          <TouchableOpacity key={l.id} style={[s.chip, String(campForm.list_id) === String(l.id) && s.chipActive]} onPress={() => setCampForm(f => ({...f, list_id: String(l.id)}))}>
                            <Text style={[s.chipTxt, String(campForm.list_id) === String(l.id) && s.chipTxtActive]}>{l.name} ({l.contact_count})</Text>
                          </TouchableOpacity>
                        ))}
                        {lists.length === 0 && <Text style={{ fontSize:12, color:'#94A3B8' }}>Nenhuma lista criada ainda.</Text>}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={s.selectBox}>
                    <Text style={s.selectLabel}>Modelo Meta (HSM):</Text>
                    {!hasMetaApi ? (
                      <Text style={{ fontSize:12, color:'#DC2626' }}>Configure o Token Meta na aba ⚙️ Meta API</Text>
                    ) : metaTemplates.length === 0 ? (
                      <Text style={{ fontSize:12, color:'#94A3B8' }}>Nenhum template sincronizado.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                          {metaTemplates.map(t => (
                            <TouchableOpacity key={t.id} style={[s.chip, campForm.template_name === t.name && s.chipActive]} onPress={() => setCampForm(f => ({...f, template_name: t.name}))}>
                              <Text style={[s.chipTxt, campForm.template_name === t.name && s.chipTxtActive]}>{t.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>

                  <View style={s.selectBox}>
                    <Text style={s.selectLabel}>Evento Vinculado:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                        {eventsList.map(e => (
                          <TouchableOpacity key={e.id} style={[s.chip, campForm.event_id === e.id && s.chipActive]} onPress={() => setCampForm(f => ({...f, event_id: e.id}))}>
                            <Text style={[s.chipTxt, campForm.event_id === e.id && s.chipTxtActive]}>{e.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                {/* Preview do template selecionado */}
                {campForm.template_name && getPreviewTemplate(campForm.template_name) && (
                  <View style={s.miniPreview}>
                    <Text style={{ fontSize:11, fontWeight:'700', color:'#475569', marginBottom:4 }}>
                      <Smartphone size={11} color="#16A34A" /> Prévia:
                    </Text>
                    <Text style={{ fontSize:12, color:'#334155', lineHeight:17 }}>
                      {compilePreview(getPreviewTemplate(campForm.template_name)?.body_text)}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection:'row', gap:8, marginTop:12 }}>
                  <TouchableOpacity style={s.btnPrimary} onPress={handleCreateCampaign} disabled={savingCamp} activeOpacity={0.85}>
                    {savingCamp ? <ActivityIndicator size="small" color="#fff" /> : <><Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Salvar Rascunho</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setShowNewCamp(false)}>
                    <Text style={s.btnSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Lista de Campanhas */}
            {loadingCamps ? (
              <ActivityIndicator size="large" color="#0084FF" style={{ marginTop:40 }} />
            ) : campaigns.length === 0 ? (
              <View style={s.emptyState}>
                <Layers size={32} color="#CBD5E1" />
                <Text style={s.emptyTitle}>Nenhuma campanha ainda</Text>
                <Text style={s.emptySub}>Clique em "Nova Campanha" para começar.</Text>
              </View>
            ) : (
              <View style={{ gap:12 }}>
                {campaigns.map(camp => {
                  const st = STATUS_COLORS[camp.status] || STATUS_COLORS.draft;
                  const tmpl = getPreviewTemplate(camp.template_name);
                  const list = getListById(String(camp.list_id));
                  const event = getEventById(camp.event_id);
                  const isLaunching = launchingId === camp.id;
                  const canLaunch = hasMetaApi && camp.status !== 'running' && camp.template_name && camp.list_id;

                  return (
                    <View key={camp.id} style={s.campCard}>
                      <View style={s.campCardTop}>
                        <View style={{ flex:1 }}>
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:4 }}>
                            <Text style={s.campName}>{camp.name}</Text>
                            <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                              <Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:10 }}>
                            {list && <Text style={s.campMeta}>👥 {list.name} ({list.contact_count} contatos)</Text>}
                            {camp.template_name && <Text style={s.campMeta}>📋 {camp.template_name}</Text>}
                            {event && <Text style={s.campMeta}>📍 {event.name}</Text>}
                            <Text style={s.campMeta}>📅 {fmtDate(camp.created_at)}</Text>
                          </View>
                          {camp.status === 'done' && (
                            <View style={{ flexDirection:'row', gap:12, marginTop:6 }}>
                              <Text style={{ fontSize:11, fontWeight:'700', color:'#16A34A' }}>✓ {camp.sent_count} enviados</Text>
                              {camp.error_count > 0 && <Text style={{ fontSize:11, fontWeight:'700', color:'#DC2626' }}>✗ {camp.error_count} erros</Text>}
                              <Text style={{ fontSize:11, color:'#64748B' }}>de {camp.total} total</Text>
                            </View>
                          )}
                        </View>

                        <View style={{ gap:6 }}>
                          {camp.status === 'draft' && (
                            <TouchableOpacity
                              style={[s.btnLaunch, !canLaunch && s.btnLaunchDis]}
                              onPress={() => canLaunch && handleLaunchCampaign(camp.id)}
                              disabled={!canLaunch || isLaunching}
                              activeOpacity={0.85}
                            >
                              {isLaunching ? <ActivityIndicator size="small" color="#fff" /> : <><Zap size={13} color="#fff" /><Text style={s.btnLaunchTxt}>Lançar</Text></>}
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={s.btnIconSm} onPress={() => openCampaignLogs(camp)}>
                            <BarChart2 size={14} color="#475569" />
                            <Text style={s.btnIconSmTxt}>Logs</Text>
                          </TouchableOpacity>
                          {camp.status === 'draft' && (
                            <TouchableOpacity style={s.btnIconSm} onPress={() => setEditingCamp({...camp})}>
                              <Edit2 size={14} color="#475569" />
                              <Text style={s.btnIconSmTxt}>Editar</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={s.btnIconSm} onPress={() => handleDeleteCampaign(camp.id)}>
                            <Trash2 size={14} color="#DC2626" />
                            <Text style={[s.btnIconSmTxt, { color:'#DC2626' }]}>Excluir</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Painel de Logs */}
            {selectedCamp && (
              <View style={[s.formCard, { marginTop:20 }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <Text style={s.formTitle}>Logs: {selectedCamp.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedCamp(null)}>
                    <X size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                {campLogs.length === 0 ? (
                  <Text style={{ fontSize:12, color:'#94A3B8', textAlign:'center', padding:20 }}>Nenhum log ainda.</Text>
                ) : (
                  <ScrollView style={{ maxHeight:300 }}>
                    <View style={{ flexDirection:'row', borderBottomWidth:1, borderBottomColor:'#E2E8F0', paddingBottom:6, marginBottom:6 }}>
                      {['Nome','Telefone','Status','ID Meta','Hora'].map(h => (
                        <Text key={h} style={[s.logHead, h === 'Hora' && { flex:1.2 }]}>{h}</Text>
                      ))}
                    </View>
                    {campLogs.map(log => (
                      <View key={log.id} style={s.logRow}>
                        <Text style={s.logCell}>{log.name || '—'}</Text>
                        <Text style={s.logCell}>{fmtPhone(log.phone)}</Text>
                        <Text style={[s.logCell, { color: log.status === 'sent' ? '#16A34A' : '#DC2626', fontWeight:'700' }]}>
                          {log.status === 'sent' ? '✓ Enviado' : '✗ Erro'}
                        </Text>
                        <Text style={s.logCell}>{log.wamid ? log.wamid.slice(0,18)+'...' : (log.error_msg || '—')}</Text>
                        <Text style={[s.logCell, { flex:1.2 }]}>{fmtDate(log.sent_at)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Modal Editar Campanha */}
            {editingCamp && (
              <View style={[s.formCard, { marginTop:20 }]}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <Text style={s.formTitle}>Editar Campanha</Text>
                  <TouchableOpacity onPress={() => setEditingCamp(null)}><X size={18} color="#64748B" /></TouchableOpacity>
                </View>
                <View style={{ gap:8 }}>
                  <TextInput style={s.input} value={editingCamp.name} onChangeText={v => setEditingCamp(e => ({...e, name:v}))} placeholder="Nome" />
                  
                  <Text style={s.selectLabel}>Lista:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                      {lists.map(l => (
                        <TouchableOpacity key={l.id} style={[s.chip, String(editingCamp.list_id) === String(l.id) && s.chipActive]} onPress={() => setEditingCamp(e => ({...e, list_id: String(l.id)}))}>
                          <Text style={[s.chipTxt, String(editingCamp.list_id) === String(l.id) && s.chipTxtActive]}>{l.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={s.selectLabel}>Template Meta:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                      {metaTemplates.map(t => (
                        <TouchableOpacity key={t.id} style={[s.chip, editingCamp.template_name === t.name && s.chipActive]} onPress={() => setEditingCamp(e => ({...e, template_name: t.name}))}>
                          <Text style={[s.chipTxt, editingCamp.template_name === t.name && s.chipTxtActive]}>{t.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={s.selectLabel}>Evento:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:6, paddingVertical:4 }}>
                      {eventsList.map(e => (
                        <TouchableOpacity key={e.id} style={[s.chip, editingCamp.event_id === e.id && s.chipActive]} onPress={() => setEditingCamp(ev => ({...ev, event_id: e.id}))}>
                          <Text style={[s.chipTxt, editingCamp.event_id === e.id && s.chipTxtActive]}>{e.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                    <TouchableOpacity style={s.btnPrimary} onPress={handleUpdateCampaign} activeOpacity={0.85}>
                      <Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Salvar Alterações</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnSecondary} onPress={() => setEditingCamp(null)}>
                      <Text style={s.btnSecondaryTxt}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ABA: CONTATOS
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'contacts' && (
          <View>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Contatos do CRM ({contacts.length})</Text>
                <Text style={s.sectionSub}>Gerencie sua base de contatos. Selecione para adicionar a listas.</Text>
              </View>
              <View style={{ flexDirection:'row', gap:8 }}>
                {selectedCtcs.size > 0 && (
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setTab('lists')} activeOpacity={0.85}>
                    <Plus size={13} color="#0084FF" />
                    <Text style={[s.btnSecondaryTxt, { color:'#0084FF' }]}>Adicionar {selectedCtcs.size} a Lista</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.btnSecondary} onPress={() => setShowPaste(!showPaste)} activeOpacity={0.85}>
                  <Upload size={13} color="#475569" /><Text style={s.btnSecondaryTxt}>Colar Números</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSecondary} onPress={handleImportLeads} disabled={importingLeads} activeOpacity={0.85}>
                  <Download size={13} color="#475569" />
                  <Text style={s.btnSecondaryTxt}>{importingLeads ? 'Importando...' : 'Importar Leads do Site'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnPrimary} onPress={() => setShowCtcForm(!showCtcForm)} activeOpacity={0.85}>
                  <Plus size={15} color="#fff" /><Text style={s.btnPrimaryTxt}>Novo Contato</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Colar vários */}
            {showPaste && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Colar Lista de Números</Text>
                <Text style={{ fontSize:12, color:'#64748B', marginBottom:8 }}>Um por linha ou separados por vírgula. Formato: Nome - Número</Text>
                <TextInput style={[s.input, { height:90, textAlignVertical:'top' }]} multiline placeholder="Ex: João - 5599999999 ou apenas 5599999999" placeholderTextColor="#94A3B8" value={pasteText} onChangeText={setPasteText} />
                <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
                  <TouchableOpacity style={s.btnPrimary} onPress={handleImportPasted} activeOpacity={0.85}>
                    <Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Importar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setShowPaste(false)}>
                    <Text style={s.btnSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Formulário de Novo Contato */}
            {showCtcForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Adicionar Contato</Text>
                <View style={s.formGrid2}>
                  <TextInput style={s.input} placeholder="Nome" placeholderTextColor="#94A3B8" value={ctcForm.name} onChangeText={v => setCtcForm(f => ({...f, name:v}))} />
                  <TextInput style={s.input} placeholder="WhatsApp com DDD *" placeholderTextColor="#94A3B8" value={ctcForm.phone} onChangeText={v => setCtcForm(f => ({...f, phone:v}))} keyboardType="phone-pad" />
                  <TextInput style={s.input} placeholder="Tags (ex: corrida, maratona)" placeholderTextColor="#94A3B8" value={ctcForm.tags} onChangeText={v => setCtcForm(f => ({...f, tags:v}))} />
                  <TextInput style={s.input} placeholder="Observações" placeholderTextColor="#94A3B8" value={ctcForm.notes} onChangeText={v => setCtcForm(f => ({...f, notes:v}))} />
                </View>
                <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
                  <TouchableOpacity style={s.btnPrimary} onPress={handleSaveContact} activeOpacity={0.85}>
                    <Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Salvar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setShowCtcForm(false)}>
                    <Text style={s.btnSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Busca */}
            <View style={s.searchBar}>
              <Search size={14} color="#94A3B8" />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar por nome ou telefone..."
                placeholderTextColor="#94A3B8"
                value={ctcSearch}
                onChangeText={v => { setCtcSearch(v); loadContacts(v); }}
              />
              {ctcSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setCtcSearch(''); loadContacts(''); }}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Seleção em massa */}
            {contacts.length > 0 && (
              <View style={s.selBar}>
                <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', gap:6 }}
                  onPress={() => {
                    if (selectedCtcs.size === contacts.length) setSelectedCtcs(new Set());
                    else setSelectedCtcs(new Set(contacts.map(c => c.id)));
                  }}>
                  {selectedCtcs.size === contacts.length && contacts.length > 0 ? <CheckSquare size={15} color="#0084FF" /> : <Square size={15} color="#94A3B8" />}
                  <Text style={{ fontSize:12, color:'#475569', fontWeight:'600' }}>Selecionar Todos ({selectedCtcs.size} selecionados)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tabela de Contatos */}
            {loadingCtcs ? (
              <ActivityIndicator size="large" color="#0084FF" style={{ marginTop:40 }} />
            ) : contacts.length === 0 ? (
              <View style={s.emptyState}>
                <Users size={32} color="#CBD5E1" />
                <Text style={s.emptyTitle}>Nenhum contato ainda</Text>
                <Text style={s.emptySub}>Adicione manualmente, cole uma lista ou importe os leads do site.</Text>
              </View>
            ) : (
              <View style={s.table}>
                <View style={[s.tableRow, s.tableHead]}>
                  <View style={{ width:36 }} />
                  <Text style={[s.tableCell, { flex:1.5, fontWeight:'800' }]}>Nome</Text>
                  <Text style={[s.tableCell, { flex:1.5, fontWeight:'800' }]}>WhatsApp</Text>
                  <Text style={[s.tableCell, { flex:1, fontWeight:'800' }]}>Tags</Text>
                  <Text style={[s.tableCell, { flex:1, fontWeight:'800' }]}>Origem</Text>
                  <Text style={[s.tableCell, { flex:1.2, fontWeight:'800' }]}>Cadastrado</Text>
                  <View style={{ width:40 }} />
                </View>
                <ScrollView style={{ maxHeight:500 }}>
                  {contacts.map(c => (
                    <View key={c.id} style={s.tableRow}>
                      <TouchableOpacity style={{ width:36, alignItems:'center' }} onPress={() => setSelectedCtcs(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}>
                        {selectedCtcs.has(c.id) ? <CheckSquare size={15} color="#0084FF" /> : <Square size={15} color="#CBD5E1" />}
                      </TouchableOpacity>
                      <Text style={[s.tableCell, { flex:1.5 }]}>{c.name || '—'}</Text>
                      <Text style={[s.tableCell, { flex:1.5 }]}>{fmtPhone(c.phone)}</Text>
                      <Text style={[s.tableCell, { flex:1, color:'#64748B' }]}>{c.tags || '—'}</Text>
                      <Text style={[s.tableCell, { flex:1 }]}>
                        <View style={[s.sourceBadge, { backgroundColor: c.source === 'site_lead' ? '#DBEAFE' : '#F1F5F9' }]}>
                          <Text style={{ fontSize:10, fontWeight:'700', color: c.source === 'site_lead' ? '#1D4ED8' : '#475569' }}>
                            {c.source === 'site_lead' ? 'Lead Site' : c.source === 'import' ? 'Importado' : 'Manual'}
                          </Text>
                        </View>
                      </Text>
                      <Text style={[s.tableCell, { flex:1.2, color:'#64748B' }]}>{fmtDate(c.created_at)}</Text>
                      <TouchableOpacity style={{ width:40, alignItems:'center' }} onPress={() => handleDeleteContact(c.id)}>
                        <Trash2 size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ABA: LISTAS DE AUDIÊNCIA
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'lists' && (
          <View>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Listas de Audiência</Text>
                <Text style={s.sectionSub}>Organize contatos em grupos para usar nas campanhas.</Text>
              </View>
              <TouchableOpacity style={s.btnPrimary} onPress={() => setShowListForm(true)} activeOpacity={0.85}>
                <Plus size={15} color="#fff" /><Text style={s.btnPrimaryTxt}>Nova Lista</Text>
              </TouchableOpacity>
            </View>

            {/* Form Nova Lista */}
            {showListForm && (
              <View style={s.formCard}>
                <Text style={s.formTitle}>Nova Lista de Audiência</Text>
                <View style={{ gap:8 }}>
                  <TextInput style={s.input} placeholder="Nome da lista *" placeholderTextColor="#94A3B8" value={listForm.name} onChangeText={v => setListForm(f => ({...f, name:v}))} />
                  <TextInput style={s.input} placeholder="Descrição (opcional)" placeholderTextColor="#94A3B8" value={listForm.description} onChangeText={v => setListForm(f => ({...f, description:v}))} />
                </View>
                <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
                  <TouchableOpacity style={s.btnPrimary} onPress={handleCreateList} activeOpacity={0.85}>
                    <Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Criar Lista</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => setShowListForm(false)}>
                    <Text style={s.btnSecondaryTxt}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Dica para adicionar contatos selecionados */}
            {selectedCtcs.size > 0 && (
              <View style={s.tipBox}>
                <Text style={{ fontSize:13, fontWeight:'700', color:'#1D4ED8' }}>
                  {selectedCtcs.size} contato(s) selecionados na aba Contatos — clique em uma lista para adicioná-los:
                </Text>
              </View>
            )}

            {/* Grid de Listas */}
            {loadingLists ? (
              <ActivityIndicator size="large" color="#0084FF" style={{ marginTop:40 }} />
            ) : lists.length === 0 ? (
              <View style={s.emptyState}>
                <List size={32} color="#CBD5E1" />
                <Text style={s.emptyTitle}>Nenhuma lista ainda</Text>
                <Text style={s.emptySub}>Crie listas de audiência para organizar seus contatos por campanha.</Text>
              </View>
            ) : (
              <View style={s.listGrid}>
                {lists.map(list => (
                  <View key={list.id} style={[s.listCard, openList?.id === list.id && s.listCardOpen]}>
                    <View style={s.listCardTop}>
                      <View style={{ flex:1 }}>
                        <Text style={s.listName}>{list.name}</Text>
                        {list.description ? <Text style={s.listDesc}>{list.description}</Text> : null}
                        <Text style={s.listCount}>👥 {list.contact_count || 0} contatos</Text>
                        <Text style={s.listDate}>{fmtDate(list.created_at)}</Text>
                      </View>
                      <View style={{ gap:6 }}>
                        <TouchableOpacity style={s.btnIconSm} onPress={() => openList?.id === list.id ? setOpenList(null) : openListDetails(list)}>
                          <BookOpen size={13} color="#0084FF" />
                          <Text style={[s.btnIconSmTxt, { color:'#0084FF' }]}>Ver</Text>
                        </TouchableOpacity>
                        {selectedCtcs.size > 0 && (
                          <TouchableOpacity style={[s.btnIconSm, { backgroundColor:'#EFF6FF' }]} onPress={() => handleAddSelectedToList(list.id)}>
                            <Plus size={13} color="#0084FF" />
                            <Text style={[s.btnIconSmTxt, { color:'#0084FF' }]}>Adicionar</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={s.btnIconSm} onPress={() => handleDeleteList(list.id)}>
                          <Trash2 size={13} color="#DC2626" />
                          <Text style={[s.btnIconSmTxt, { color:'#DC2626' }]}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Contatos da Lista Expandida */}
                    {openList?.id === list.id && (
                      <View style={s.listContactsPanel}>
                        <Text style={{ fontSize:12, fontWeight:'700', color:'#334155', marginBottom:8 }}>Contatos nesta lista:</Text>
                        {listContacts.length === 0 ? (
                          <Text style={{ fontSize:12, color:'#94A3B8' }}>Lista vazia. Selecione contatos e clique em "Adicionar".</Text>
                        ) : (
                          <ScrollView style={{ maxHeight:220 }}>
                            {listContacts.map(c => (
                              <View key={c.id} style={s.listContactItem}>
                                <View style={{ flex:1 }}>
                                  <Text style={{ fontSize:12, fontWeight:'700', color:'#0F172A' }}>{c.name || 'Sem nome'}</Text>
                                  <Text style={{ fontSize:11, color:'#64748B' }}>{fmtPhone(c.phone)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveFromList(c.id)} style={{ padding:4 }}>
                                  <X size={14} color="#94A3B8" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ABA: META API
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'meta' && (
          <View>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionTitle}>Configuração Meta WhatsApp Cloud API</Text>
                <Text style={s.sectionSub}>Conecte sua conta oficial para disparos via API da Meta.</Text>
              </View>
              <View style={[s.badge, { backgroundColor: hasMetaApi ? '#DCFCE7' : '#FEE2E2', borderColor: hasMetaApi ? '#86EFAC' : '#FECACA', padding:8 }]}>
                <Text style={{ fontSize:12, fontWeight:'800', color: hasMetaApi ? '#16A34A' : '#DC2626' }}>
                  {hasMetaApi ? '✓ Meta Conectada' : '✗ Sem Token Configurado'}
                </Text>
              </View>
            </View>

            <View style={s.formCard}>
              <Text style={s.formTitle}>Credenciais da Conta Meta Business</Text>
              <View style={{ gap:10 }}>
                <View>
                  <Text style={s.fieldLabel}>ID da Conta WhatsApp Business (WABA ID)</Text>
                  <TextInput style={s.input} placeholder="Ex: 123456789012345" placeholderTextColor="#94A3B8" value={wabaId} onChangeText={setWabaId} />
                </View>
                <View>
                  <Text style={s.fieldLabel}>ID do Número de Telefone (Phone Number ID)</Text>
                  <TextInput style={s.input} placeholder="Ex: 987654321098765" placeholderTextColor="#94A3B8" value={phoneId} onChangeText={setPhoneId} />
                </View>
                <View>
                  <Text style={s.fieldLabel}>Token de Acesso Permanente</Text>
                  <TextInput style={[s.input, { height:64 }]} multiline placeholder="EAAxxxx... (Token gerado no Meta Business Manager)" placeholderTextColor="#94A3B8" value={metaToken} onChangeText={setMetaToken} secureTextEntry />
                </View>
                <TouchableOpacity style={s.btnPrimary} onPress={handleSaveMeta} disabled={savingMeta} activeOpacity={0.88}>
                  {savingMeta ? <ActivityIndicator size="small" color="#fff" /> : <><Check size={15} color="#fff" /><Text style={s.btnPrimaryTxt}>Salvar e Puxar Templates</Text></>}
                </TouchableOpacity>
              </View>
            </View>

            {hasMetaApi && (
              <View style={s.formCard}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <Text style={s.formTitle}>Templates HSM Aprovados ({metaTemplates.length})</Text>
                  <TouchableOpacity style={s.btnSecondary} onPress={() => handleSyncTemplates()} disabled={syncingMeta} activeOpacity={0.8}>
                    <RefreshCw size={13} color="#0084FF" />
                    <Text style={[s.btnSecondaryTxt, { color:'#0084FF' }]}>{syncingMeta ? 'Sincronizando...' : 'Sincronizar Agora'}</Text>
                  </TouchableOpacity>
                </View>

                {metaTemplates.length === 0 ? (
                  <View style={s.emptyState}>
                    <Inbox size={28} color="#CBD5E1" />
                    <Text style={s.emptySub}>Nenhum template APPROVED encontrado. Clique em "Sincronizar Agora".</Text>
                  </View>
                ) : (
                  <View style={{ gap:8 }}>
                    {metaTemplates.map(t => {
                      let btns = [];
                      try { btns = typeof t.buttons === 'string' ? JSON.parse(t.buttons) : (t.buttons || []); } catch {}
                      return (
                        <View key={t.id} style={s.tmplCard}>
                          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                            <View style={{ flex:1 }}>
                              <Text style={{ fontSize:13, fontWeight:'800', color:'#0F172A' }}>{t.name}</Text>
                              <Text style={{ fontSize:11, color:'#64748B' }}>{t.category} · {t.language} · <Text style={{ color:'#16A34A', fontWeight:'700' }}>{t.meta_status}</Text></Text>
                            </View>
                          </View>
                          <View style={s.tmplPreviewBox}>
                            <Text style={{ fontSize:12, color:'#334155', lineHeight:17 }}>{compilePreview(t.body_text)}</Text>
                          </View>
                          {btns.length > 0 && (
                            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:6 }}>
                              {btns.map((b, bi) => (
                                <View key={bi} style={s.tmplBtn}>
                                  <Text style={{ fontSize:11, color:'#0084FF', fontWeight:'700' }}>{b.text}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { flex:1, backgroundColor:'#F8FAFC' },
  topbar: { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#E2E8F0', height:60, justifyContent:'center', position:'sticky', top:0, zIndex:100 },
  topbarInner: { maxWidth:1280, width:'100%', alignSelf:'center', paddingHorizontal:20, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  badge: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#EFF6FF', paddingHorizontal:9, paddingVertical:3, borderRadius:20, borderWidth:1, borderColor:'#BFDBFE' },
  badgeTxt: { fontSize:10, fontWeight:'800', color:'#0084FF', letterSpacing:0.3 },
  btnBack: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:12, paddingVertical:6, borderRadius:8, backgroundColor:'#F1F5F9' },
  btnBackTxt: { fontSize:12, fontWeight:'700', color:'#0F172A' },
  tabBar: { backgroundColor:'#fff', borderBottomWidth:1, borderBottomColor:'#E2E8F0', position:'sticky', top:60, zIndex:99 },
  tabBarInner: { maxWidth:1280, alignSelf:'center', flexDirection:'row', paddingHorizontal:20 },
  tabItem: { paddingHorizontal:16, paddingVertical:12, borderBottomWidth:2, borderBottomColor:'transparent' },
  tabItemActive: { borderBottomColor:'#0084FF' },
  tabTxt: { fontSize:13, fontWeight:'600', color:'#64748B' },
  tabTxtActive: { color:'#0084FF', fontWeight:'800' },
  scroll: { flex:1 },
  scrollContent: { maxWidth:1280, width:'100%', alignSelf:'center', padding:20 },

  sectionHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 },
  sectionTitle: { fontSize:18, fontWeight:'800', color:'#0F172A' },
  sectionSub: { fontSize:13, color:'#64748B', marginTop:2 },

  formCard: { backgroundColor:'#fff', borderRadius:12, padding:18, borderWidth:1, borderColor:'#E2E8F0', marginBottom:16 },
  formTitle: { fontSize:14, fontWeight:'800', color:'#0F172A', marginBottom:12 },
  formGrid: { gap:10 },
  formGrid2: { flexDirection:'row', flexWrap:'wrap', gap:10 },
  input: { backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#E2E8F0', borderRadius:8, paddingHorizontal:10, paddingVertical:8, fontSize:12, color:'#0F172A', minWidth:200 },
  fieldLabel: { fontSize:12, fontWeight:'700', color:'#334155', marginBottom:4 },

  selectBox: { gap:4 },
  selectLabel: { fontSize:12, fontWeight:'700', color:'#334155' },
  chip: { paddingHorizontal:10, paddingVertical:5, borderRadius:6, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  chipActive: { backgroundColor:'#0084FF', borderColor:'#0084FF' },
  chipTxt: { fontSize:11, fontWeight:'600', color:'#475569' },
  chipTxtActive: { color:'#fff', fontWeight:'700' },

  miniPreview: { backgroundColor:'#EFEAE2', borderRadius:8, padding:10, marginTop:8 },

  btnPrimary: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:'#0084FF', paddingHorizontal:14, paddingVertical:9, borderRadius:8 },
  btnPrimaryTxt: { color:'#fff', fontSize:13, fontWeight:'700' },
  btnSecondary: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:8, borderRadius:8, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  btnSecondaryTxt: { fontSize:12, fontWeight:'600', color:'#475569' },

  emptyState: { paddingVertical:48, alignItems:'center', gap:8 },
  emptyTitle: { fontSize:15, fontWeight:'700', color:'#334155' },
  emptySub: { fontSize:13, color:'#94A3B8', textAlign:'center', maxWidth:340 },

  campCard: { backgroundColor:'#fff', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E2E8F0' },
  campCardTop: { flexDirection:'row', gap:16, alignItems:'flex-start' },
  campName: { fontSize:14, fontWeight:'800', color:'#0F172A' },
  campMeta: { fontSize:11, color:'#64748B' },
  statusBadge: { paddingHorizontal:7, paddingVertical:2, borderRadius:4 },
  statusTxt: { fontSize:10, fontWeight:'800' },
  btnLaunch: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#16A34A', paddingHorizontal:10, paddingVertical:6, borderRadius:7 },
  btnLaunchDis: { backgroundColor:'#94A3B8' },
  btnLaunchTxt: { fontSize:12, fontWeight:'700', color:'#fff' },
  btnIconSm: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:5, borderRadius:6, backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#E2E8F0' },
  btnIconSmTxt: { fontSize:11, fontWeight:'600', color:'#475569' },

  logHead: { flex:1, fontSize:11, fontWeight:'800', color:'#475569' },
  logRow: { flexDirection:'row', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#F8FAFC' },
  logCell: { flex:1, fontSize:11, color:'#334155' },

  searchBar: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderWidth:1, borderColor:'#E2E8F0', borderRadius:8, paddingHorizontal:10, paddingVertical:6, marginBottom:12 },
  searchInput: { flex:1, fontSize:12, color:'#0F172A', outline:'none' },
  selBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#F1F5F9', marginBottom:6 },

  table: { backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#E2E8F0', overflow:'hidden' },
  tableHead: { backgroundColor:'#F8FAFC', borderBottomWidth:1, borderBottomColor:'#E2E8F0' },
  tableRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#F8FAFC' },
  tableCell: { flex:1, fontSize:12, color:'#334155' },
  sourceBadge: { paddingHorizontal:6, paddingVertical:2, borderRadius:4, alignSelf:'flex-start' },

  listGrid: { flexDirection:'row', flexWrap:'wrap', gap:16 },
  listCard: { flex:1, minWidth:280, backgroundColor:'#fff', borderRadius:12, padding:16, borderWidth:1, borderColor:'#E2E8F0' },
  listCardOpen: { borderColor:'#0084FF', borderWidth:1.5 },
  listCardTop: { flexDirection:'row', gap:12 },
  listName: { fontSize:14, fontWeight:'800', color:'#0F172A' },
  listDesc: { fontSize:12, color:'#64748B', marginTop:2 },
  listCount: { fontSize:12, fontWeight:'700', color:'#0084FF', marginTop:4 },
  listDate: { fontSize:11, color:'#94A3B8', marginTop:2 },
  listContactsPanel: { marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:'#F1F5F9' },
  listContactItem: { flexDirection:'row', alignItems:'center', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#F8FAFC' },
  tipBox: { backgroundColor:'#EFF6FF', borderWidth:1, borderColor:'#BFDBFE', borderRadius:8, padding:12, marginBottom:12 },

  tmplCard: { backgroundColor:'#F8FAFC', borderRadius:10, padding:12, borderWidth:1, borderColor:'#E2E8F0' },
  tmplPreviewBox: { backgroundColor:'#fff', borderRadius:6, padding:8, marginTop:4 },
  tmplBtn: { backgroundColor:'#EFF6FF', paddingHorizontal:8, paddingVertical:4, borderRadius:4 },
});
