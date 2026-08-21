-- database/seed.sql
-- Carga inicial de dados para o PostgreSQL na VPS

-- 1. Inserção do Fotógrafo Principal (Rafael Publicado)
INSERT INTO photographers (id, name, slug, avatar_url, profile_url, is_primary, is_active)
VALUES (
    'aa12f6ec-5d65-4fa7-a435-5da6155be6a0',
    'Rafael Publicado (Rafael Costa)',
    'rafael-costa',
    'https://ik.imagekit.io/yg7h35ptj/public/assets/temp_nt2ARuj.jpeg',
    'https://topfotos.com.br/perfil/rafael-costa',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    profile_url = EXCLUDED.profile_url,
    is_primary = TRUE,
    is_active = TRUE;

-- 2. Configurações padrão White-Label do Site
INSERT INTO site_configs (id, branding, theme, banners, how_it_works, events_config)
VALUES (
    'default',
    '{
        "siteName": "Rafael Publicado Audiovisual",
        "siteTitle": "rafaelpublicado",
        "sloganHero": "Sejam bem vindos. Rafael Publicado Audiovisual – Você primeiro aqui!",
        "subtitleHero": "Fotos profissionais dos melhores eventos esportivos e momentos especiais. Encontre-se, reviva e compartilhe.",
        "whatsappNumber": "5599991297693",
        "whatsappMessage": "Olá, gostaria de tirar uma dúvida sobre as fotos."
    }'::jsonb,
    '{
        "primaryColor": "#006BD6",
        "primaryDeep": "#063A78",
        "primaryHover": "#007BF5",
        "backgroundColor": "#F8FAFC",
        "cardBackground": "#FFFFFF",
        "textPrimary": "#0F172A",
        "textSecondary": "#475569"
    }'::jsonb,
    '{
        "enableHeroPromoBanner": false,
        "heroMainImage": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&auto=format&fit=crop&q=85"
    }'::jsonb,
    '{
        "step1Title": "Encontre sua galeria",
        "step1Desc": "Procure pelo evento e acesse a galeria.",
        "step2Title": "Achar suas fotos",
        "step2Desc": "Use o reconhecimento facial rápido.",
        "step3Title": "Escolha e compre",
        "step3Desc": "Selecione as fotos e pague via PIX ou Cartão.",
        "step4Title": "Baixe e compartilhe",
        "step4Desc": "Após o pagamento receba seus arquivos direto no Whatsapp."
    }'::jsonb,
    '{
        "mergeSharedEvents": true
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
