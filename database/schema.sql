-- database/schema.sql
-- Banco de Dados PostgreSQL para o Site de Venda de Fotos TopFotos / Rafael Publicado (VPS)

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Usuários Administrativos
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Configurações Gerais White-Label do Site
CREATE TABLE IF NOT EXISTS site_configs (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    branding JSONB NOT NULL DEFAULT '{}'::jsonb,
    theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    banners JSONB NOT NULL DEFAULT '{}'::jsonb,
    how_it_works JSONB NOT NULL DEFAULT '{}'::jsonb,
    events_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Fotógrafos Cadastrados
CREATE TABLE IF NOT EXISTS photographers (
    id VARCHAR(100) PRIMARY KEY, -- UUID TopFotos ou custom ID
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    avatar_url TEXT,
    profile_url TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Configuração de Fotógrafos por Evento (Ordem & Ocultação de Fotos)
CREATE TABLE IF NOT EXISTS event_photographer_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL,
    photographer_id VARCHAR(100) NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE, -- Se TRUE, não exibe as fotos deste fotógrafo no evento
    display_order INT DEFAULT 1,     -- Ordem de exibição das fotos no evento (1 = primeiro, 2 = segundo, etc)
    custom_pricing NUMERIC(10, 2),   -- Preço personalizado por foto neste evento (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_photographer UNIQUE (event_id, photographer_id)
);

-- Índices para alta performance nas consultas
CREATE INDEX IF NOT EXISTS idx_event_settings_event ON event_photographer_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_settings_photog ON event_photographer_settings(photographer_id);
CREATE INDEX IF NOT EXISTS idx_photographers_active ON photographers(is_active);

-- 6. Tabela de Banners Promocionais
CREATE TABLE IF NOT EXISTS promo_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT,
    target_event_id VARCHAR(100),
    external_link TEXT,
    button_text VARCHAR(100) DEFAULT 'Acessar Galeria',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
