-- Insert Batismo and Santa Ceia into event_needs_types
INSERT INTO public.event_needs_types (name, icon, description, is_active) VALUES
  ('Batismo', '💧', 'Haverá cerimônia de batismo', true),
  ('Santa Ceia', '🥖', 'Haverá celebração da Santa Ceia', true)
ON CONFLICT DO NOTHING;
