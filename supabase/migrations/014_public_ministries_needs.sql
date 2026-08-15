-- ============================================================
-- 014_public_ministries_needs.sql
-- Allow public SELECT access to ministries and event_needs_types for the public /agendar wizard
-- ============================================================

DROP POLICY IF EXISTS "ministries_select_public" ON ministries;
CREATE POLICY "ministries_select_public" ON ministries FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_needs_types_select_public" ON event_needs_types;
CREATE POLICY "event_needs_types_select_public" ON event_needs_types FOR SELECT USING (true);
