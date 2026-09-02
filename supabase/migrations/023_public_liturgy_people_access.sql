-- ============================================================
-- 023 - Public Access for Liturgy and People
-- ============================================================
-- Permite que qualquer usuário (logado ou não) possa criar/atualizar
-- pessoas, liturgias e itens de liturgia, acompanhando o acesso
-- público da agenda (eventos).

-- PEOPLE
DROP POLICY IF EXISTS "people_insert_public" ON people;
CREATE POLICY "people_insert_public" ON people FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "people_update_public" ON people;
CREATE POLICY "people_update_public" ON people FOR UPDATE USING (true);

-- LITURGIES
DROP POLICY IF EXISTS "liturgies_insert_public" ON liturgies;
CREATE POLICY "liturgies_insert_public" ON liturgies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "liturgies_update_public" ON liturgies;
CREATE POLICY "liturgies_update_public" ON liturgies FOR UPDATE USING (true);

-- LITURGY_ITEMS
DROP POLICY IF EXISTS "liturgy_items_insert_public" ON liturgy_items;
CREATE POLICY "liturgy_items_insert_public" ON liturgy_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "liturgy_items_update_public" ON liturgy_items;
CREATE POLICY "liturgy_items_update_public" ON liturgy_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "liturgy_items_delete_public" ON liturgy_items;
CREATE POLICY "liturgy_items_delete_public" ON liturgy_items FOR DELETE USING (true);
