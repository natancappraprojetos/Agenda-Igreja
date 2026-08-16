-- 1. Create table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Everyone can read settings
CREATE POLICY "Public read settings" ON system_settings
    FOR SELECT TO public USING (true);

-- Only admins can update settings
CREATE POLICY "Admins update settings" ON system_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_app_roles uar
            JOIN app_roles ar ON uar.app_role_id = ar.id
            WHERE uar.user_id = auth.uid() AND ar.name = 'admin'
        )
    );

-- 4. Seed default template
INSERT INTO system_settings (key, value, description)
VALUES (
    'whatsapp_schedule_template',
    'Olá *{{nome}}*! A Paz do Senhor!\n\nEste é um lembrete automático da secretaria da igreja.\nVocê está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nQue Deus abençoe seu ministério! 🙏',
    'Template de mensagem para envio pelo WhatsApp'
) ON CONFLICT (key) DO NOTHING;
