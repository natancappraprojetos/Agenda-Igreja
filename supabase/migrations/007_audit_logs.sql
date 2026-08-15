-- Migration: 007_audit_logs

CREATE TABLE history_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- 'events', 'event_participants', 'liturgy_items'
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE history_logs ENABLE ROW LEVEL SECURITY;

-- Liderança e Admins podem ver os logs
CREATE POLICY "Liderança pode ver historico"
    ON history_logs FOR SELECT
    TO authenticated
    USING (
        get_user_role_level() >= 2
    );

-- Função de Trigger para registrar as alterações
CREATE OR REPLACE FUNCTION log_history_change()
RETURNS trigger AS $$
DECLARE
    v_user_id UUID;
    v_details JSONB;
BEGIN
    -- Obter o ID do usuário que fez a requisição (se vier via API do Supabase)
    v_user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        v_details := to_jsonb(NEW);
        INSERT INTO history_logs (user_id, action, entity_type, entity_id, details)
        VALUES (v_user_id, 'INSERT', TG_TABLE_NAME, NEW.id, v_details);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_details := to_jsonb(NEW);
        INSERT INTO history_logs (user_id, action, entity_type, entity_id, details)
        VALUES (v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, v_details);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_details := to_jsonb(OLD);
        INSERT INTO history_logs (user_id, action, entity_type, entity_id, details)
        VALUES (v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, v_details);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a trigger nas principais tabelas
CREATE TRIGGER events_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON events
FOR EACH ROW EXECUTE FUNCTION log_history_change();

CREATE TRIGGER event_participants_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON event_participants
FOR EACH ROW EXECUTE FUNCTION log_history_change();

CREATE TRIGGER liturgy_items_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON liturgy_items
FOR EACH ROW EXECUTE FUNCTION log_history_change();
