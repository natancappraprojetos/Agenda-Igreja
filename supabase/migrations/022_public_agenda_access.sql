-- ============================================================
-- 022 - Public Access for Agenda Management
-- ============================================================
-- Permite que usuários anônimos possam criar e editar eventos e escalas

-- EVENTS
DROP POLICY IF EXISTS "events_insert_public" ON events;
CREATE POLICY "events_insert_public" ON events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "events_update_public" ON events;
CREATE POLICY "events_update_public" ON events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "events_delete_public" ON events;
CREATE POLICY "events_delete_public" ON events FOR DELETE USING (true);

-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "event_participants_insert_public" ON event_participants;
CREATE POLICY "event_participants_insert_public" ON event_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "event_participants_update_public" ON event_participants;
CREATE POLICY "event_participants_update_public" ON event_participants FOR UPDATE USING (true);

DROP POLICY IF EXISTS "event_participants_delete_public" ON event_participants;
CREATE POLICY "event_participants_delete_public" ON event_participants FOR DELETE USING (true);
