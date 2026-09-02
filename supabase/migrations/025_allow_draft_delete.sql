-- 025_allow_draft_delete.sql

-- Permite exclusão pública de eventos que são rascunhos
DROP POLICY IF EXISTS "events_delete_draft_public" ON events;
CREATE POLICY "events_delete_draft_public" ON events
FOR DELETE USING (status = 'draft');

-- Permite exclusão pública de escalas (event_participants) para que pessoas possam ser desescaladas
DROP POLICY IF EXISTS "event_participants_delete_public" ON event_participants;
CREATE POLICY "event_participants_delete_public" ON event_participants
FOR DELETE USING (true);
