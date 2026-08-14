-- ============================================================
-- AGENDA IGREJA — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgy_item_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgy_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgy_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgies ENABLE ROW LEVEL SECURITY;
ALTER TABLE liturgy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Function to check user's app role level
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role_level()
RETURNS INTEGER AS $$
    SELECT COALESCE(MAX(ar.level), 0)
    FROM user_app_roles uar
    JOIN app_roles ar ON ar.id = uar.app_role_id
    WHERE uar.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM user_app_roles uar
        JOIN app_roles ar ON ar.id = uar.app_role_id
        WHERE uar.user_id = auth.uid() AND ar.name = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_leadership()
RETURNS BOOLEAN AS $$
    SELECT get_user_role_level() >= 3;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PEOPLE policies
-- ============================================================
CREATE POLICY "people_select_authenticated" ON people
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "people_insert_leadership" ON people
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "people_update_leadership" ON people
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 3);

CREATE POLICY "people_delete_admin" ON people
    FOR DELETE TO authenticated
    USING (is_admin());

-- ============================================================
-- ROLES policies
-- ============================================================
CREATE POLICY "roles_select_authenticated" ON roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "roles_insert_admin" ON roles
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "roles_update_admin" ON roles
    FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "roles_delete_admin" ON roles
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- PERSON_ROLES policies
-- ============================================================
CREATE POLICY "person_roles_select_authenticated" ON person_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "person_roles_insert_leadership" ON person_roles
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "person_roles_delete_leadership" ON person_roles
    FOR DELETE TO authenticated
    USING (get_user_role_level() >= 3);

-- ============================================================
-- MINISTRIES policies
-- ============================================================
CREATE POLICY "ministries_select_authenticated" ON ministries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ministries_insert_admin" ON ministries
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "ministries_update_admin" ON ministries
    FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "ministries_delete_admin" ON ministries
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- PERSON_MINISTRIES policies
-- ============================================================
CREATE POLICY "person_ministries_select_authenticated" ON person_ministries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "person_ministries_insert_leadership" ON person_ministries
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "person_ministries_delete_leadership" ON person_ministries
    FOR DELETE TO authenticated
    USING (get_user_role_level() >= 3);

-- ============================================================
-- LOCATIONS policies
-- ============================================================
CREATE POLICY "locations_select_authenticated" ON locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_insert_leadership" ON locations
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "locations_update_leadership" ON locations
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 3);

CREATE POLICY "locations_delete_admin" ON locations
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- EVENT_TYPES policies
-- ============================================================
CREATE POLICY "event_types_select_authenticated" ON event_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_types_insert_admin" ON event_types
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "event_types_update_admin" ON event_types
    FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "event_types_delete_admin" ON event_types
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- APP_ROLES policies
-- ============================================================
CREATE POLICY "app_roles_select_authenticated" ON app_roles
    FOR SELECT TO authenticated USING (true);

-- ============================================================
-- USERS policies
-- ============================================================
CREATE POLICY "users_select_authenticated" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert_admin" ON users
    FOR INSERT TO authenticated WITH CHECK (is_admin() OR auth.uid() = id);

CREATE POLICY "users_update_admin" ON users
    FOR UPDATE TO authenticated
    USING (is_admin() OR auth.uid() = id);

-- ============================================================
-- USER_APP_ROLES policies
-- ============================================================
CREATE POLICY "user_app_roles_select_authenticated" ON user_app_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_app_roles_insert_admin" ON user_app_roles
    FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "user_app_roles_update_admin" ON user_app_roles
    FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY "user_app_roles_delete_admin" ON user_app_roles
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- EVENTS policies
-- ============================================================
CREATE POLICY "events_select_authenticated" ON events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_insert_leadership" ON events
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

CREATE POLICY "events_update_leadership" ON events
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 2);

CREATE POLICY "events_delete_admin" ON events
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- EVENT_PARTICIPANTS policies
-- ============================================================
CREATE POLICY "event_participants_select_authenticated" ON event_participants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_participants_insert_leadership" ON event_participants
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

CREATE POLICY "event_participants_update_leadership" ON event_participants
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 2);

CREATE POLICY "event_participants_delete_leadership" ON event_participants
    FOR DELETE TO authenticated
    USING (get_user_role_level() >= 2);

-- ============================================================
-- SCHEDULES policies
-- ============================================================
CREATE POLICY "schedules_select_own_or_leadership" ON schedules
    FOR SELECT TO authenticated
    USING (
        get_user_role_level() >= 3
        OR person_id IN (
            SELECT p.id FROM people p
            JOIN users u ON u.person_id = p.id
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "schedules_insert_leadership" ON schedules
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "schedules_update_leadership" ON schedules
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 3);

CREATE POLICY "schedules_delete_leadership" ON schedules
    FOR DELETE TO authenticated
    USING (get_user_role_level() >= 3);

-- ============================================================
-- SONGS policies
-- ============================================================
CREATE POLICY "songs_select_authenticated" ON songs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "songs_insert_leadership" ON songs
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

CREATE POLICY "songs_update_leadership" ON songs
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 2);

CREATE POLICY "songs_delete_admin" ON songs
    FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- LITURGY related policies
-- ============================================================
CREATE POLICY "liturgy_item_types_select" ON liturgy_item_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "liturgy_item_types_manage_admin" ON liturgy_item_types
    FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "liturgy_templates_select" ON liturgy_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "liturgy_templates_insert_leadership" ON liturgy_templates
    FOR INSERT TO authenticated WITH CHECK (get_user_role_level() >= 3);

CREATE POLICY "liturgy_templates_update_leadership" ON liturgy_templates
    FOR UPDATE TO authenticated USING (get_user_role_level() >= 3);

CREATE POLICY "liturgy_templates_delete_admin" ON liturgy_templates
    FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "liturgy_template_items_select" ON liturgy_template_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "liturgy_template_items_manage_leadership" ON liturgy_template_items
    FOR ALL TO authenticated USING (get_user_role_level() >= 3);

CREATE POLICY "liturgies_select" ON liturgies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "liturgies_insert_leadership" ON liturgies
    FOR INSERT TO authenticated WITH CHECK (get_user_role_level() >= 2);

CREATE POLICY "liturgies_update_leadership" ON liturgies
    FOR UPDATE TO authenticated USING (get_user_role_level() >= 2);

CREATE POLICY "liturgies_delete_admin" ON liturgies
    FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "liturgy_items_select" ON liturgy_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "liturgy_items_insert_leadership" ON liturgy_items
    FOR INSERT TO authenticated WITH CHECK (get_user_role_level() >= 2);

CREATE POLICY "liturgy_items_update_leadership" ON liturgy_items
    FOR UPDATE TO authenticated USING (get_user_role_level() >= 2);

CREATE POLICY "liturgy_items_delete_leadership" ON liturgy_items
    FOR DELETE TO authenticated USING (get_user_role_level() >= 2);

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_system" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

-- ============================================================
-- AUDIT_LOGS policies
-- ============================================================
CREATE POLICY "audit_logs_select_leadership" ON audit_logs
    FOR SELECT TO authenticated
    USING (get_user_role_level() >= 3);

CREATE POLICY "audit_logs_insert_authenticated" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);
