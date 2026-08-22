const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/api/uploads', express.static(uploadsDir));

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const PORT = process.env.PORT || 3001;

// Endpoint de upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  const imageUrl = `/api/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// ─── ANALYTICS & MÉTRICAS ─────────────────────────────────────────────────────

// Rastrear eventos do site (Pageviews, Acessos aos Eventos, Buscas, Reconhecimento Facial)
app.post('/api/analytics/track', async (req, res) => {
  try {
    const { event_type, event_id, event_name, search_query, metadata } = req.body;
    if (!event_type) {
      return res.status(400).json({ error: 'event_type é obrigatório' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    await db.query(`
      INSERT INTO site_analytics (event_type, event_id, event_name, search_query, user_ip, user_agent, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      event_type,
      event_id || null,
      event_name || null,
      search_query || null,
      ip,
      userAgent,
      metadata ? JSON.stringify(metadata) : '{}'
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao salvar métrica:', err);
    res.status(500).json({ error: 'Erro ao registrar métrica' });
  }
});

// Obter resumo das métricas para o Painel Admin
app.get('/api/analytics/summary', async (req, res) => {
  try {
    // 1. Totais Gerais
    const totalsQuery = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view') as total_page_views,
        COUNT(*) FILTER (WHERE event_type = 'event_view') as total_event_views,
        COUNT(*) FILTER (WHERE event_type = 'face_search') as total_face_searches,
        COUNT(*) FILTER (WHERE event_type = 'search') as total_searches,
        COUNT(DISTINCT user_ip) as unique_visitors
      FROM site_analytics;
    `);
    const totals = totalsQuery.rows[0] || {};

    // 2. Métricas detalhadas por Evento (Acessos e Reconhecimento Facial por Evento)
    const eventsQuery = await db.query(`
      SELECT 
        event_id,
        MAX(event_name) as event_name,
        COUNT(*) FILTER (WHERE event_type = 'event_view') as views_count,
        COUNT(*) FILTER (WHERE event_type = 'face_search') as face_searches_count,
        MAX(created_at) as last_accessed
      FROM site_analytics
      WHERE event_id IS NOT NULL AND event_id != ''
      GROUP BY event_id
      ORDER BY views_count DESC, face_searches_count DESC
      LIMIT 100;
    `);

    // 3. Quem procurou / Termos mais buscados
    const searchesQuery = await db.query(`
      SELECT 
        search_query,
        COUNT(*) as count,
        MAX(created_at) as last_searched
      FROM site_analytics
      WHERE event_type = 'search' AND search_query IS NOT NULL AND search_query != ''
      GROUP BY search_query
      ORDER BY count DESC, last_searched DESC
      LIMIT 50;
    `);

    // 4. Últimas 50 Atividades
    const activityQuery = await db.query(`
      SELECT 
        id,
        event_type,
        event_id,
        event_name,
        search_query,
        user_ip,
        created_at
      FROM site_analytics
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    res.json({
      totals: {
        pageViews: parseInt(totals.total_page_views || 0, 10),
        eventViews: parseInt(totals.total_event_views || 0, 10),
        faceSearches: parseInt(totals.total_face_searches || 0, 10),
        searches: parseInt(totals.total_searches || 0, 10),
        uniqueVisitors: parseInt(totals.unique_visitors || 0, 10),
      },
      eventsMetrics: eventsQuery.rows.map(r => ({
        eventId: r.event_id,
        eventName: r.event_name || 'Evento sem título',
        viewsCount: parseInt(r.views_count || 0, 10),
        faceSearchesCount: parseInt(r.face_searches_count || 0, 10),
        lastAccessed: r.last_accessed,
      })),
      recentSearches: searchesQuery.rows.map(r => ({
        query: r.search_query,
        count: parseInt(r.count || 0, 10),
        lastSearched: r.last_searched,
      })),
      recentActivity: activityQuery.rows,
    });
  } catch (err) {
    console.error('Erro ao buscar métricas:', err);
    res.status(500).json({ error: 'Erro ao consolidar métricas' });
  }
});



// ─── META WHATSAPP CLOUD API (PADRÃO OFICIAL META / BUSINESS MANAGER) ────────

// Obter configurações da Meta API
app.get('/api/meta/config', async (req, res) => {
  try {
    const result = await db.query('SELECT phone_number_id, waba_id, api_version, (access_token IS NOT NULL AND LENGTH(access_token) > 5) AS has_token FROM meta_api_config WHERE id = 1');
    res.json({ config: result.rows[0] || {} });
  } catch (err) {
    console.error('Erro ao buscar config Meta:', err);
    res.status(500).json({ error: 'Erro ao buscar configuração Meta' });
  }
});


// Função auxiliar para sincronizar templates direto da Meta Graph API
async function syncTemplatesFromMeta(wabaId, accessToken, apiVersion = 'v20.0') {
  if (!wabaId || !accessToken) {
    throw new Error('WABA ID e Access Token são obrigatórios para sincronizar.');
  }

  const metaUrl = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?limit=100`;
  const response = await fetch(metaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  const data = await response.json();
  if (!response.ok || !data.data) {
    throw new Error(data.error?.message || 'Erro ao consultar templates na Meta');
  }

  const savedTemplates = [];

  for (const item of data.data) {
    const name = item.name;
    const category = item.category || 'MARKETING';
    const language = item.language || 'pt_BR';
    const metaStatus = item.status || 'APPROVED';

    let headerType = 'NONE';
    let headerContent = '';
    let bodyText = '';
    let footerText = '';
    let buttons = [];

    (item.components || []).forEach((comp) => {
      if (comp.type === 'HEADER') {
        headerType = comp.format || 'TEXT';
        headerContent = comp.text || '';
      } else if (comp.type === 'BODY') {
        bodyText = comp.text || '';
      } else if (comp.type === 'FOOTER') {
        footerText = comp.text || '';
      } else if (comp.type === 'BUTTONS') {
        buttons = comp.buttons || [];
      }
    });

    if (bodyText) {
      // Upsert template
      const res = await db.query(`
        INSERT INTO meta_templates (name, category, language, header_type, header_content, body_text, footer_text, buttons, meta_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
        RETURNING *;
      `, [name, category, language, headerType, headerContent, bodyText, footerText, JSON.stringify(buttons), metaStatus]);

      if (res.rows[0]) savedTemplates.push(res.rows[0]);
    }
  }

  return { total: data.data.length, synced: savedTemplates.length };
}

// Endpoint de Sincronização Manual de Templates da Meta
app.post('/api/meta/sync-templates', async (req, res) => {
  try {
    const configRes = await db.query('SELECT * FROM meta_api_config WHERE id = 1');
    const metaConfig = configRes.rows[0];

    const wabaId = req.body.waba_id || metaConfig?.waba_id;
    const accessToken = req.body.access_token || metaConfig?.access_token;
    const apiVersion = req.body.api_version || metaConfig?.api_version || 'v20.0';

    if (!wabaId || !accessToken) {
      return res.status(400).json({ error: 'WABA ID e Access Token não configurados.' });
    }

    const result = await syncTemplatesFromMeta(wabaId, accessToken, apiVersion);
    const templatesRes = await db.query('SELECT * FROM meta_templates ORDER BY id ASC');

    res.json({
      success: true,
      message: `${result.total} modelos encontrados na Meta e sincronizados com sucesso!`,
      templates: templatesRes.rows,
    });
  } catch (err) {
    console.error('Erro na sincronização Meta:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar modelos da Meta' });
  }
});

// Salvar configurações da Meta API
app.post('/api/meta/config', async (req, res) => {
  try {
    const { phone_number_id, waba_id, access_token, api_version } = req.body;
    
    let isFakeToken = (access_token === 'TOKEN_SALVO_NO_BANCO_DE_DADOS' || access_token === '********************************');
    
    if (access_token && !isFakeToken) {
      await db.query(`
        INSERT INTO meta_api_config (id, phone_number_id, waba_id, access_token, api_version, updated_at)
        VALUES (1, $1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          phone_number_id = EXCLUDED.phone_number_id,
          waba_id = EXCLUDED.waba_id,
          access_token = EXCLUDED.access_token,
          api_version = EXCLUDED.api_version,
          updated_at = NOW()
      `, [phone_number_id || '', waba_id || '', access_token, api_version || 'v20.0']);
    } else {
      await db.query(`
        INSERT INTO meta_api_config (id, phone_number_id, waba_id, api_version, updated_at)
        VALUES (1, $1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET
          phone_number_id = EXCLUDED.phone_number_id,
          waba_id = EXCLUDED.waba_id,
          api_version = EXCLUDED.api_version,
          updated_at = NOW()
      `, [phone_number_id || '', waba_id || '', api_version || 'v20.0']);
    }

    // Puxa o token real do banco caso tenha recebido o fake
    let realTokenToUse = access_token;
    if (!realTokenToUse || isFakeToken) {
       const dbRes = await db.query('SELECT access_token FROM meta_api_config WHERE id = 1');
       realTokenToUse = dbRes.rows[0]?.access_token;
    }

    // Tenta sincronizar automaticamente após salvar
    let syncInfo = '';
    if (waba_id && realTokenToUse) {
      try {
        const syncRes = await syncTemplatesFromMeta(waba_id, realTokenToUse, api_version || 'v20.0');
        syncInfo = ` Sincronizados ${syncRes.total} modelos da Meta!`;
      } catch (sErr) {
        console.warn('Auto-sync aviso:', sErr.message);
      }
    }
    res.json({ success: true, message: `Configurações da Meta API salvas com sucesso!${syncInfo}` });
  } catch (err) {
    console.error('Erro ao salvar config Meta:', err);
    res.status(500).json({ error: 'Erro ao salvar configurações Meta' });
  }
});

// Listar Templates Padrão Meta
app.get('/api/meta/templates', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM meta_templates ORDER BY id ASC');
    res.json({ templates: result.rows });
  } catch (err) {
    console.error('Erro ao listar templates Meta:', err);
    res.status(500).json({ error: 'Erro ao listar templates' });
  }
});

// Criar / Salvar Template Meta
app.post('/api/meta/templates', async (req, res) => {
  try {
    const { name, category, language, header_type, header_content, body_text, footer_text, buttons } = req.body;
    const cleanName = String(name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const result = await db.query(`
      INSERT INTO meta_templates (name, category, language, header_type, header_content, body_text, footer_text, buttons, meta_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'APPROVED')
      RETURNING *;
    `, [cleanName, category || 'MARKETING', language || 'pt_BR', header_type || 'NONE', header_content || '', body_text, footer_text || '', JSON.stringify(buttons || [])]);

    res.json({ success: true, template: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar template Meta:', err);
    res.status(500).json({ error: 'Erro ao criar template Meta' });
  }
});

// Disparo em Massa Oficial via Meta WhatsApp Cloud API
app.post('/api/meta/send-template-broadcast', async (req, res) => {
  try {
    const { recipients, template_name, language_code, event_id, campaign_title } = req.body;

    const configRes = await db.query('SELECT * FROM meta_api_config WHERE id = 1');
    const metaConfig = configRes.rows[0];

    const phoneNumberId = metaConfig?.phone_number_id;
    const accessToken = metaConfig?.access_token;
    const apiVersion = metaConfig?.api_version || 'v20.0';

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        error: 'Credenciais da Meta API não configuradas. Insira seu Phone Number ID e Access Token.',
      });
    }

    const results = [];
    let sentSuccess = 0;
    let sentErrors = 0;

    for (const rec of recipients) {
      let rawPhone = String(rec.phone || '').replace(/\D/g, '');
      if (rawPhone.length === 10 || rawPhone.length === 11) {
        rawPhone = `55${rawPhone}`;
      }

      try {
        const metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
        
        const templateComponents = [];

        // Header Imagem se presente
        if (rec.headerImage) {
          templateComponents.push({
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: rec.headerImage },
              },
            ],
          });
        }

        // Body Parameters ({{1}}, {{2}}, {{3}})
        if (rec.bodyParams && Array.isArray(rec.bodyParams) && rec.bodyParams.length > 0) {
          templateComponents.push({
            type: 'body',
            parameters: rec.bodyParams.map((p) => ({
              type: 'text',
              text: String(p || ''),
            })),
          });
        }

        const metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: rawPhone,
          type: 'template',
          template: {
            name: template_name || 'fotos_evento_publicadas',
            language: { code: language_code || 'pt_BR' },
            components: templateComponents.length > 0 ? templateComponents : undefined,
          },
        };

        const metaRes = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        });

        const metaData = await metaRes.json();

        if (metaRes.ok && metaData.messages?.[0]?.id) {
          sentSuccess++;
          results.push({ phone: rawPhone, status: 'sent', wamid: metaData.messages[0].id });
        } else {
          sentErrors++;
          results.push({ phone: rawPhone, status: 'error', error: metaData.error?.message || 'Erro Meta API' });
        }
      } catch (err) {
        sentErrors++;
        results.push({ phone: rawPhone, status: 'error', error: err.message });
      }
    }

    // Salva registro da campanha
    await db.query(`
      INSERT INTO broadcast_campaigns (title, message_template, event_id, total_recipients, sent_count, status)
      VALUES ($1, $2, $3, $4, $5, 'completed')
    `, [campaign_title || 'Disparo Oficial Meta', template_name, event_id || null, recipients.length, sentSuccess]);

    res.json({
      success: true,
      sentSuccess,
      sentErrors,
      results,
    });
  } catch (err) {
    console.error('Erro no broadcast Meta:', err);
    res.status(500).json({ error: 'Erro ao processar disparo Meta: ' + err.message });
  }
});

// ─── LEADS WHATSAPP (CAPTURADOS NA HOME) ──────────────────────────────────────

// Cadastrar novo WhatsApp
app.post('/api/leads/whatsapp', async (req, res) => {
  try {
    const { whatsapp, name, source } = req.body;
    if (!whatsapp || !whatsapp.trim()) {
      return res.status(400).json({ error: 'WhatsApp é obrigatório' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    await db.query(`
      INSERT INTO whatsapp_leads (whatsapp, name, source, ip)
      VALUES ($1, $2, $3, $4)
    `, [whatsapp.trim(), name ? name.trim() : null, source || 'home_newsletter', ip]);

    res.json({ success: true, message: 'WhatsApp cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar lead de whatsapp:', err);
    res.status(500).json({ error: 'Erro ao cadastrar WhatsApp' });
  }
});

// Listar todos os leads de WhatsApp
app.get('/api/leads/whatsapp', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM whatsapp_leads ORDER BY created_at DESC');
    res.json({ leads: result.rows });
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ error: 'Erro ao listar contatos' });
  }
});

// Excluir lead
app.delete('/api/leads/whatsapp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM whatsapp_leads WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    res.status(500).json({ error: 'Erro ao excluir contato' });
  }
});


// ─── DISPARADOR EM MASSA & CAMPANHAS WHATSAPP ────────────────────────────────

// Salvar campanha de disparo realizada
app.post('/api/broadcast/save-campaign', async (req, res) => {
  try {
    const { title, message_template, event_id, total_recipients, sent_count, logs } = req.body;

    const result = await db.query(`
      INSERT INTO broadcast_campaigns (title, message_template, event_id, total_recipients, sent_count, status)
      VALUES ($1, $2, $3, $4, $5, 'completed')
      RETURNING id;
    `, [title || 'Disparo Rápido', message_template, event_id || null, total_recipients || 0, sent_count || 0]);

    const campaignId = result.rows[0]?.id;

    if (logs && Array.isArray(logs) && campaignId) {
      for (const log of logs) {
        await db.query(`
          INSERT INTO broadcast_logs (campaign_id, phone, name, status)
          VALUES ($1, $2, $3, $4)
        `, [campaignId, log.phone, log.name || null, log.status || 'sent']);
      }
    }

    res.json({ success: true, campaignId });
  } catch (err) {
    console.error('Erro ao salvar campanha de disparo:', err);
    res.status(500).json({ error: 'Erro ao registrar campanha' });
  }
});

// Listar campanhas anteriores
app.get('/api/broadcast/campaigns', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM broadcast_campaigns ORDER BY created_at DESC LIMIT 30');
    res.json({ campaigns: result.rows });
  } catch (err) {
    console.error('Erro ao listar campanhas:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de campanhas' });
  }
});

// ─── SITEMAP & ROBOTS PARA O GOOGLE ──────────────────────────────────────────

const generateSitemapXml = async () => {
  const baseUrl = 'https://rafaelpublicado.com.br';
  let eventUrls = [];

  try {
    // Busca eventos públicos da API TopFotos
    const apiRes = await fetch('https://painel.topfotos.com.br/api/event/list?photographer=aa12f6ec-5d65-4fa7-a435-5da6155be6a0');
    if (apiRes.ok) {
      const data = await apiRes.json();
      const events = Array.isArray(data) ? data : data.results || [];
      eventUrls = events.map(ev => {
        const lastMod = ev.updated_at || ev.created_at || new Date().toISOString();
        const cleanDate = lastMod.split('T')[0];
        return `  <url>
    <loc>${baseUrl}/event/${encodeURIComponent(ev.id || ev.slug)}</loc>
    <lastmod>${cleanDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      });
    }
  } catch (e) {
    console.warn('Erro ao buscar eventos para sitemap:', e);
  }

  const today = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/#como-funciona</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/#galerias-destaque</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${eventUrls.join('\n')}
</urlset>`;
};

app.get(['/sitemap.xml', '/api/sitemap.xml'], async (req, res) => {
  try {
    const xml = await generateSitemapXml();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao gerar sitemap');
  }
});

app.get(['/robots.txt', '/api/robots.txt'], (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout

Sitemap: https://rafaelpublicado.com.br/sitemap.xml
`);
});

// ─── CONFIGURAÇÕES & REGRAS ───────────────────────────────────────────────────

// Obter configurações gerais
app.get('/api/config', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM site_configs WHERE id = 'default'");
    let config = result.rows[0];
    
    // Buscar fotógrafos também para anexar à config
    const photogResult = await db.query("SELECT * FROM photographers ORDER BY created_at ASC");
    const photographers = photogResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      avatar: p.avatar_url,
      profileUrl: p.profile_url,
      isPrimary: p.is_primary,
      active: p.is_active
    }));

    if (!config) {
      return res.json({ photographers });
    }

    res.json({
      branding: config.branding,
      theme: config.theme,
      banners: config.banners,
      howItWorks: config.how_it_works,
      eventsConfig: config.events_config,
      photographers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações gerais
app.post('/api/config', async (req, res) => {
  try {
    const { branding, theme, banners, howItWorks, eventsConfig, photographers } = req.body;
    
    await db.query(`
      INSERT INTO site_configs (id, branding, theme, banners, how_it_works, events_config)
      VALUES ('default', $1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        branding = EXCLUDED.branding,
        theme = EXCLUDED.theme,
        banners = EXCLUDED.banners,
        how_it_works = EXCLUDED.how_it_works,
        events_config = EXCLUDED.events_config,
        updated_at = CURRENT_TIMESTAMP
    `, [branding, theme, banners, howItWorks, eventsConfig]);

    if (photographers && Array.isArray(photographers)) {
      for (const p of photographers) {
        await db.query(`
          INSERT INTO photographers (id, name, slug, avatar_url, profile_url, is_primary, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            avatar_url = EXCLUDED.avatar_url,
            profile_url = EXCLUDED.profile_url,
            is_primary = EXCLUDED.is_primary,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP
        `, [p.id, p.name, p.slug, p.avatar, p.profileUrl, p.isPrimary, p.active]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Obter regras de eventos
app.get('/api/events/rules', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM event_photographer_settings");
    const rules = {};
    result.rows.forEach(r => {
      if (!rules[r.event_id]) rules[r.event_id] = {};
      rules[r.event_id][r.photographer_id] = {
        isHidden: r.is_hidden,
        order: r.display_order
      };
    });
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar regras de eventos' });
  }
});

// Atualizar regra específica de um fotógrafo em um evento
app.post('/api/events/rules', async (req, res) => {
  try {
    const { eventId, photographerId, ruleUpdate } = req.body;
    
    const current = await db.query(
      "SELECT is_hidden, display_order FROM event_photographer_settings WHERE event_id = $1 AND photographer_id = $2",
      [eventId, photographerId]
    );
    
    let isHidden = false;
    let order = 1;
    if (current.rows.length > 0) {
      isHidden = current.rows[0].is_hidden;
      order = current.rows[0].display_order;
    }
    
    if (ruleUpdate.isHidden !== undefined) isHidden = ruleUpdate.isHidden;
    if (ruleUpdate.order !== undefined) order = ruleUpdate.order;

    await db.query(`
      INSERT INTO event_photographer_settings (event_id, photographer_id, is_hidden, display_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ON CONSTRAINT uq_event_photographer DO UPDATE SET
        is_hidden = EXCLUDED.is_hidden,
        display_order = EXCLUDED.display_order,
        updated_at = CURRENT_TIMESTAMP
    `, [eventId, photographerId, isHidden, order]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar regra' });
  }
});

app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});

// ─── CRM: INICIALIZAR TABELAS ────────────────────────────────────────────────
async function initCRMTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT NOT NULL,
      tags TEXT,
      source TEXT DEFAULT 'manual',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(phone)
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_lists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_list_contacts (
      list_id INT REFERENCES crm_lists(id) ON DELETE CASCADE,
      contact_id INT REFERENCES crm_contacts(id) ON DELETE CASCADE,
      PRIMARY KEY (list_id, contact_id)
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      list_id INT REFERENCES crm_lists(id),
      template_name TEXT,
      template_language TEXT DEFAULT 'pt_BR',
      event_id TEXT,
      status TEXT DEFAULT 'draft',
      sent_count INT DEFAULT 0,
      error_count INT DEFAULT 0,
      total INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      sent_at TIMESTAMP
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_campaign_logs (
      id SERIAL PRIMARY KEY,
      campaign_id INT REFERENCES crm_campaigns(id) ON DELETE CASCADE,
      contact_id INT,
      phone TEXT,
      name TEXT,
      status TEXT,
      error_msg TEXT,
      wamid TEXT,
      sent_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('CRM tables initialized');
}
initCRMTables().catch(console.error);

// ─── CRM: CONTATOS ────────────────────────────────────────────────────────────
app.get('/api/crm/contacts', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM crm_contacts';
    let params = [];
    if (search) { query += ' WHERE name ILIKE $1 OR phone ILIKE $1'; params = [`%${search}%`]; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json({ contacts: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/contacts', async (req, res) => {
  try {
    const { name, phone, tags, notes, source } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanPhone) return res.status(400).json({ error: 'Telefone inválido' });
    const result = await db.query(
      `INSERT INTO crm_contacts (name, phone, tags, notes, source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, tags = EXCLUDED.tags, notes = EXCLUDED.notes
       RETURNING *`,
      [name || '', cleanPhone, tags || '', notes || '', source || 'manual']
    );
    res.json({ contact: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/contacts/import', async (req, res) => {
  try {
    const { contacts, source } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) return res.status(400).json({ error: 'Lista vazia' });
    let imported = 0, skipped = 0;
    for (const c of contacts) {
      const p = String(c.phone || '').replace(/\D/g, '');
      if (!p || p.length < 8) { skipped++; continue; }
      await db.query(
        `INSERT INTO crm_contacts (name, phone, tags, source) VALUES ($1, $2, $3, $4)
         ON CONFLICT (phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, crm_contacts.name)`,
        [c.name || '', p, c.tags || '', source || 'import']
      );
      imported++;
    }
    res.json({ success: true, imported, skipped });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/contacts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM crm_contacts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CRM: LISTAS ─────────────────────────────────────────────────────────────
app.get('/api/crm/lists', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, COUNT(lc.contact_id)::int AS contact_count
      FROM crm_lists l
      LEFT JOIN crm_list_contacts lc ON lc.list_id = l.id
      GROUP BY l.id ORDER BY l.created_at DESC
    `);
    res.json({ lists: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/lists', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
    const result = await db.query(
      'INSERT INTO crm_lists (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.json({ list: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/lists/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM crm_lists WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crm/lists/:id/contacts', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.* FROM crm_contacts c
      INNER JOIN crm_list_contacts lc ON lc.contact_id = c.id
      WHERE lc.list_id = $1 ORDER BY c.name ASC
    `, [req.params.id]);
    res.json({ contacts: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/lists/:id/contacts', async (req, res) => {
  try {
    const { contact_ids } = req.body;
    if (!Array.isArray(contact_ids)) return res.status(400).json({ error: 'contact_ids obrigatório' });
    for (const cid of contact_ids) {
      await db.query(
        'INSERT INTO crm_list_contacts (list_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, cid]
      );
    }
    res.json({ success: true, added: contact_ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/lists/:listId/contacts/:contactId', async (req, res) => {
  try {
    await db.query('DELETE FROM crm_list_contacts WHERE list_id = $1 AND contact_id = $2',
      [req.params.listId, req.params.contactId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CRM: CAMPANHAS ──────────────────────────────────────────────────────────
app.get('/api/crm/campaigns', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, l.name AS list_name
      FROM crm_campaigns c
      LEFT JOIN crm_lists l ON l.id = c.list_id
      ORDER BY c.created_at DESC
    `);
    res.json({ campaigns: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/campaigns', async (req, res) => {
  try {
    const { name, list_id, template_name, template_language, event_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
    const result = await db.query(
      `INSERT INTO crm_campaigns (name, list_id, template_name, template_language, event_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
      [name, list_id || null, template_name || '', template_language || 'pt_BR', event_id || null]
    );
    res.json({ campaign: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/crm/campaigns/:id', async (req, res) => {
  try {
    const { name, list_id, template_name, template_language, event_id } = req.body;
    const result = await db.query(
      `UPDATE crm_campaigns SET name=$1, list_id=$2, template_name=$3, template_language=$4, event_id=$5
       WHERE id=$6 RETURNING *`,
      [name, list_id || null, template_name || '', template_language || 'pt_BR', event_id || null, req.params.id]
    );
    res.json({ campaign: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/crm/campaigns/:id', async (req, res) => {
  try {
    const camp = await db.query('SELECT * FROM crm_campaigns WHERE id = $1', [req.params.id]);
    if (!camp.rows[0]) return res.status(404).json({ error: 'Não encontrada' });
    const logs = await db.query(
      'SELECT * FROM crm_campaign_logs WHERE campaign_id = $1 ORDER BY sent_at DESC',
      [req.params.id]
    );
    res.json({ campaign: camp.rows[0], logs: logs.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/crm/campaigns/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM crm_campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/crm/campaigns/:id/launch', async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campRes = await db.query('SELECT * FROM crm_campaigns WHERE id = $1', [campaignId]);
    const campaign = campRes.rows[0];
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'running') return res.status(400).json({ error: 'Campanha já rodando' });

    const metaRes = await db.query('SELECT * FROM meta_api_config WHERE id = 1');
    const metaConfig = metaRes.rows[0];
    if (!metaConfig?.phone_number_id || !metaConfig?.access_token)
      return res.status(400).json({ error: 'Credenciais Meta não configuradas' });

    let contacts = [];
    if (campaign.list_id) {
      const cRes = await db.query(`
        SELECT c.* FROM crm_contacts c
        INNER JOIN crm_list_contacts lc ON lc.contact_id = c.id
        WHERE lc.list_id = $1
      `, [campaign.list_id]);
      contacts = cRes.rows;
    }
    if (contacts.length === 0) return res.status(400).json({ error: 'Lista sem contatos' });

    const effectiveEventId = campaign.event_id || '';
    let eventName = 'Evento';
    let eventLink = 'https://rafaelpublicado.com.br';
    if (effectiveEventId) {
      try {
        const evRes = await fetch(`https://painel.topfotos.com.br/api/event/retrieve?event_id=${effectiveEventId}`);
        if (evRes.ok) { const evData = await evRes.json(); if (evData.name) eventName = evData.name; }
      } catch {}
      eventLink = `https://rafaelpublicado.com.br/evento/${effectiveEventId}`;
    }

    await db.query("UPDATE crm_campaigns SET status = 'running' WHERE id = $1", [campaignId]);

    const apiVersion = metaConfig.api_version || 'v20.0';
    const metaUrl = `https://graph.facebook.com/${apiVersion}/${metaConfig.phone_number_id}/messages`;
    let sentCount = 0, errorCount = 0;

    for (const contact of contacts) {
      let phone = String(contact.phone || '').replace(/\D/g, '');
      if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;

      const metaPayload = {
        messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template',
        template: {
          name: campaign.template_name,
          language: { code: campaign.template_language || 'pt_BR' },
          components: [{ type: 'body', parameters: [
            { type: 'text', text: contact.name || 'Cliente' },
            { type: 'text', text: eventName },
            { type: 'text', text: eventLink },
          ]}],
        },
      };

      try {
        const mRes = await fetch(metaUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${metaConfig.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(metaPayload),
        });
        const mData = await mRes.json();
        if (mRes.ok && mData.messages?.[0]?.id) {
          sentCount++;
          await db.query(
            `INSERT INTO crm_campaign_logs (campaign_id, contact_id, phone, name, status, wamid)
             VALUES ($1, $2, $3, $4, 'sent', $5)`,
            [campaignId, contact.id, phone, contact.name, mData.messages[0].id]
          );
        } else {
          errorCount++;
          await db.query(
            `INSERT INTO crm_campaign_logs (campaign_id, contact_id, phone, name, status, error_msg)
             VALUES ($1, $2, $3, $4, 'error', $5)`,
            [campaignId, contact.id, phone, contact.name, mData.error?.message || 'Erro Meta']
          );
        }
      } catch (e) {
        errorCount++;
        await db.query(
          `INSERT INTO crm_campaign_logs (campaign_id, contact_id, phone, name, status, error_msg)
           VALUES ($1, $2, $3, $4, 'error', $5)`,
          [campaignId, contact.id, phone, contact.name, e.message]
        );
      }
    }

    await db.query(
      `UPDATE crm_campaigns SET status = 'done', sent_count = $2, error_count = $3, total = $4, sent_at = NOW() WHERE id = $1`,
      [campaignId, sentCount, errorCount, contacts.length]
    );
    res.json({ success: true, sentCount, errorCount, total: contacts.length });
  } catch (err) {
    console.error('Erro ao lançar campanha:', err);
    await db.query("UPDATE crm_campaigns SET status = 'error' WHERE id = $1", [req.params.id]).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ─── CRM: STATS / DASHBOARD ──────────────────────────────────────────────────
app.get('/api/crm/stats', async (req, res) => {
  try {
    const [contacts, lists, campaigns, logsMonth, logsByCategory, logsByDay] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total FROM crm_contacts'),
      db.query('SELECT COUNT(*)::int AS total FROM crm_lists'),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)::int AS done,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::int AS draft,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END)::int AS running
        FROM crm_campaigns
      `),
      db.query(`
        SELECT COUNT(*)::int AS total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int AS sent,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)::int AS errors
        FROM crm_campaign_logs
        WHERE EXTRACT(MONTH FROM sent_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM sent_at) = EXTRACT(YEAR FROM NOW())
      `),
      db.query(`
        SELECT mt.category, COUNT(cl.id)::int AS msg_count
        FROM crm_campaign_logs cl
        JOIN crm_campaigns cc ON cc.id = cl.campaign_id
        LEFT JOIN meta_templates mt ON mt.name = cc.template_name
        WHERE EXTRACT(MONTH FROM cl.sent_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM cl.sent_at) = EXTRACT(YEAR FROM NOW())
          AND cl.status = 'sent'
        GROUP BY mt.category
      `),
      db.query(`
        SELECT DATE(sent_at) AS day, COUNT(*)::int AS count
        FROM crm_campaign_logs
        WHERE sent_at >= NOW() - INTERVAL '30 days' AND status = 'sent'
        GROUP BY DATE(sent_at) ORDER BY day ASC
      `),
    ]);

    // Pricing per conversation (USD) - Brazil 2025
    const PRICING = { MARKETING: 0.0788, UTILITY: 0.0180, AUTHENTICATION: 0.0315, SERVICE: 0, null: 0.0788 };
    let totalCostUsd = 0;
    const costBreakdown = [];
    for (const row of logsByCategory.rows) {
      const rate = PRICING[row.category] ?? PRICING['MARKETING'];
      const cost = (row.msg_count || 0) * rate;
      totalCostUsd += cost;
      costBreakdown.push({ category: row.category || 'MARKETING', msg_count: row.msg_count, rate, cost_usd: cost });
    }

    // Recent campaigns
    const recentCamps = await db.query(`
      SELECT c.*, l.name AS list_name,
        (SELECT COUNT(*)::int FROM crm_campaign_logs WHERE campaign_id = c.id AND status = 'sent') AS sent_logs,
        (SELECT COUNT(*)::int FROM crm_campaign_logs WHERE campaign_id = c.id AND status = 'error') AS error_logs,
        mt.category AS template_category
      FROM crm_campaigns c
      LEFT JOIN crm_lists l ON l.id = c.list_id
      LEFT JOIN meta_templates mt ON mt.name = c.template_name
      ORDER BY c.created_at DESC LIMIT 10
    `);

    // Cost per recent campaign
    const campaignCosts = recentCamps.rows.map(c => {
      const rate = PRICING[c.template_category] ?? PRICING['MARKETING'];
      const cost_usd = (c.sent_logs || 0) * rate;
      return { ...c, cost_usd, rate };
    });

    res.json({
      contacts: contacts.rows[0]?.total || 0,
      lists: lists.rows[0]?.total || 0,
      campaigns: campaigns.rows[0] || { total:0, done:0, draft:0, running:0 },
      month: {
        total: logsMonth.rows[0]?.total || 0,
        sent: logsMonth.rows[0]?.sent || 0,
        errors: logsMonth.rows[0]?.errors || 0,
        cost_usd: totalCostUsd,
        breakdown: costBreakdown,
      },
      daily: logsByDay.rows,
      recentCampaigns: campaignCosts,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
});
