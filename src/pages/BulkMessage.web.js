import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutDashboard, Megaphone, Users, ListFilter, MessageSquare,
  DollarSign, Settings, Send, ExternalLink, ArrowLeft, ShieldCheck,
  Zap, RefreshCw, CheckSquare, Square, Smartphone, Check, Lock, Upload,
  Plus, Trash2, AlertCircle, BarChart2, X, Search, Tag, BookOpen, Inbox,
  Download, Edit2, TrendingUp, Activity
} from 'lucide-react-native';
import BrandLogo from '../components/BrandLogo';
import { fetchWhatsAppLeads } from '../utils/analytics';
import { fetchAllEvents } from '../utils/api';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAdminConfig } from '../context/AdminConfigContext';

const API = 'https://rafaelpublicado.com.br/api';
const USD_RATE = 5.50; // Taxa de conversão estimada para os custos

const MENUS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'contacts',  label: 'Contatos',  icon: Users },
  { id: 'lists',     label: 'Listas',    icon: ListFilter },
  { id: 'templates', label: 'Templates Meta', icon: MessageSquare },
  { id: 'costs',     label: 'Custo & Análise', icon: DollarSign },
  { id: 'settings',  label: 'Config. API', icon: Settings },
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

function fmtMoney(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function BulkMessage() {

  const { isAuthenticated, loginAdmin } = useAdminConfig();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const { isMobile } = useBreakpoint();

  const handleLogin = async () => {
    const success = await loginAdmin(emailInput, passwordInput);
    if (!success) setLoginError('Credenciais inválidas.');
  };
  const navigation = useNavigation();
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // ── Global State ──
  const [eventsList, setEventsList] = useState([]);
  const [metaTemplates, setMetaTemplates] = useState([]);
  const [hasMetaApi, setHasMetaApi] = useState(false);
  
  // ── Dashboard / Stats ──
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Meta Settings ──
  const [metaToken, setMetaToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  // ── Campaigns ──
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(false);
  const [showNewCamp, setShowNewCamp] = useState(false);
  const [campForm, setCampForm] = useState({ name:'', list_id:'', template_name:'', event_id:'' });
  const [savingCamp, setSavingCamp] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [campLogs, setCampLogs] = useState([]);
  const [launchingId, setLaunchingId] = useState(null);
  const [editingCamp, setEditingCamp] = useState(null);

  // ── Contacts ──
  const [contacts, setContacts] = useState([]);
  const [loadingCtcs, setLoadingCtcs] = useState(false);
  const [ctcSearch, setCtcSearch] = useState('');
  const [ctcForm, setCtcForm] = useState({ name:'', phone:'', tags:'', notes:'' });
  const [showCtcForm, setShowCtcForm] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [importingLeads, setImportingLeads] = useState(false);
  const [selectedCtcs, setSelectedCtcs] = useState(new Set());

  // ── Lists ──
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [openList, setOpenList] = useState(null);
  const [listContacts, setListContacts] = useState([]);
  const [listForm, setListForm] = useState({ name:'', description:'' });
  const [showListForm, setShowListForm] = useState(false);

  useEffect(() => {
    loadEvents();
    loadMetaConfig();
  }, []);

  useEffect(() => {
    if (activeMenu === 'dashboard' || activeMenu === 'costs') loadStats();
    if (activeMenu === 'campaigns') loadCampaigns();
    if (activeMenu === 'contacts') loadContacts();
    if (activeMenu === 'lists') loadLists();
  }, [activeMenu]);

  // ─── LOADERS ──────────────────────────────────────────────────────────
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API}/crm/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoadingStats(false);
  };

  const loadEvents = async () => {
    try {
      const res = await fetchAllEvents();
      if (res.ok) { const d = await res.json(); setEventsList(d.results || []); }
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
          if (ok) {
            setMetaToken('********************************');
            fetchMetaTemplates();
          }
        }
      }
    } catch {}
  };

  const fetchMetaTemplates = async () => {
    try {
      const res = await fetch(`${API}/meta/templates`);
      if (res.ok) { const d = await res.json(); setMetaTemplates(d.templates || []); }
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

  // ─── ACTIONS ─────────────────────────────────────────────────────────
  const handleSaveMeta = async () => {
    if (!wabaId || !phoneId || !metaToken) { alert('Preencha todos os campos.'); return; }
    setSavingMeta(true);
    try {
      const res = await fetch(`${API}/meta/config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_id: phoneId, waba_id: wabaId, access_token: metaToken }),
      });
      if (res.ok) {
        setHasMetaApi(true);
        await handleSyncTemplates(wabaId, metaToken);
        alert('Meta conectada!');
      } else alert('Erro ao salvar.');
    } catch { alert('Erro.'); }
    setSavingMeta(false);
  };

  const handleSyncTemplates = async (wid, tok) => {
    setSyncingMeta(true);
    try {
      const res = await fetch(`${API}/meta/sync-templates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waba_id: wid || wabaId, access_token: (tok || metaToken) === '********************************' ? null : (tok || metaToken) }),
      });
      const d = await res.json();
      if (res.ok && d.templates?.length > 0) {
        setMetaTemplates(d.templates);
        if (!tok) alert(`${d.templates.length} modelos carregados!`);
      } else {
        if (!tok) alert(d.error || 'Nenhum modelo aprovado.');
      }
    } catch (err) { if (!tok) alert(`Erro: ${err.message}`); }
    setSyncingMeta(false);
  };

  const handleCreateCampaign = async () => {
    if (!campForm.name) { alert('Nome obrigatório.'); return; }
    setSavingCamp(true);
    try {
      const res = await fetch(`${API}/crm/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campForm.name, list_id: (campForm.list_id && lists.find(l => String(l.id) === String(campForm.list_id))) ? campForm.list_id : null,
          template_name: campForm.template_name, template_language: 'pt_BR', event_id: campForm.event_id || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setCampaigns(prev => [d.campaign, ...prev]);
        setShowNewCamp(false);
        setCampForm({ name:'', list_id:'', template_name:'', event_id:'' });
      } else alert(d.error || 'Erro.');
    } catch { alert('Erro.'); }
    setSavingCamp(false);
  };

  const handleUpdateCampaign = async () => {
    if (!editingCamp) return;
    try {
      const res = await fetch(`${API}/crm/campaigns/${editingCamp.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCamp),
      });
      const d = await res.json();
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === d.campaign.id ? d.campaign : c));
        setEditingCamp(null);
      } else alert(d.error || 'Erro.');
    } catch { alert('Erro.'); }
  };

  const handleLaunchCampaign = async (campId) => {
    if (!confirm('Disparar campanha via Meta?')) return;
    setLaunchingId(campId);
    try {
      const res = await fetch(`${API}/crm/campaigns/${campId}/launch`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        alert(`Disparo concluído!\n${d.sentCount} enviadas | ${d.errorCount} erros`);
        loadCampaigns();
      } else alert(`Erro: ${d.error}`);
    } catch (err) { alert(`Erro: ${err.message}`); }
    setLaunchingId(null);
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Excluir?')) return;
    await fetch(`${API}/crm/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const openCampaignLogs = async (camp) => {
    setSelectedCamp(camp);
    try {
      const res = await fetch(`${API}/crm/campaigns/${camp.id}`);
      if (res.ok) { const d = await res.json(); setCampLogs(d.logs || []); }
    } catch {}
  };

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
        loadContacts();
        setCtcForm({ name:'', phone:'', tags:'', notes:'' });
        setShowCtcForm(false);
      } else alert(d.error || 'Erro.');
    } catch { alert('Erro.'); }
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
    if (!parsed.length) { alert('Nenhum válido.'); return; }
    const res = await fetch(`${API}/crm/contacts/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: parsed, source: 'paste' }),
    });
    if (res.ok) { alert('Importados com sucesso!'); setPasteText(''); setShowPaste(false); loadContacts(); }
  };

  const handleImportLeads = async () => {
    setImportingLeads(true);
    try {
      const leads = await fetchWhatsAppLeads();
      if (!leads?.length) { alert('Nenhum lead.'); setImportingLeads(false); return; }
      const parsed = leads.map(l => ({ name: l.name || '', phone: cleanPhone(l.whatsapp) })).filter(l => l.phone.length >= 8);
      const res = await fetch(`${API}/crm/contacts/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: parsed, source: 'site_lead' }),
      });
      if (res.ok) { alert('Leads importados!'); loadContacts(); }
    } catch { alert('Erro.'); }
    setImportingLeads(false);
  };

  const handleDeleteContact = async (id) => {
    if (!confirm('Excluir?')) return;
    await fetch(`${API}/crm/contacts/${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleCreateList = async () => {
    if (!listForm.name) return;
    const res = await fetch(`${API}/crm/lists`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(listForm),
    });
    if (res.ok) { loadLists(); setListForm({ name:'', description:'' }); setShowListForm(false); }
  };

  const handleDeleteList = async (id) => {
    if (!confirm('Excluir lista?')) return;
    await fetch(`${API}/crm/lists/${id}`, { method: 'DELETE' });
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const handleRemoveFromList = async (contactId) => {
    if (!openList) return;
    await fetch(`${API}/crm/lists/${openList.id}/contacts/${contactId}`, { method: 'DELETE' });
    openListDetails(openList);
    loadLists();
  };

  const handleAddSelectedToList = async (listId) => {
    if (selectedCtcs.size === 0) { alert('Selecione contatos na aba Contatos.'); return; }
    const res = await fetch(`${API}/crm/lists/${listId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: Array.from(selectedCtcs) }),
    });
    if (res.ok) { alert('Adicionados!'); setSelectedCtcs(new Set()); loadLists(); }
  };

  // ─── HELPERS ───────────────────────────────────────────────────────────
  const getPreviewTemplate = (name) => metaTemplates.find(t => t.name === name);
  const compilePreview = (bodyText) => (bodyText || '').replace(/{{1}}/g, 'Rafael').replace(/{{2}}/g, 'Evento Exemplo').replace(/{{3}}/g, 'https://rafaelpublicado.com.br');

  // ─── RENDERERS POR ABA ───────────────────────────────────────────────
  
  const renderDashboard = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <Text style={s.pageTitle}>Dashboard CRM</Text>
      <Text style={s.pageSubtitle}>Visão geral dos seus disparos e base de contatos.</Text>
      
      {loadingStats ? <ActivityIndicator size="large" color="#0084FF" style={{ marginTop:40 }} /> : stats ? (
        <>
          <View style={s.dashGrid}>
            <View style={s.statCard}>
              <View style={s.statIconBox}><Users size={20} color="#0084FF" /></View>
              <Text style={s.statLabel}>Total de Contatos</Text>
              <Text style={s.statValue}>{stats.contacts}</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconBox, { backgroundColor:'#FEF3C7' }]}><Megaphone size={20} color="#D97706" /></View>
              <Text style={s.statLabel}>Campanhas Totais</Text>
              <Text style={s.statValue}>{stats.campaigns?.total || 0}</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconBox, { backgroundColor:'#DCFCE7' }]}><Send size={20} color="#16A34A" /></View>
              <Text style={s.statLabel}>Envios este mês</Text>
              <Text style={s.statValue}>{stats.month?.sent || 0}</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIconBox, { backgroundColor:'#FEE2E2' }]}><DollarSign size={20} color="#DC2626" /></View>
              <Text style={s.statLabel}>Custo Est. Mês</Text>
              <Text style={s.statValue}>{fmtMoney((stats.month?.cost_usd || 0) * USD_RATE)}</Text>
            </View>
          </View>

          <Text style={[s.sectionTitle, { marginTop:24, marginBottom:12 }]}>Atividade Recente</Text>
          <View style={s.recentList}>
            {stats.recentCampaigns?.length === 0 && <Text style={{ color:'#64748B', padding:10 }}>Nenhuma campanha recente.</Text>}
            {stats.recentCampaigns?.map(c => (
              <View key={c.id} style={s.recentItem}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:14, fontWeight:'700', color:'#0F172A' }}>{c.name}</Text>
                  <Text style={{ fontSize:12, color:'#64748B' }}>{c.list_name || 'Sem lista'} • {fmtDate(c.created_at)}</Text>
                </View>
                <View style={{ alignItems:'flex-end' }}>
                  <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[c.status]?.bg || '#F1F5F9' }]}>
                    <Text style={[s.statusTxt, { color: STATUS_COLORS[c.status]?.text || '#475569' }]}>{STATUS_COLORS[c.status]?.label}</Text>
                  </View>
                  {c.status === 'done' && (
                    <Text style={{ fontSize:11, color:'#64748B', marginTop:4 }}>{c.sent_logs} envios (est. {fmtMoney(c.cost_usd * USD_RATE)})</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  const renderCosts = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <Text style={s.pageTitle}>Custo & Análise</Text>
      <Text style={s.pageSubtitle}>Estimativa de custos da Meta Cloud API com base no dólar a R$ {USD_RATE.toFixed(2)}.</Text>
      
      {loadingStats ? <ActivityIndicator size="large" /> : stats ? (
        <>
          <View style={[s.card, { marginTop:20, backgroundColor:'#0F172A' }]}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <View>
                <Text style={{ color:'#94A3B8', fontSize:13, fontWeight:'600' }}>Custo Estimado Mês Atual</Text>
                <Text style={{ color:'#fff', fontSize:32, fontWeight:'800', marginTop:4 }}>{fmtMoney((stats.month?.cost_usd || 0) * USD_RATE)}</Text>
                <Text style={{ color:'#64748B', fontSize:12, marginTop:4 }}>Total em USD: ${(stats.month?.cost_usd || 0).toFixed(2)}</Text>
              </View>
              <TrendingUp size={48} color="#334155" />
            </View>
          </View>

          <Text style={[s.sectionTitle, { marginTop:24, marginBottom:12 }]}>Detalhamento por Categoria (HSM)</Text>
          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={[s.tableCell, { flex:2, fontWeight:'800' }]}>Categoria</Text>
              <Text style={[s.tableCell, { flex:1, fontWeight:'800', textAlign:'center' }]}>Mensagens</Text>
              <Text style={[s.tableCell, { flex:1, fontWeight:'800', textAlign:'right' }]}>Custo Unit. (USD)</Text>
              <Text style={[s.tableCell, { flex:1.5, fontWeight:'800', textAlign:'right' }]}>Subtotal (BRL)</Text>
            </View>
            {stats.month?.breakdown?.map((b, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, { flex:2, fontWeight:'700', color:'#1D4ED8' }]}>{b.category}</Text>
                <Text style={[s.tableCell, { flex:1, textAlign:'center' }]}>{b.msg_count}</Text>
                <Text style={[s.tableCell, { flex:1, textAlign:'right', color:'#64748B' }]}>${b.rate.toFixed(4)}</Text>
                <Text style={[s.tableCell, { flex:1.5, textAlign:'right', fontWeight:'700' }]}>{fmtMoney(b.cost_usd * USD_RATE)}</Text>
              </View>
            ))}
            {stats.month?.breakdown?.length === 0 && (
              <Text style={{ padding:16, color:'#64748B', textAlign:'center' }}>Nenhum envio realizado este mês.</Text>
            )}
          </View>

          <View style={s.tipBox}>
            <AlertCircle size={16} color="#1D4ED8" />
            <Text style={{ color:'#1D4ED8', fontSize:12, flex:1, marginLeft:8 }}>
              O custo exato pode variar conforme a cotação oficial do dólar do seu cartão de crédito na data de fechamento da fatura da Meta. A Meta também fornece 1.000 mensagens de "Atendimento" (Service) gratuitas por mês.
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  const renderCampaigns = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View>
          <Text style={s.pageTitle}>Campanhas</Text>
          <Text style={s.pageSubtitle}>Crie e gerencie disparos de mensagens em massa.</Text>
        </View>
        {!showNewCamp && (
          <TouchableOpacity style={s.btnPrimary} onPress={() => setShowNewCamp(true)}>
            <Plus size={15} color="#fff" /><Text style={s.btnPrimaryTxt}>Nova Campanha</Text>
          </TouchableOpacity>
        )}
      </View>

      {showNewCamp && (
        <View style={[s.card, { marginBottom: 24, borderColor: '#0084FF', borderWidth: 2 }]}>
          <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <Text style={[s.cardTitle, { marginBottom: 0 }]}>Nova Campanha de Disparo</Text>
            <TouchableOpacity onPress={() => setShowNewCamp(false)}><X size={20} color="#94A3B8" /></TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 300 }}>
              <Text style={s.label}>1. Nome da Campanha</Text>
              <TextInput style={s.input} placeholder="Ex: Promoção Dia das Mães" value={campForm.name} onChangeText={v => setCampForm(f => ({...f, name:v}))} />
              
              <Text style={s.label}>2. Selecione o Público (Lista de Audiência)</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {lists.length === 0 && <Text style={{ color:'#DC2626', fontSize: 13 }}>Nenhuma lista criada. Vá na aba "Listas" e crie uma.</Text>}
                {lists.map(l => (
                  <TouchableOpacity key={l.id} style={[s.chip, campForm.list_id === String(l.id) && s.chipActive, { paddingVertical: 10, justifyContent:'space-between', flexDirection:'row' }]} onPress={() => setCampForm(f => ({...f, list_id: String(l.id)}))}>
                    <Text style={[s.chipTxt, campForm.list_id === String(l.id) && s.chipTxtActive]}>{l.name}</Text>
                    <Text style={[s.chipTxt, campForm.list_id === String(l.id) && s.chipTxtActive, { opacity: 0.8 }]}>{l.contact_count} contatos</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>3. Selecione a Mensagem (Template Meta)</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {metaTemplates.length === 0 && <Text style={{ color:'#DC2626', fontSize: 13 }}>Nenhum template encontrado. Verifique a aba "Templates Meta".</Text>}
                {metaTemplates.map(t => (
                  <TouchableOpacity key={t.id} style={[s.chip, campForm.template_name === t.name && s.chipActive, { paddingVertical: 10 }]} onPress={() => setCampForm(f => ({...f, template_name: t.name}))}>
                    <Text style={[s.chipTxt, campForm.template_name === t.name && s.chipTxtActive]}>{t.name} (Categoria: {t.category})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection:'row', gap:8, marginTop: 20 }}>
                <TouchableOpacity style={[s.btnPrimary, { flex:1, justifyContent:'center', paddingVertical:14, backgroundColor: '#0084FF' }]} onPress={handleCreateCampaign} disabled={savingCamp}>
                  <Text style={[s.btnPrimaryTxt, { fontSize: 15 }]}>{savingCamp ? 'Salvando...' : 'Salvar Rascunho'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ width: 320, backgroundColor: '#EFEAE2', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#D1D5DB' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B5563', marginBottom: 12, textAlign: 'center' }}>Pré-visualização do WhatsApp</Text>
              {campForm.template_name ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderTopLeftRadius: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  <Text style={{ fontSize: 14, color: '#111B21', lineHeight: 20 }}>
                    {compilePreview(getPreviewTemplate(campForm.template_name)?.body_text)}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#667781', textAlign: 'right', marginTop: 4 }}>12:00</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: 20, borderRadius: 8, alignItems: 'center' }}>
                  <MessageSquare size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>Selecione um template para ver como ficará no celular do cliente.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={{ marginTop: 20, gap: 12 }}>
        {campaigns.length === 0 && !showNewCamp && <Text style={{ color:'#64748B', textAlign:'center', marginTop: 40 }}>Você ainda não criou nenhuma campanha.</Text>}
        {campaigns.map(camp => {
          const st = STATUS_COLORS[camp.status] || STATUS_COLORS.draft;
          const list = lists.find(l => String(l.id) === String(camp.list_id));
          const canLaunch = hasMetaApi && camp.status !== 'running' && camp.template_name && camp.list_id;
          
          return (
            <View key={camp.id} style={s.card}>
              <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                <View>
                  <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginBottom:4 }}>
                    <Text style={{ fontSize:15, fontWeight:'800', color:'#0F172A' }}>{camp.name}</Text>
                    <View style={[s.statusBadge, { backgroundColor: st.bg }]}><Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text></View>
                  </View>
                  <Text style={{ fontSize:13, color:'#64748B', marginBottom:8, fontWeight:'500' }}>
                    👥 Público: {list?.name || 'Sem lista'}   |   💬 Mensagem: {camp.template_name}   |   📅 {fmtDate(camp.created_at)}
                  </Text>
                  {camp.status === 'done' && (
                     <Text style={{ fontSize:13, color:'#16A34A', fontWeight:'700', marginTop: 4 }}>✓ {camp.sent_count} envios confirmados. {camp.error_count > 0 ? `(${camp.error_count} erros)` : ''}</Text>
                  )}
                  {camp.status === 'error' && (
                     <Text style={{ fontSize:13, color:'#DC2626', fontWeight:'700', marginTop: 4 }}>⚠ {camp.error_count} erros no envio.</Text>
                  )}
                </View>
                <View style={{ gap:8, width: 140 }}>
                  {camp.status === 'draft' && (
                    <TouchableOpacity style={[s.btnLaunch, !canLaunch && { backgroundColor:'#94A3B8' }, { justifyContent: 'center' }]} onPress={() => canLaunch && handleLaunchCampaign(camp.id)}>
                      <Zap size={14} color="#fff" /><Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Disparar Agora</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.btnSecondary, { justifyContent: 'center' }]} onPress={() => openCampaignLogs(camp)}>
                    <Activity size={14} color="#475569" /><Text style={s.btnSecondaryTxt}>Ver Relatório</Text>
                  </TouchableOpacity>
                  {camp.status === 'draft' && (
                    <TouchableOpacity onPress={() => handleDeleteCampaign(camp.id)}>
                      <Text style={{ color:'#DC2626', fontSize:12, textAlign:'center', marginTop: 4, fontWeight:'600' }}>Excluir Rascunho</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {selectedCamp?.id === camp.id && (
                <View style={{ marginTop:16, borderTopWidth:1, borderColor:'#E2E8F0', paddingTop:16 }}>
                  <Text style={{ fontWeight:'800', marginBottom:12, fontSize: 14, color: '#0F172A' }}>Relatório de Disparo:</Text>
                  {campLogs.length === 0 && <Text style={{ color: '#64748B', fontSize: 13 }}>Nenhum log registrado para esta campanha.</Text>}
                  {campLogs.map(log => (
                    <View key={log.id} style={{ flexDirection:'row', borderBottomWidth:1, borderColor:'#F1F5F9', paddingVertical:8, alignItems: 'center' }}>
                      <Text style={{ flex:1.5, fontSize:13, fontWeight: '600' }}>{log.name}</Text>
                      <Text style={{ flex:1.5, fontSize:13, color: '#475569' }}>{fmtPhone(log.phone)}</Text>
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:12, fontWeight: '700', color: log.status==='sent' ? '#16A34A':'#DC2626' }}>
                          {log.status === 'sent' ? '✓ Enviado' : '⚠ Falhou'}
                        </Text>
                      </View>
                      <Text style={{ flex:2, fontSize:11, color:'#94A3B8' }}>{log.wamid || log.error_msg}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderContacts = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View>
          <Text style={s.pageTitle}>Contatos</Text>
          <Text style={s.pageSubtitle}>Gerencie sua base de clientes ({contacts.length} total).</Text>
        </View>
        <View style={{ flexDirection:'row', gap:8 }}>
          <TouchableOpacity style={s.btnSecondary} onPress={handleImportLeads}><Download size={14} color="#475569" /><Text style={s.btnSecondaryTxt}>Leads do Site</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnSecondary} onPress={() => setShowPaste(!showPaste)}><Upload size={14} color="#475569" /><Text style={s.btnSecondaryTxt}>Colar</Text></TouchableOpacity>
          <TouchableOpacity style={s.btnPrimary} onPress={() => setShowCtcForm(true)}><Plus size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Novo Contato</Text></TouchableOpacity>
        </View>
      </View>

      {/* Paste Form */}
      {showPaste && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Colar Números</Text>
          <TextInput style={[s.input, { height:80 }]} multiline value={pasteText} onChangeText={setPasteText} placeholder="Nome - 5599999999" />
          <TouchableOpacity style={[s.btnPrimary, { marginTop:8, alignSelf:'flex-start' }]} onPress={handleImportPasted}><Text style={s.btnPrimaryTxt}>Importar</Text></TouchableOpacity>
        </View>
      )}

      {/* New Contact Form */}
      {showCtcForm && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Novo Contato</Text>
          <View style={{ flexDirection:'row', gap:10, marginBottom:10 }}>
            <TextInput style={[s.input, { flex:1 }]} placeholder="Nome" value={ctcForm.name} onChangeText={v => setCtcForm(f => ({...f, name:v}))} />
            <TextInput style={[s.input, { flex:1 }]} placeholder="Telefone (55...)" value={ctcForm.phone} onChangeText={v => setCtcForm(f => ({...f, phone:v}))} />
          </View>
          <View style={{ flexDirection:'row', gap:10 }}>
            <TextInput style={[s.input, { flex:1 }]} placeholder="Tags" value={ctcForm.tags} onChangeText={v => setCtcForm(f => ({...f, tags:v}))} />
            <TouchableOpacity style={s.btnPrimary} onPress={handleSaveContact}><Text style={s.btnPrimaryTxt}>Salvar</Text></TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setShowCtcForm(false)}><Text style={s.btnSecondaryTxt}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[s.card, { marginTop:16, padding:0 }]}>
        <View style={{ padding:16, borderBottomWidth:1, borderColor:'#E2E8F0', flexDirection:'row', alignItems:'center' }}>
          <Search size={16} color="#94A3B8" />
          <TextInput style={{ flex:1, marginLeft:8, outline:'none', fontSize:13 }} placeholder="Buscar contatos..." value={ctcSearch} onChangeText={v => { setCtcSearch(v); loadContacts(v); }} />
        </View>
        
        {selectedCtcs.size > 0 && (
          <View style={{ padding:12, backgroundColor:'#EFF6FF', flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontWeight:'700', color:'#0084FF' }}>{selectedCtcs.size} selecionados</Text>
            <TouchableOpacity style={s.btnPrimary} onPress={() => setActiveMenu('lists')}><Text style={s.btnPrimaryTxt}>Adicionar a Lista</Text></TouchableOpacity>
          </View>
        )}

        <ScrollView style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <View style={s.tableHead}>
            <View style={{ width:40, alignItems:'center' }}><Square size={14} color="#94A3B8" /></View>
            <Text style={[s.tableCell, { flex:2, fontWeight:'700' }]}>Nome</Text>
            <Text style={[s.tableCell, { flex:2, fontWeight:'700' }]}>Telefone</Text>
            <Text style={[s.tableCell, { flex:1.5, fontWeight:'700' }]}>Tags</Text>
            <Text style={[s.tableCell, { flex:1, fontWeight:'700' }]}>Origem</Text>
            <View style={{ width:40 }} />
          </View>
          {contacts.map(c => (
            <View key={c.id} style={s.tableRow}>
              <TouchableOpacity style={{ width:40, alignItems:'center' }} onPress={() => setSelectedCtcs(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}>
                {selectedCtcs.has(c.id) ? <CheckSquare size={15} color="#0084FF" /> : <Square size={15} color="#CBD5E1" />}
              </TouchableOpacity>
              <Text style={[s.tableCell, { flex:2 }]}>{c.name || '—'}</Text>
              <Text style={[s.tableCell, { flex:2 }]}>{fmtPhone(c.phone)}</Text>
              <Text style={[s.tableCell, { flex:1.5, color:'#64748B' }]}>{c.tags}</Text>
              <Text style={[s.tableCell, { flex:1, fontSize:11, color:'#94A3B8' }]}>{c.source}</Text>
              <TouchableOpacity style={{ width:40, alignItems:'center' }} onPress={() => handleDeleteContact(c.id)}>
                <Trash2 size={14} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderLists = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View>
          <Text style={s.pageTitle}>Listas de Audiência</Text>
          <Text style={s.pageSubtitle}>Agrupe contatos para usar em campanhas.</Text>
        </View>
        <TouchableOpacity style={s.btnPrimary} onPress={() => setShowListForm(true)}>
          <Plus size={15} color="#fff" /><Text style={s.btnPrimaryTxt}>Nova Lista</Text>
        </TouchableOpacity>
      </View>

      {showListForm && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Criar Lista</Text>
          <TextInput style={s.input} placeholder="Nome da Lista" value={listForm.name} onChangeText={v => setListForm(f => ({...f, name:v}))} />
          <View style={{ flexDirection:'row', gap:8, marginTop:8 }}>
            <TouchableOpacity style={s.btnPrimary} onPress={handleCreateList}><Text style={s.btnPrimaryTxt}>Salvar</Text></TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => setShowListForm(false)}><Text style={s.btnSecondaryTxt}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {selectedCtcs.size > 0 && (
        <View style={s.tipBox}>
          <Text style={{ fontWeight:'700', color:'#1D4ED8' }}>Você tem {selectedCtcs.size} contatos selecionados. Clique em "Adicionar Selecionados" em uma lista.</Text>
        </View>
      )}

      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:16, marginTop:20 }}>
        {lists.map(list => (
          <View key={list.id} style={[s.card, { flex:1, minWidth:280 }]}>
            <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
              <View>
                <Text style={{ fontSize:15, fontWeight:'800', color:'#0F172A' }}>{list.name}</Text>
                <Text style={{ fontSize:13, color:'#0084FF', fontWeight:'700', marginTop:4 }}>{list.contact_count} contatos</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteList(list.id)}><Trash2 size={16} color="#DC2626" /></TouchableOpacity>
            </View>
            <View style={{ flexDirection:'row', gap:8, marginTop:16 }}>
              <TouchableOpacity style={[s.btnSecondary, { flex:1, justifyContent:'center' }]} onPress={() => openListDetails(list)}>
                <Text style={s.btnSecondaryTxt}>Ver Contatos</Text>
              </TouchableOpacity>
              {selectedCtcs.size > 0 && (
                <TouchableOpacity style={[s.btnPrimary, { flex:1, justifyContent:'center' }]} onPress={() => handleAddSelectedToList(list.id)}>
                  <Text style={s.btnPrimaryTxt}>Adicionar Selecionados</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {openList?.id === list.id && (
              <View style={{ marginTop:16, borderTopWidth:1, borderColor:'#E2E8F0', paddingTop:12, maxHeight:200 }}>
                <ScrollView>
                  {listContacts.map(c => (
                    <View key={c.id} style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderColor:'#F8FAFC' }}>
                      <Text style={{ fontSize:12 }}>{c.name} - {fmtPhone(c.phone)}</Text>
                      <TouchableOpacity onPress={() => handleRemoveFromList(c.id)}><X size={14} color="#94A3B8" /></TouchableOpacity>
                    </View>
                  ))}
                  {listContacts.length === 0 && <Text style={{ fontSize:12, color:'#94A3B8' }}>Lista vazia.</Text>}
                </ScrollView>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderTemplates = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
        <View>
          <Text style={s.pageTitle}>Modelos Meta (HSM)</Text>
          <Text style={s.pageSubtitle}>Templates oficiais aprovados na sua conta do WhatsApp Business.</Text>
        </View>
        <TouchableOpacity style={s.btnSecondary} onPress={() => handleSyncTemplates()}>
          <RefreshCw size={14} color="#475569" /><Text style={s.btnSecondaryTxt}>Sincronizar Meta</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:16, marginTop:20 }}>
        {metaTemplates.map(t => (
          <View key={t.id} style={[s.card, { flex:1, minWidth:300 }]}>
            <View style={[s.flexBetween, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
              <Text style={{ fontSize:14, fontWeight:'800', color:'#0F172A' }}>{t.name}</Text>
              <Text style={{ fontSize:10, fontWeight:'700', color:'#16A34A', backgroundColor:'#DCFCE7', paddingHorizontal:6, borderRadius:4 }}>{t.meta_status}</Text>
            </View>
            <Text style={{ fontSize:11, color:'#64748B', marginBottom:12 }}>{t.category} • {t.language}</Text>
            <View style={{ backgroundColor:'#F8FAFC', padding:10, borderRadius:8, borderWidth:1, borderColor:'#E2E8F0' }}>
              <Text style={{ fontSize:12, color:'#334155', lineHeight:18 }}>{t.body_text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={[s.contentInner, isMobile && { padding: 16 }]}>
      <Text style={s.pageTitle}>Configurações da API</Text>
      <Text style={s.pageSubtitle}>Conecte sua conta do Facebook Developer.</Text>
      
      <View style={[s.card, { marginTop:20, maxWidth:600 }]}>
        <Text style={s.cardTitle}>Credenciais de Produção</Text>
        <View style={{ gap:12 }}>
          <View>
            <Text style={s.label}>WABA ID (WhatsApp Business Account ID)</Text>
            <TextInput style={s.input} value={wabaId} onChangeText={setWabaId} placeholder="Ex: 123456789" />
          </View>
          <View>
            <Text style={s.label}>Phone Number ID</Text>
            <TextInput style={s.input} value={phoneId} onChangeText={setPhoneId} placeholder="Ex: 987654321" />
          </View>
          <View>
            <Text style={s.label}>Token de Acesso (Permanente)</Text>
            <TextInput style={[s.input, { height:80 }]} multiline value={metaToken} onChangeText={setMetaToken} placeholder="EAAxxxxx..." secureTextEntry />
          </View>
          <TouchableOpacity style={[s.btnPrimary, { alignSelf:'flex-start' }]} onPress={handleSaveMeta}>
            <Check size={14} color="#fff" /><Text style={s.btnPrimaryTxt}>Salvar e Conectar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={[s.layout, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }]}>
        <View style={{ backgroundColor: '#fff', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <BrandLogo size="medium" />
          <Text style={{ fontSize: 24, fontWeight: '800', marginTop: 16, color: '#0F172A' }}>Acesso Restrito</Text>
          <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 24, textAlign: 'center' }}>Faça login com sua conta de administrador para acessar o CRM e Disparador.</Text>
          
          {loginError ? <View style={{backgroundColor:'#FEE2E2', padding:10, borderRadius:8, width:'100%', marginBottom:16}}><Text style={{ color: '#DC2626', textAlign:'center', fontWeight:'600' }}>{loginError}</Text></View> : null}
          
          <TextInput style={[s.input, { width: '100%' }]} placeholder="E-mail admin" value={emailInput} onChangeText={setEmailInput} autoCapitalize="none" />
          <TextInput style={[s.input, { width: '100%' }]} placeholder="Senha" secureTextEntry value={passwordInput} onChangeText={setPasswordInput} />
          
          <TouchableOpacity style={[s.btnPrimary, { width: '100%', justifyContent: 'center', marginTop: 8 }]} onPress={handleLogin}>
            <Text style={s.btnPrimaryTxt}>Entrar no CRM</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── MAIN LAYOUT ───────────────────────────────────────────────────────
  return (
    <View style={[s.layout, isMobile && { flexDirection: 'column' }]}>
      
      {/* SIDEBAR */}
      <View style={[s.sidebar, isMobile && { width: '100%', height: 'auto', flexDirection: 'column', paddingTop: 10, paddingBottom: 0 }]}>
        <View style={[isMobile && {flexDirection:'row', justifyContent:'space-between', paddingHorizontal: 16, alignItems:'center'}]}><TouchableOpacity style={[s.sidebarLogo, isMobile && {borderBottomWidth:0, paddingBottom:0, marginBottom:0}]} onPress={() => navigation.navigate('Admin')} activeOpacity={0.8}>
          <ArrowLeft size={16} color="#94A3B8" />
          <Text style={{ color:'#F8FAFC', fontWeight:'700', fontSize:14, marginLeft:6 }}>Voltar ao Admin</Text>
        </TouchableOpacity>

        {!isMobile && <View style={{ paddingHorizontal:12, marginBottom:16 }}>
          <Text style={{ color:'#64748B', fontSize:11, fontWeight:'700', letterSpacing:1, marginLeft:8 }}>CRM WHATSAPP</Text>
        </View>}
        {isMobile && <BrandLogo size="sm" />}</View>

        <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false} style={{ flex: isMobile ? 0 : 1, maxHeight: isMobile ? 50 : 'auto', minHeight: isMobile ? 50 : 'auto', marginVertical: isMobile ? 10 : 0 }}>
          {MENUS.map(m => (
            <TouchableOpacity key={m.id} style={[s.menuItem, activeMenu === m.id && s.menuItemActive]} onPress={() => setActiveMenu(m.id)}>
              <m.icon size={18} color={activeMenu === m.id ? '#38BDF8' : '#94A3B8'} />
              <Text style={[s.menuTxt, activeMenu === m.id && s.menuTxtActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {!isMobile && <View style={s.sidebarFooter}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <BrandLogo size="sm" />
          </View>
          <View style={[s.statusBadge, { backgroundColor: hasMetaApi ? '#064E3B' : '#7F1D1D', marginTop:12, alignSelf:'flex-start' }]}>
            <Text style={{ color: hasMetaApi ? '#34D399' : '#FCA5A5', fontSize:10, fontWeight:'700' }}>
              {hasMetaApi ? 'API CONECTADA' : 'API DESCONECTADA'}
            </Text>
          </View>
        </View>}
      </View>

      {/* CONTENT AREA */}
      <View style={s.content}>
        <ScrollView style={{ flex:1 }}>
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'campaigns' && renderCampaigns()}
          {activeMenu === 'contacts'  && renderContacts()}
          {activeMenu === 'lists'     && renderLists()}
          {activeMenu === 'templates' && renderTemplates()}
          {activeMenu === 'costs'     && renderCosts()}
          {activeMenu === 'settings'  && renderSettings()}
        </ScrollView>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  layout: { flex:1, flexDirection:'row', backgroundColor:'#F8FAFC', height:'100vh' },
  
  // Sidebar
  sidebar: { width:250, backgroundColor:'#0F172A', paddingTop:24, borderRightWidth:1, borderColor:'#1E293B', display:'flex' },
  sidebarLogo: { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingBottom:24, borderBottomWidth:1, borderColor:'#1E293B', marginBottom:16 },
  menuItem: { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:10, paddingHorizontal:20, marginHorizontal:8, borderRadius:8, marginBottom:4 },
  menuItemActive: { backgroundColor:'#1E293B' },
  menuTxt: { color:'#94A3B8', fontSize:14, fontWeight:'600' },
  menuTxtActive: { color:'#F8FAFC', fontWeight:'700' },
  sidebarFooter: { padding:20, borderTopWidth:1, borderColor:'#1E293B' },
  
  // Content Base
  content: { flex:1 },
  contentInner: { padding:32, maxWidth:1200, width:'100%', alignSelf:'center' },
  pageTitle: { fontSize:24, fontWeight:'800', color:'#0F172A' },
  pageSubtitle: { fontSize:14, color:'#64748B', marginTop:4 },
  sectionTitle: { fontSize:16, fontWeight:'800', color:'#0F172A' },
  flexBetween: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20 },

  // Dashboard Cards
  dashGrid: { flexDirection:'row', flexWrap:'wrap', gap:16, marginTop:24 },
  statCard: { flex:1, minWidth:200, backgroundColor:'#fff', padding:20, borderRadius:12, borderWidth:1, borderColor:'#E2E8F0' },
  statIconBox: { width:40, height:40, borderRadius:8, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center', marginBottom:12 },
  statLabel: { fontSize:13, color:'#64748B', fontWeight:'600' },
  statValue: { fontSize:28, color:'#0F172A', fontWeight:'800', marginTop:4 },
  
  // Recent List
  recentList: { backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#E2E8F0', overflow:'hidden' },
  recentItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderColor:'#F1F5F9' },
  statusBadge: { paddingHorizontal:8, paddingVertical:4, borderRadius:6, alignSelf:'flex-start' },
  statusTxt: { fontSize:11, fontWeight:'800' },

  // Components
  card: { backgroundColor:'#fff', borderRadius:12, padding:20, borderWidth:1, borderColor:'#E2E8F0' },
  cardTitle: { fontSize:16, fontWeight:'800', color:'#0F172A', marginBottom:16 },
  label: { fontSize:12, fontWeight:'700', color:'#334155', marginBottom:6, marginTop:12 },
  input: { backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#E2E8F0', borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:13, color:'#0F172A', marginBottom:12 },
  
  chip: { paddingHorizontal:12, paddingVertical:6, borderRadius:6, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  chipActive: { backgroundColor:'#0084FF', borderColor:'#0084FF' },
  chipTxt: { fontSize:12, fontWeight:'600', color:'#475569' },
  chipTxtActive: { color:'#fff', fontWeight:'700' },

  btnPrimary: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#0084FF', paddingHorizontal:16, paddingVertical:10, borderRadius:8 },
  btnPrimaryTxt: { color:'#fff', fontSize:13, fontWeight:'700' },
  btnSecondary: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:14, paddingVertical:9, borderRadius:8, backgroundColor:'#fff', borderWidth:1, borderColor:'#CBD5E1' },
  btnSecondaryTxt: { fontSize:13, fontWeight:'600', color:'#475569' },
  btnLaunch: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#16A34A', paddingHorizontal:14, paddingVertical:8, borderRadius:6 },

  // Table
  table: { backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#E2E8F0', overflow:'hidden' },
  tableHead: { flexDirection:'row', backgroundColor:'#F8FAFC', borderBottomWidth:1, borderColor:'#E2E8F0', paddingVertical:12, paddingHorizontal:16 },
  tableRow: { flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:16, borderBottomWidth:1, borderColor:'#F8FAFC' },
  tableCell: { fontSize:13, color:'#334155' },

  tipBox: { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#EFF6FF', padding:16, borderRadius:12, borderWidth:1, borderColor:'#BFDBFE', marginTop:16 },
});
