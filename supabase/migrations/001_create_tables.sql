-- ============================================================
-- AGENDA IGREJA — Database Schema
-- ============================================================
-- Execute this migration in your Supabase SQL Editor
-- All tables use UUID primary keys for security and scalability
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PEOPLE — Cadastro único de pessoas
-- ============================================================
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_people_name ON people (name);
CREATE INDEX idx_people_active ON people (is_active);

-- ============================================================
-- 2. ROLES — Funções configuráveis
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- 'liturgy', 'administrative', 'operational', 'musical'
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PERSON_ROLES — N:N Pessoa-Função
-- ============================================================
CREATE TABLE person_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(person_id, role_id)
);

CREATE INDEX idx_person_roles_person ON person_roles (person_id);
CREATE INDEX idx_person_roles_role ON person_roles (role_id);

-- ============================================================
-- 4. MINISTRIES — Ministérios
-- ============================================================
CREATE TABLE ministries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#4F46E5',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. PERSON_MINISTRIES — N:N Pessoa-Ministério
-- ============================================================
CREATE TABLE person_ministries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(person_id, ministry_id)
);

CREATE INDEX idx_person_ministries_person ON person_ministries (person_id);
CREATE INDEX idx_person_ministries_ministry ON person_ministries (ministry_id);

-- ============================================================
-- 6. LOCATIONS — Locais físicos
-- ============================================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    capacity INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. EVENT_TYPES — Tipos de evento configuráveis
-- ============================================================
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT '📅',
    color TEXT DEFAULT '#4F46E5',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. APP_ROLES — Perfis de acesso do sistema
-- ============================================================
CREATE TABLE app_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'admin', 'anciao', 'lider_ministerio', 'operacional', 'membro'
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0 -- Higher = more permissions
);

-- ============================================================
-- 9. USERS — Usuários do sistema (vinculados ao Supabase Auth)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_person ON users (person_id);

-- ============================================================
-- 10. USER_APP_ROLES — Permissões do usuário
-- ============================================================
CREATE TABLE user_app_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
    ministry_id UUID REFERENCES ministries(id) ON DELETE SET NULL, -- Nullable: for ministry-specific roles
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, app_role_id, ministry_id)
);

CREATE INDEX idx_user_app_roles_user ON user_app_roles (user_id);

-- ============================================================
-- 11. EVENTS — Eventos (entidade central)
-- ============================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    event_type_id UUID NOT NULL REFERENCES event_types(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location_id UUID REFERENCES locations(id),
    ministry_id UUID REFERENCES ministries(id),
    responsible_person_id UUID REFERENCES people(id),
    preacher_id UUID REFERENCES people(id),
    worship_leader_id UUID REFERENCES people(id),
    description TEXT,
    notes TEXT,
    needs_sound BOOLEAN NOT NULL DEFAULT false,
    needs_worship BOOLEAN NOT NULL DEFAULT false,
    needs_deaconry BOOLEAN NOT NULL DEFAULT false,
    sound_person_id UUID REFERENCES people(id),
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'completed'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_type ON events (event_type_id);
CREATE INDEX idx_events_location ON events (location_id);
CREATE INDEX idx_events_status ON events (status);

-- ============================================================
-- 12. EVENT_PARTICIPANTS — Pessoas envolvidas no evento
-- ============================================================
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'pending', 'declined'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, person_id, role_id)
);

CREATE INDEX idx_event_participants_event ON event_participants (event_id);
CREATE INDEX idx_event_participants_person ON event_participants (person_id);

-- ============================================================
-- 13. SCHEDULES — Escalas
-- ============================================================
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'pending', 'declined', 'swapped'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_person ON schedules (person_id);
CREATE INDEX idx_schedules_event ON schedules (event_id);
CREATE INDEX idx_schedules_date ON schedules (date);

-- ============================================================
-- 14. SONGS — Músicas
-- ============================================================
CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    artist TEXT,
    category TEXT,
    duration_approx TEXT, -- e.g. '4:30'
    link TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_songs_title ON songs (title);

-- ============================================================
-- 15. LITURGY_ITEM_TYPES — Tipos de item de liturgia
-- ============================================================
CREATE TABLE liturgy_item_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_duration_minutes INTEGER NOT NULL DEFAULT 5,
    icon TEXT DEFAULT '📋',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 16. LITURGY_TEMPLATES — Modelos de liturgia
-- ============================================================
CREATE TABLE liturgy_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 17. LITURGY_TEMPLATE_ITEMS — Itens do modelo de liturgia
-- ============================================================
CREATE TABLE liturgy_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES liturgy_templates(id) ON DELETE CASCADE,
    item_type_id UUID REFERENCES liturgy_item_types(id),
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    default_duration_minutes INTEGER NOT NULL DEFAULT 5,
    is_fixed_time BOOLEAN NOT NULL DEFAULT false,
    fixed_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liturgy_template_items_template ON liturgy_template_items (template_id);

-- ============================================================
-- 18. LITURGIES — Liturgia de um evento
-- ============================================================
CREATE TABLE liturgies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
    template_id UUID REFERENCES liturgy_templates(id),
    start_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'published'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liturgies_event ON liturgies (event_id);

-- ============================================================
-- 19. LITURGY_ITEMS — Itens reais da liturgia
-- ============================================================
CREATE TABLE liturgy_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    liturgy_id UUID NOT NULL REFERENCES liturgies(id) ON DELETE CASCADE,
    item_type_id UUID REFERENCES liturgy_item_types(id),
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 5,
    is_fixed_time BOOLEAN NOT NULL DEFAULT false,
    fixed_time TIME,
    calculated_time TIME,
    responsible_person_id UUID REFERENCES people(id),
    song_id UUID REFERENCES songs(id),
    notes TEXT,
    visibility TEXT NOT NULL DEFAULT 'all', -- 'all', 'louvor', 'sonoplastia', 'pregador', 'diaconato'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liturgy_items_liturgy ON liturgy_items (liturgy_id);
CREATE INDEX idx_liturgy_items_order ON liturgy_items (liturgy_id, order_index);

-- ============================================================
-- 20. NOTIFICATIONS — Notificações internas
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'schedule', 'change', 'cancel', 'reminder', 'conflict'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_read ON notifications (user_id, is_read);

-- ============================================================
-- 21. AUDIT_LOGS — Histórico de alterações
-- ============================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL, -- 'event', 'liturgy', 'schedule', 'person', etc.
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'force_conflict'
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs (created_at);

-- ============================================================
-- FUNCTIONS — Helper functions
-- ============================================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ministries_updated_at BEFORE UPDATE ON ministries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgies_updated_at BEFORE UPDATE ON liturgies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liturgy_templates_updated_at BEFORE UPDATE ON liturgy_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: Check location conflicts
-- ============================================================
CREATE OR REPLACE FUNCTION check_location_conflict(
    p_location_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
    event_id UUID,
    event_title TEXT,
    event_start_time TIME,
    event_end_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.start_time, e.end_time
    FROM events e
    WHERE e.location_id = p_location_id
      AND e.date = p_date
      AND e.status != 'cancelled'
      AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
      AND (
          (p_start_time < COALESCE(e.end_time, e.start_time + interval '2 hours')
           AND COALESCE(p_end_time, p_start_time + interval '2 hours') > e.start_time)
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: Check person conflicts
-- ============================================================
CREATE OR REPLACE FUNCTION check_person_conflict(
    p_person_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
    event_id UUID,
    event_title TEXT,
    event_start_time TIME,
    event_end_time TIME,
    role_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.start_time, e.end_time, r.name
    FROM events e
    LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.person_id = p_person_id
    LEFT JOIN roles r ON r.id = ep.role_id
    WHERE e.date = p_date
      AND e.status != 'cancelled'
      AND (p_exclude_event_id IS NULL OR e.id != p_exclude_event_id)
      AND (
          e.responsible_person_id = p_person_id
          OR e.preacher_id = p_person_id
          OR e.worship_leader_id = p_person_id
          OR e.sound_person_id = p_person_id
          OR ep.person_id = p_person_id
      )
      AND (
          (p_start_time < COALESCE(e.end_time, e.start_time + interval '2 hours')
           AND COALESCE(p_end_time, p_start_time + interval '2 hours') > e.start_time)
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEW: Event pendencies
-- ============================================================
CREATE OR REPLACE VIEW event_pendencies AS
SELECT
    e.id AS event_id,
    e.title,
    e.date,
    e.start_time,
    et.name AS event_type,
    e.preacher_id IS NOT NULL AS has_preacher,
    e.worship_leader_id IS NOT NULL AS has_worship_leader,
    (NOT e.needs_sound OR e.sound_person_id IS NOT NULL) AS has_sound,
    (NOT e.needs_deaconry OR EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name = 'Diácono'
    )) AS has_deaconry,
    e.responsible_person_id IS NOT NULL AS has_responsible,
    e.location_id IS NOT NULL AS has_location,
    CASE
        WHEN e.preacher_id IS NOT NULL
             AND e.worship_leader_id IS NOT NULL
             AND (NOT e.needs_sound OR e.sound_person_id IS NOT NULL)
             AND (NOT e.needs_deaconry OR EXISTS(
                 SELECT 1 FROM event_participants ep
                 JOIN roles r ON r.id = ep.role_id
                 WHERE ep.event_id = e.id AND r.name = 'Diácono'
             ))
             AND e.responsible_person_id IS NOT NULL
             AND e.location_id IS NOT NULL
        THEN 'complete'
        ELSE 'pending'
    END AS pendency_status
FROM events e
JOIN event_types et ON et.id = e.event_type_id
WHERE e.status != 'cancelled'
  AND e.date >= CURRENT_DATE;
