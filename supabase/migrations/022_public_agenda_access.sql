-- ============================================================
-- 022 - Public Access for Agenda Management (Revised)
-- ============================================================
-- Permite que usuários anônimos possam CRIAR eventos e escalas,
-- mas a EXCLUSÃO fica protegida apenas para liderança (Admin/Ancião)

-- EVENTS
DROP POLICY IF EXISTS "events_insert_public" ON events;
CREATE POLICY "events_insert_public" ON events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "events_update_public" ON events;
CREATE POLICY "events_update_public" ON events FOR UPDATE USING (true);

-- Revoga a exclusão pública que havia sido criada anteriormente (se existir)
DROP POLICY IF EXISTS "events_delete_public" ON events;


-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "event_participants_insert_public" ON event_participants;
CREATE POLICY "event_participants_insert_public" ON event_participants FOR INSERT WITH CHECK (true);

-- Permite atualizar escalas (ex: mudar o pregador), mas se quiser bloquear, é só remover isso:
DROP POLICY IF EXISTS "event_participants_update_public" ON event_participants;
CREATE POLICY "event_participants_update_public" ON event_participants FOR UPDATE USING (true);

-- Revoga a exclusão pública de escalas (se existir)
DROP POLICY IF EXISTS "event_participants_delete_public" ON event_participants;
