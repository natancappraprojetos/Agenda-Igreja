-- ============================================================
-- 011_liturgy_seed_v2.sql
-- Atualiza os tipos de liturgia e o modelo de "Culto de Sábado" detalhado
-- ============================================================

-- 1. Inserir os Novos Tipos de Liturgia
INSERT INTO liturgy_item_types (id, name, default_duration_minutes, icon, sort_order)
VALUES 
  (uuid_generate_v4(), 'Oração de Joelhos', 3, '🙏', 15),
  (uuid_generate_v4(), 'Informativo Mundial das Missões', 7, '🌍', 16),
  (uuid_generate_v4(), 'Estudo da Lição nas Classes', 30, '📘', 17),
  (uuid_generate_v4(), 'Pastoreio nas Classes', 10, '💼', 18),
  (uuid_generate_v4(), 'Momento da Família', 5, '👨‍👩‍👧‍👦', 65),
  (uuid_generate_v4(), 'Votos Batismais', 5, '✋', 81),
  (uuid_generate_v4(), 'Provai e Vede', 10, '📺', 51),
  (uuid_generate_v4(), 'Hino Inicial', 5, '🎼', 19),
  (uuid_generate_v4(), 'Louvor Especial', 5, '🎼', 25),
  (uuid_generate_v4(), 'Louvores Congregacionais', 10, '🎼', 21),
  (uuid_generate_v4(), 'Oração Inicial', 5, '🙏', 22),
  (uuid_generate_v4(), 'Oração Final', 5, '🙏', 90)
ON CONFLICT (name) DO NOTHING;

-- 2. Recriar Modelo de Liturgia "Culto de Sábado (Padrão)" detalhado
DO $$
DECLARE
  v_template_id UUID;
  v_type_id UUID;
BEGIN
  -- Remover o template antigo se existir para não duplicar, ou apenas deletar seus itens
  SELECT id INTO v_template_id FROM liturgy_templates WHERE name = 'Culto de Sábado (Padrão)' LIMIT 1;
  
  IF v_template_id IS NOT NULL THEN
    DELETE FROM liturgy_template_items WHERE template_id = v_template_id;
  ELSE
    -- Criar o Template
    INSERT INTO liturgy_templates (id, name, description)
    VALUES (uuid_generate_v4(), 'Culto de Sábado (Padrão)', 'Estrutura completa do culto de sábado (09:00 - 11:50).')
    RETURNING id INTO v_template_id;
  END IF;

  -- 1. 09:00 Abertura Escola Sabatina
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Abertura Escola Sabatina' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Abertura da Escola Sabatina', 1, 10, true, '09:00:00');

  -- 2. 09:10 Hino Inicial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Hino Inicial' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Hino Inicial', 2, 5, true, '09:10:00');

  -- 3. 09:10 Oração de Joelhos (mesmo horário, mas logo após)
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Oração de Joelhos' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes)
  VALUES (v_template_id, v_type_id, 'Oração de Joelhos', 3, 3);

  -- 4. 09:13 Informativo Mundial das Missões
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Informativo Mundial das Missões' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Informativo Mundial das Missões', 4, 7, true, '09:13:00');

  -- 5. 09:20 Estudo da Lição
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Estudo da Lição nas Classes' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Estudo da Lição nas Classes com os professores', 5, 30, true, '09:20:00');

  -- 6. 09:50 Pastoreio
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Pastoreio nas Classes' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Pastoreio com os Professores nas Classes', 6, 10, true, '09:50:00');

  -- 7. 10:00 Louvor Especial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Louvor Especial' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Louvor Especial', 7, 5, true, '10:00:00');

  -- 8. 10:05 Anúncios
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Anúncios' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Anúncios', 8, 5, true, '10:05:00');

  -- 9. 10:10 Momento da Família
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Momento da Família' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Momento da Família', 9, 5, true, '10:10:00');

  -- 10. 10:15 Votos Batismais (Opcional)
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Votos Batismais' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Votos Batismais (Se houver batismo)', 10, 5, true, '10:15:00');

  -- 11. 10:20 Provai e Vede + Dízimos e Ofertas
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Provai e Vede' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Provai e Vede + Dízimos e Ofertas', 11, 10, true, '10:20:00');

  -- 12. 10:30 Louvores Congregacionais
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Louvores Congregacionais' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Louvores Congregacionais', 12, 10, true, '10:30:00');

  -- 13. 10:40 Oração Inicial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Oração Inicial' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Oração Inicial (de joelhos)', 13, 5, true, '10:40:00');

  -- 14. 10:45 Louvor Especial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Louvor Especial' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Louvor Especial', 14, 5, true, '10:45:00');

  -- 15. 10:50 Sermão
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Sermão / Mensagem' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Sermão', 15, 35, true, '10:50:00');

  -- 16. 11:25 Louvor Especial
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Louvor Especial' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Louvor Especial', 16, 5, true, '11:25:00');

  -- 17. 11:30 Oração Final
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Oração Final' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Oração Final', 17, 5, true, '11:30:00');

  -- 18. 11:35 Batismo
  SELECT id INTO v_type_id FROM liturgy_item_types WHERE name = 'Batismo' LIMIT 1;
  INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, fixed_time)
  VALUES (v_template_id, v_type_id, 'Momento Especial do Batismo (se houver)', 18, 15, true, '11:35:00');

END $$;
