-- 1. Inserir os novos papéis se não existirem
INSERT INTO app_roles (name, description, level) VALUES
('diacono', 'Líder do Diaconato — Acesso APENAS à escala do Diaconato', 2),
('musica', 'Líder do Ministério da Música — Acesso APENAS à escala de Louvor', 2),
('sonoplastia', 'Líder da Sonoplastia — Acesso APENAS à escala de Sonoplastia', 2)
ON CONFLICT (name) DO NOTHING;

-- 2. Atualizar usuários existentes para os novos papéis
-- O usuário 'Sonoplastia' (criado pelo Natan com email sonplastia@...) deve ir para 'sonoplastia'
UPDATE user_app_roles
SET app_role_id = (SELECT id FROM app_roles WHERE name = 'sonoplastia')
WHERE app_role_id = (SELECT id FROM app_roles WHERE name = 'operacional');

-- Se houver líderes de ministério que ele cadastrou com nome de musica, etc. Vamos jogar temporariamente para musica (ou se sobrar algum)
UPDATE user_app_roles
SET app_role_id = (SELECT id FROM app_roles WHERE name = 'musica')
WHERE app_role_id = (SELECT id FROM app_roles WHERE name = 'lider_ministerio');

-- Membros normais (se ele criou) vamos jogar para diacono só para não dar erro (ele disse que não criou)
UPDATE user_app_roles
SET app_role_id = (SELECT id FROM app_roles WHERE name = 'diacono')
WHERE app_role_id = (SELECT id FROM app_roles WHERE name = 'membro');

-- 3. Excluir os papéis antigos genéricos
DELETE FROM app_roles WHERE name IN ('lider_ministerio', 'operacional', 'membro');

-- 4. Re-ordenar (opcional)
UPDATE app_roles SET description = 'Administrador — Acesso completo ao sistema', level = 5 WHERE name = 'admin';
UPDATE app_roles SET description = 'Ancião / Liderança — Acesso ampliado, gestão da programação', level = 4 WHERE name = 'anciao';
