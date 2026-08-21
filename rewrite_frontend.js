const fs = require('fs');
let code = fs.readFileSync('src/pages/BulkMessage.web.js', 'utf8');

// Add import
if (!code.includes('useAdminConfig')) {
  code = code.replace(
    "import { fetchAllEvents } from '../utils/api';",
    "import { fetchAllEvents } from '../utils/api';\nimport { useAdminConfig } from '../context/AdminConfigContext';"
  );
}

// Add state
const hookStart = 'export default function BulkMessage() {\n';
if (!code.includes('const { isAuthenticated, login }')) {
  code = code.replace(
    hookStart,
    hookStart + `
  const { isAuthenticated, login } = useAdminConfig();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    const success = await login(emailInput, passwordInput);
    if (!success) setLoginError('Credenciais inválidas.');
  };
`
  );
}

// Add return
const returnStart = '  // ─── MAIN LAYOUT ───────────────────────────────────────────────────────\n  return (';
if (!code.includes('if (!isAuthenticated)')) {
  code = code.replace(
    returnStart,
    `  if (!isAuthenticated) {
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

` + returnStart
  );
}

// Rewrite campaigns render
const renderCampaignsOld = code.match(/const renderCampaigns = \(\) => \([\s\S]*?    <\/View>\n  \);\n/)[0];

const renderCampaignsNew = `const renderCampaigns = () => (
    <View style={s.contentInner}>
      <View style={s.flexBetween}>
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
          <View style={s.flexBetween}>
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
              <View style={s.flexBetween}>
                <View>
                  <View style={{ flexDirection:'row', gap:8, alignItems:'center', marginBottom:4 }}>
                    <Text style={{ fontSize:15, fontWeight:'800', color:'#0F172A' }}>{camp.name}</Text>
                    <View style={[s.statusBadge, { backgroundColor: st.bg }]}><Text style={[s.statusTxt, { color: st.text }]}>{st.label}</Text></View>
                  </View>
                  <Text style={{ fontSize:13, color:'#64748B', marginBottom:8, fontWeight:'500' }}>
                    👥 Público: {list?.name || 'Sem lista'}   |   💬 Mensagem: {camp.template_name}   |   📅 {fmtDate(camp.created_at)}
                  </Text>
                  {camp.status === 'done' && (
                     <Text style={{ fontSize:13, color:'#16A34A', fontWeight:'700', marginTop: 4 }}>✓ {camp.sent_count} envios confirmados. {camp.error_count > 0 ? \`(\${camp.error_count} erros)\` : ''}</Text>
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
`;

code = code.replace(renderCampaignsOld, renderCampaignsNew);

fs.writeFileSync('src/pages/BulkMessage.web.js', code);
console.log('Script aplicado.');
