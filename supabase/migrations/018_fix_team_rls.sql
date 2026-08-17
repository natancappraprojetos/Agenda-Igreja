-- 018_fix_team_rls.sql
-- Atualiza as políticas de RLS para permitir que líderes de nível 2 (Diáconos, Sonoplastia, Música)
-- possam cadastrar novas pessoas e gerenciá-las em suas próprias equipes.

-- 1. Permitir que nível 2 possa CADASTRAR pessoas
DROP POLICY IF EXISTS "people_insert_leadership" ON people;
CREATE POLICY "people_insert_leadership" ON people
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

-- 2. Permitir que nível 2 possa ADICIONAR membros à equipe (inserir em person_roles)
DROP POLICY IF EXISTS "person_roles_insert_leadership" ON person_roles;
CREATE POLICY "person_roles_insert_leadership" ON person_roles
    FOR INSERT TO authenticated
    WITH CHECK (get_user_role_level() >= 2);

-- 3. Permitir que nível 2 possa REMOVER membros da equipe (deletar de person_roles)
DROP POLICY IF EXISTS "person_roles_delete_leadership" ON person_roles;
CREATE POLICY "person_roles_delete_leadership" ON person_roles
    FOR DELETE TO authenticated
    USING (get_user_role_level() >= 2);
