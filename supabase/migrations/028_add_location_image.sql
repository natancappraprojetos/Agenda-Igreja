-- Adiciona a coluna image_url na tabela locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Cria o bucket 'locations' no Storage do Supabase (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('locations', 'locations', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de RLS para o bucket 'locations'
-- Permite leitura pública de imagens
CREATE POLICY "Imagens de locais são públicas" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'locations');

-- Permite upload de imagens apenas para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de imagens de locais" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'locations' AND auth.role() = 'authenticated');

-- Permite deleção/atualização apenas para usuários autenticados
CREATE POLICY "Usuários autenticados podem atualizar imagens de locais" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'locations' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar imagens de locais" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'locations' AND auth.role() = 'authenticated');
