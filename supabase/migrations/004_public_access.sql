-- ============================================================
-- 004 - Public Access for Anonymous Users
-- ============================================================
-- Permite que usuários sem login vejam a agenda e liturgias

-- Tabelas que precisam ser lidas publicamente
DROP POLICY IF EXISTS "events_select_authenticated" ON events;
CREATE POLICY "events_select_public" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_types_select_authenticated" ON event_types;
CREATE POLICY "event_types_select_public" ON event_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "locations_select_authenticated" ON locations;
CREATE POLICY "locations_select_public" ON locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "liturgies_select" ON liturgies;
CREATE POLICY "liturgies_select_public" ON liturgies FOR SELECT USING (true);

DROP POLICY IF EXISTS "liturgy_items_select" ON liturgy_items;
CREATE POLICY "liturgy_items_select_public" ON liturgy_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "liturgy_item_types_select" ON liturgy_item_types;
CREATE POLICY "liturgy_item_types_select_public" ON liturgy_item_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_participants_select_authenticated" ON event_participants;
CREATE POLICY "event_participants_select_public" ON event_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "people_select_authenticated" ON people;
CREATE POLICY "people_select_public" ON people FOR SELECT USING (true);

DROP POLICY IF EXISTS "roles_select_authenticated" ON roles;
CREATE POLICY "roles_select_public" ON roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "songs_select_authenticated" ON songs;
CREATE POLICY "songs_select_public" ON songs FOR SELECT USING (true);
