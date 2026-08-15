-- ============================================================
-- 013_monthly_leaders.sql
-- Tabela para armazenar os líderes mensais de cada ministério/função (para o Robô WhatsApp)
-- ============================================================

CREATE TABLE IF NOT EXISTS monthly_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_year VARCHAR(7) NOT NULL, -- formato 'YYYY-MM'
  role_category VARCHAR(50) NOT NULL, -- ex: 'preacher', 'sound', 'worship', 'deaconry'
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(month_year, role_category)
);

-- Ativa RLS
ALTER TABLE monthly_leaders ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Líderes mensais são visíveis por todos" 
ON monthly_leaders FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode inserir líderes mensais" 
ON monthly_leaders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_app_roles uar
    JOIN app_roles ar ON ar.id = uar.app_role_id
    WHERE uar.user_id = auth.uid() AND ar.name = 'admin'
  )
);

CREATE POLICY "Apenas admin pode atualizar líderes mensais" 
ON monthly_leaders FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_app_roles uar
    JOIN app_roles ar ON ar.id = uar.app_role_id
    WHERE uar.user_id = auth.uid() AND ar.name = 'admin'
  )
);
