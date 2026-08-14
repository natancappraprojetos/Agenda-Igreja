-- Adicionar ícone aos ministérios
ALTER TABLE public.ministries ADD COLUMN IF NOT EXISTS icon text DEFAULT '🏛️';

-- Criar tabela de tipos de necessidades
CREATE TABLE IF NOT EXISTS public.event_needs_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    icon text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de relacionamento entre eventos e necessidades
CREATE TABLE IF NOT EXISTS public.event_needs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    need_type_id uuid REFERENCES public.event_needs_types(id) ON DELETE CASCADE NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, need_type_id)
);

-- Inserir algumas necessidades básicas para migrar os dados antigos
INSERT INTO public.event_needs_types (name, icon, description) VALUES
('Sonoplastia / Mídia', '🔊', 'Equipe responsável pelo som e projeção'),
('Diaconato / Recepção', '👔', 'Equipe de recepção e organização'),
('Comida / Lanche', '🍔', 'Alimentação para os participantes')
ON CONFLICT DO NOTHING;

-- Policies para event_needs_types e event_needs
ALTER TABLE public.event_needs_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.event_needs_types FOR SELECT USING (true);
CREATE POLICY "Enable all access for leadership" ON public.event_needs_types FOR ALL USING (
  get_user_role_level() >= 3
);

CREATE POLICY "Enable read access for all users" ON public.event_needs FOR SELECT USING (true);
CREATE POLICY "Enable insert for public" ON public.event_needs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for public" ON public.event_needs FOR UPDATE USING (true);
CREATE POLICY "Enable delete for public" ON public.event_needs FOR DELETE USING (true);
