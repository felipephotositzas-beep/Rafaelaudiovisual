const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

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
      // Se não existir, retorna vazio e o frontend usa o DEFAULT
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
    
    // Upsert na config
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

    // Upsert de Fotógrafos
    if (photographers && Array.isArray(photographers)) {
      // Por simplicidade, podemos fazer loop (em prod usar transação batch é melhor)
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
    // Converter de rows para o formato do Frontend: { [eventId]: { [photogId]: { isHidden, order } } }
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
    
    // Precisamos de isHidden e order. Se vier parcial, pegamos do banco primeiro ou assumimos defaults.
    // Usamos ON CONFLICT para simplificar.
    
    // Busca atual para fazer merge (já que o frontend manda parcial às vezes)
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
  console.log(\`Servidor rodando na porta \${PORT}\`);
});
