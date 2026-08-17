-- Adicionar trigger para person_roles
CREATE TRIGGER person_roles_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON person_roles
FOR EACH ROW EXECUTE FUNCTION log_history_change();

-- Adicionar trigger para people (opcional, para capturar quando criam um novo cadastro)
CREATE TRIGGER people_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON people
FOR EACH ROW EXECUTE FUNCTION log_history_change();
