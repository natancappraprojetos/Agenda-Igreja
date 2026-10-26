-- Migration 032: Permissões para criadores de eventos e anciãos
-- Permite que a pessoa que criou o evento (ex: Denis da sonoplastia, William da música)
-- possa editar e excluir o que criou, além dos anciãos e administradores poderem gerenciar cultos.

-- 1. Definir valor padrão auth.uid() para a coluna created_by
ALTER TABLE events ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. Trigger para garantir que created_by receba auth.uid() caso venha nulo
CREATE OR REPLACE FUNCTION set_events_created_by()
RETURNS trigger AS $$
BEGIN
    IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_events_created_by ON events;
CREATE TRIGGER trigger_set_events_created_by
BEFORE INSERT ON events
FOR EACH ROW EXECUTE FUNCTION set_events_created_by();

-- 3. Atualizar política de EXCLUSÃO de eventos
-- Permite que o criador (created_by = auth.uid()) ou liderança (nível >= 3, admin/anciãos) ou rascunhos possam excluir
DROP POLICY IF EXISTS "events_delete_admin" ON events;
DROP POLICY IF EXISTS "events_delete_creator" ON events;
CREATE POLICY "events_delete_creator" ON events
FOR DELETE USING (
    created_by = auth.uid()
    OR get_user_role_level() >= 3
    OR status = 'draft'
);

-- 4. Preenchimento retroativo (backfill) de eventos antigos a partir dos logs de auditoria
UPDATE events e
SET created_by = h.user_id
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, user_id
    FROM history_logs
    WHERE entity_type = 'events' AND action = 'INSERT' AND user_id IS NOT NULL
    ORDER BY entity_id, created_at ASC
) h
WHERE e.id = h.entity_id AND e.created_by IS NULL;

-- 5. Preenchimento retroativo para eventos onde o responsável é um usuário do sistema
UPDATE events e
SET created_by = u.id
FROM users u
WHERE e.created_by IS NULL
  AND e.responsible_person_id IS NOT NULL
  AND u.person_id = e.responsible_person_id;
