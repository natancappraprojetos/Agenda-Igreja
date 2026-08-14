-- ============================================================
-- 005 - Public Insert for Events
-- ============================================================
-- Permite que visitantes cadastrem eventos na agenda pública
-- Esses eventos vão para o painel de aprovação/conflito da liderança

DROP POLICY IF EXISTS "events_insert_leadership" ON events;

-- Permite que qualquer um (logado ou não) crie eventos
CREATE POLICY "events_insert_public" ON events 
    FOR INSERT 
    WITH CHECK (true);

-- Porém, ainda mantemos que a atualização seja restrita aos líderes
CREATE POLICY "events_update_leadership_fallback" ON events
    FOR UPDATE TO authenticated
    USING (get_user_role_level() >= 2);
