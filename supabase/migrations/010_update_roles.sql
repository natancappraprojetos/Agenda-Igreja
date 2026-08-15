-- ============================================================
-- 010_update_roles.sql
-- Atualiza as funções (roles) para separar cantores solo e congregacionais
-- ============================================================

-- Insere as novas funções de cantor
INSERT INTO roles (id, name, description, category, sort_order)
VALUES 
  (uuid_generate_v4(), 'Cantor(a) Solo', 'Pessoa que canta louvores especiais/solo', 'musical', 10),
  (uuid_generate_v4(), 'Cantor(a) Congregacional', 'Pessoa que dirige o louvor da congregação', 'musical', 20),
  (uuid_generate_v4(), 'Sonoplasta', 'Responsável pela mesa de som e projeção', 'operational', 30),
  (uuid_generate_v4(), 'Diácono/Diaconisa', 'Responsável pela ordem e recolhimento de ofertas', 'administrative', 40),
  (uuid_generate_v4(), 'Pregador(a)', 'Responsável por ministrar o sermão', 'liturgy', 50)
ON CONFLICT DO NOTHING;

-- Caso já exista uma role 'Cantor(a)', podemos renomeá-la para evitar duplicidades
UPDATE roles SET name = 'Cantor(a) Congregacional' WHERE name = 'Cantor(a)';
