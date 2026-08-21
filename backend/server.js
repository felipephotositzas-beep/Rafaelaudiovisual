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
