-- Seed default templates for different roles
INSERT INTO system_settings (key, value, description)
VALUES 
    ('whatsapp_template_default', 'Olá *{{nome}}*! A Paz do Senhor!\n\nEste é um lembrete automático da secretaria da igreja.\nVocê está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nQue Deus abençoe seu ministério! 🙏', 'Template de mensagem Padrão'),
    ('whatsapp_template_pregador', 'Olá *{{nome}}*! A Paz do Senhor!\n\nEste é um lembrete automático. Você está escalado(a) para trazer a mensagem da Palavra como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nOre por este momento! Deus te abençoe! 🙏', 'Template de mensagem para Pregadores'),
    ('whatsapp_template_musica', 'Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da escala de Louvor! Você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nNão esqueça de separar os hinos com antecedência! 🎵', 'Template de mensagem para Ministério da Música'),
    ('whatsapp_template_sonoplastia', 'Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da equipe técnica! Você está escalado(a) na *{{funcao}}* para o *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nPor favor, chegue com 30 minutos de antecedência para ligar os equipamentos e testar os microfones! 🎛️', 'Template de mensagem para Sonoplastia'),
    ('whatsapp_template_diaconato', 'Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da escala do Diaconato! Você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nSe houver batismo neste dia, lembre-se de verificar as toalhas e a água! Que Deus abençoe seu serviço! 🛡️', 'Template de mensagem para Diáconos')
ON CONFLICT (key) DO NOTHING;

-- Optionally, if they already modified 'whatsapp_schedule_template', we could copy it to 'whatsapp_template_default'.
-- But doing nothing is fine, we just update the app to use the new keys.
