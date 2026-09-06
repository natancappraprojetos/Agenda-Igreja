-- Insert new roles for Evangelistic events
INSERT INTO roles (id, name, description, category, sort_order)
VALUES 
  (uuid_generate_v4(), 'Abertura', 'Pessoa responsável pela abertura do culto', 'liturgy', 110),
  (uuid_generate_v4(), 'Sorteio', 'Pessoa responsável por conduzir o sorteio', 'liturgy', 120)
ON CONFLICT (name) DO NOTHING;
