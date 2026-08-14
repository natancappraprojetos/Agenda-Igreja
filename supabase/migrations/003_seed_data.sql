-- ============================================================
-- AGENDA IGREJA — Seed Data
-- ============================================================
-- Initial data to make the system functional out of the box
-- ============================================================

-- ============================================================
-- APP_ROLES — System roles
-- ============================================================
INSERT INTO app_roles (name, description, level) VALUES
    ('admin', 'Administrador — Acesso completo ao sistema', 5),
    ('anciao', 'Ancião / Liderança — Acesso ampliado, gestão da programação', 4),
    ('lider_ministerio', 'Líder de Ministério — Gerencia o próprio ministério', 3),
    ('operacional', 'Responsável Operacional — Gerencia sua área (sonoplastia, diaconato, louvor)', 2),
    ('membro', 'Membro — Visualização da agenda e compromissos pessoais', 1);

-- ============================================================
-- EVENT_TYPES — Tipos de evento
-- ============================================================
INSERT INTO event_types (name, icon, color, sort_order) VALUES
    ('Culto', '⛪', '#4F46E5', 1),
    ('Escola Sabatina', '📖', '#7C3AED', 2),
    ('Reunião', '🤝', '#2563EB', 3),
    ('Comissão', '📋', '#0891B2', 4),
    ('Batismo', '💧', '#0D9488', 5),
    ('Ensaio', '🎵', '#059669', 6),
    ('Programa Jovem', '🌟', '#D97706', 7),
    ('Desbravadores', '🏕️', '#DC2626', 8),
    ('Ministério Infantil', '👶', '#DB2777', 9),
    ('Evento Especial', '✨', '#7C3AED', 10),
    ('Atividade', '📌', '#64748B', 11),
    ('Outro', '📅', '#94A3B8', 12);

-- ============================================================
-- ROLES — Funções
-- ============================================================
INSERT INTO roles (name, description, category, sort_order) VALUES
    ('Pregador', 'Responsável pelo sermão/mensagem', 'liturgy', 1),
    ('Ancião', 'Ancião da igreja', 'administrative', 2),
    ('Diácono', 'Diácono/Diaconisa', 'operational', 3),
    ('Diaconisa', 'Diaconisa da igreja', 'operational', 4),
    ('Sonoplasta', 'Responsável pela sonoplastia', 'operational', 5),
    ('Recepção', 'Responsável pela recepção', 'operational', 6),
    ('Líder de Louvor', 'Responsável pelo louvor', 'musical', 7),
    ('Cantor', 'Cantor/Cantora', 'musical', 8),
    ('Instrumentista', 'Músico instrumentista', 'musical', 9),
    ('Diretor', 'Diretor de departamento/ministério', 'administrative', 10),
    ('Professor', 'Professor de classe', 'liturgy', 11),
    ('Coordenador', 'Coordenador de atividade', 'administrative', 12),
    ('Pianista', 'Pianista/Tecladista', 'musical', 13),
    ('Violonista', 'Violonista', 'musical', 14);

-- ============================================================
-- LITURGY_ITEM_TYPES — Tipos de item de liturgia com durações padrão
-- ============================================================
INSERT INTO liturgy_item_types (name, default_duration_minutes, icon, sort_order) VALUES
    ('Hino', 3, '🎵', 1),
    ('Louvor', 5, '🎶', 2),
    ('Louvor Congregacional', 10, '🎤', 3),
    ('Louvor Especial', 5, '🌟', 4),
    ('Oração', 3, '🙏', 5),
    ('Oração de Joelhos', 3, '🧎', 6),
    ('Anúncios', 5, '📢', 7),
    ('Momento da Família', 5, '👨‍👩‍👧‍👦', 8),
    ('Sermão', 40, '📖', 9),
    ('Pedidos e Agradecimentos', 10, '💬', 10),
    ('Dízimos e Ofertas', 5, '💰', 11),
    ('Provai e Vede', 3, '📺', 12),
    ('Adoração Infantil', 5, '👶', 13),
    ('Informativo Mundial', 5, '🌍', 14),
    ('Estudo da Lição', 30, '📚', 15),
    ('Pastoreio', 10, '🤝', 16),
    ('Abertura', 3, '🚪', 17),
    ('Encerramento', 3, '🔚', 18),
    ('Música Especial', 5, '🎼', 19),
    ('Pregação', 40, '🎙️', 20),
    ('Momento da Fidelidade', 5, '💝', 21),
    ('Outro', 5, '📋', 99);

-- ============================================================
-- LOCATIONS — Locais padrão
-- ============================================================
INSERT INTO locations (name, description, capacity) VALUES
    ('Nave', 'Salão principal da igreja', 300),
    ('Sala das Crianças', 'Sala para o ministério infantil', 30),
    ('Sala dos Adolescentes', 'Sala para adolescentes', 25),
    ('Sala dos Jovens', 'Sala para atividades dos jovens', 40),
    ('Sala dos Anciãos', 'Sala de reunião dos anciãos', 15),
    ('Cozinha', 'Cozinha da igreja', 10),
    ('Sala de Reunião', 'Sala para reuniões gerais', 20),
    ('Área Externa', 'Área externa da igreja', 100);

-- ============================================================
-- MINISTRIES — Ministérios padrão
-- ============================================================
INSERT INTO ministries (name, description, color) VALUES
    ('Ministério Jovem', 'Departamento de jovens', '#D97706'),
    ('Ministério da Música', 'Departamento de música e louvor', '#7C3AED'),
    ('Desbravadores', 'Clube de Desbravadores', '#DC2626'),
    ('Ministério Infantil', 'Departamento infantil', '#DB2777'),
    ('Escola Sabatina', 'Departamento da Escola Sabatina', '#2563EB'),
    ('Ministério Pessoal', 'Departamento de evangelismo', '#059669'),
    ('Diaconato', 'Corpo de diáconos e diaconisas', '#0891B2'),
    ('Sonoplastia', 'Equipe de sonoplastia e mídia', '#64748B'),
    ('Anciãos', 'Corpo de anciãos da igreja', '#4F46E5'),
    ('Comunicação', 'Departamento de comunicação', '#F59E0B');

-- ============================================================
-- LITURGY_TEMPLATES — Modelos de liturgia iniciais
-- ============================================================

-- Template: Culto de Sábado (manhã)
INSERT INTO liturgy_templates (id, name, description) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Culto de Sábado (Manhã)', 'Modelo para o culto matutino de sábado incluindo Escola Sabatina');

INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, notes) VALUES
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Abertura'), 'Abertura da Escola Sabatina', 1, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Hino'), 'Hino Inicial', 2, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Oração de Joelhos'), 'Oração de Joelhos', 3, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Informativo Mundial'), 'Informativo Mundial das Missões', 4, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Especial'), 'Louvor Especial', 5, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Estudo da Lição'), 'Estudo da Lição nas Classes', 6, 30, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Pastoreio'), 'Pastoreio com Professores', 7, 10, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Especial'), 'Louvor Especial', 8, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Anúncios'), 'Anúncios', 9, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Momento da Família'), 'Momento da Família', 10, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Adoração Infantil'), 'Adoração Infantil', 11, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Dízimos e Ofertas'), 'Provai e Vede + Dízimos e Ofertas', 12, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Congregacional'), 'Louvores Congregacionais', 13, 10, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Inicial', 14, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Especial'), 'Louvor Especial', 15, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Sermão'), 'Sermão', 16, 40, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Música Especial'), 'Música Especial', 17, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000001', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Final', 18, 3, false, NULL);

-- Template: Culto de Quarta
INSERT INTO liturgy_templates (id, name, description) VALUES
    ('a1000000-0000-0000-0000-000000000002', 'Culto de Quarta-Feira', 'Modelo para o culto de quarta-feira à noite');

INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, notes) VALUES
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor'), 'Louvor', 1, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Inicial', 2, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Pedidos e Agradecimentos'), 'Pedidos e Agradecimentos', 3, 10, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Momento da Fidelidade'), 'Momento da Fidelidade / Ofertas', 4, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor'), 'Louvor', 5, 4, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Pregação'), 'Pregação', 6, 30, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor'), 'Louvor Final', 7, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000002', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Final', 8, 3, false, NULL);

-- Template: Culto de Domingo
INSERT INTO liturgy_templates (id, name, description) VALUES
    ('a1000000-0000-0000-0000-000000000003', 'Culto de Domingo', 'Modelo para o culto dominical');

INSERT INTO liturgy_template_items (template_id, item_type_id, title, order_index, default_duration_minutes, is_fixed_time, notes) VALUES
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Congregacional'), 'Louvores', 1, 10, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Inicial', 2, 3, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Anúncios'), 'Anúncios', 3, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Dízimos e Ofertas'), 'Dízimos e Ofertas', 4, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Louvor Especial'), 'Louvor Especial', 5, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Sermão'), 'Sermão', 6, 40, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Música Especial'), 'Música Especial', 7, 5, false, NULL),
    ('a1000000-0000-0000-0000-000000000003', (SELECT id FROM liturgy_item_types WHERE name = 'Oração'), 'Oração Final', 8, 3, false, NULL);
