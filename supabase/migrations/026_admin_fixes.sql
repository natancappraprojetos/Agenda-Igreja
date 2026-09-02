-- Migration: 026_admin_fixes
-- Garante que administradores consigam deletar qualquer evento, escala e liturgia

-- EVENTS
DROP POLICY IF EXISTS "events_delete_admin" ON events;
CREATE POLICY "events_delete_admin" ON events
FOR DELETE USING (get_user_role_level() >= 3);

-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "event_participants_delete_admin" ON event_participants;
CREATE POLICY "event_participants_delete_admin" ON event_participants
FOR DELETE USING (get_user_role_level() >= 3);

-- LITURGIES
DROP POLICY IF EXISTS "liturgies_delete_admin" ON liturgies;
CREATE POLICY "liturgies_delete_admin" ON liturgies
FOR DELETE USING (get_user_role_level() >= 3);

-- LITURGY_ITEMS
DROP POLICY IF EXISTS "liturgy_items_delete_admin" ON liturgy_items;
CREATE POLICY "liturgy_items_delete_admin" ON liturgy_items
FOR DELETE USING (get_user_role_level() >= 3);
