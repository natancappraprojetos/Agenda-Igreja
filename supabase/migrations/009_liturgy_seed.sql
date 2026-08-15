-- ============================================================
-- 009_liturgy_seed.sql
-- Adiciona os tipos de liturgia padrão e o modelo de "Culto de Sábado"
-- ============================================================

-- 1. Inserir Tipos de Liturgia
INSERT INTO liturgy_item_types (id, name, default_duration_minutes, icon, sort_order)
VALUES 
  (uuid_generate_v4(), 'Abertura Escola Sabatina', 5, '🌅', 10),
  (uuid_generate_v4(), 'Louvores', 15, '🎵', 20),
  (uuid_generate_v4(), 'Música Solo / Especial', 5, '🎤', 30),
  (uuid_generate_v4(), 'Historinha das Crianças', 5, '🧸', 40),
  (uuid_generate_v4(), 'Oferta e Dízimo', 5, '💰', 50),
  (uuid_generate_v4(), 'Anúncios', 5, '📢', 60),
  (uuid_generate_v4(), 'Sermão / Mensagem', 40, '📖', 70),
  (uuid_generate_v4(), 'Batismo', 15, '💧', 80)
ON CONFLICT (name) DO NOTHING;

-- 2. Criar Modelo de Liturgia "Culto de Sábado"
DO $$
DECLARE
  v_template_id UUID;
  v_type_id UUID;
BEGIN
  -- Verificar se já existe um template com esse nome
  IF EXISTS (SELECT 1 FROM liturgy_templates WHERE name = 'Culto de Sábado (Padrão)') THEN
    RETURN;
  END IF;

  -- Criar o Template
  INSERT INTO liturgy_templates (id, name, description)
  VALUES (uuid_generate_v4(), 'Culto de Sábado (Padrão)', 'Estrutura padrão com Escola Sabatina, Louvor e Adoração.')
  RETURNING id INTO v_template_id;

  -- Inserir os itens baseados nos tipos recém-criados
  -- 1. Abertura
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Abertura Escola Sabatina' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Abertura Escola Sabatina', 1, 5);
  END IF;

  -- 2. Louvores
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Louvores' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Momento de Louvor', 2, 15);
  END IF;

  -- 3. Historinha
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Historinha das Crianças' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Historinha das Crianças', 3, 5);
  END IF;

  -- 4. Oferta
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Oferta e Dízimo' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Recolhimento dos Dízimos e Ofertas', 4, 5);
  END IF;

  -- 5. Especial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Música Solo / Especial' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Música Especial', 5, 5);
  END IF;

  -- 6. Anúncios
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Anúncios' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Anúncios da Igreja', 6, 5);
  END IF;

  -- 7. Mensagem
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Sermão / Mensagem' LIMIT 1;
  IF v_type_id IS NOT NULL THEN
    INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
    VALUES (v_template_id, v_type_id, 'Sermão', 7, 40);
  END IF;

END $$;
