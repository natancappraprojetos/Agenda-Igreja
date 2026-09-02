-- Trigger to synchronize event_participants with liturgy_items
CREATE OR REPLACE FUNCTION sync_event_participant_to_liturgy()
RETURNS TRIGGER AS $$
DECLARE
    v_role_name text;
    v_liturgy_id uuid;
    v_person_id uuid;
    v_event_id uuid;
BEGIN
    -- Determine the operation type and get correct references
    IF TG_OP = 'DELETE' THEN
        v_event_id := OLD.event_id;
        v_person_id := NULL; -- Removing the person
        -- Get role name
        SELECT name INTO v_role_name FROM roles WHERE id = OLD.role_id;
    ELSE
        v_event_id := NEW.event_id;
        v_person_id := NEW.person_id;
        -- Get role name
        SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;
    END IF;

    -- Check if a liturgy exists for this event
    SELECT id INTO v_liturgy_id FROM liturgies WHERE event_id = v_event_id;

    -- If there's a liturgy, update the corresponding items
    IF v_liturgy_id IS NOT NULL THEN
        -- Pregador(a) -> Sermão / Pregação / Oração Final
        IF v_role_name = 'Pregador(a)' OR v_role_name = 'Ancião' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%sermão%' OR title ILIKE '%pregação%' OR title ILIKE '%oração final%');
        END IF;

        -- Líder de Louvor / Música -> Louvor / Hinos
        IF v_role_name = 'Líder de Louvor' OR v_role_name = 'Louvor' OR v_role_name = 'Música' OR v_role_name = 'Louvor/Música' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%louvor%' OR title ILIKE '%cânticos%' OR title ILIKE '%louvor congregacional%');
        END IF;

        -- Escola Sabatina
        IF v_role_name = 'Escola Sabatina' OR v_role_name = 'Diretor' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%sabatina%' OR title ILIKE '%lição%' OR title ILIKE '%pastoreio%');
        END IF;

        -- Ofertas
        IF v_role_name = 'Ofertas' OR v_role_name = 'Diácono/Diaconisa' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%oferta%' OR title ILIKE '%dízimo%' OR title ILIKE '%fidelidade%');
        END IF;

        -- História das Crianças
        IF v_role_name = 'História das Crianças' OR v_role_name = 'Infantil' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%história%' OR title ILIKE '%criança%');
        END IF;

        -- Anúncios
        IF v_role_name = 'Anúncios' OR v_role_name = 'Comunicação' THEN
            UPDATE liturgy_items 
            SET person_id = v_person_id 
            WHERE liturgy_id = v_liturgy_id 
            AND (title ILIKE '%anúncio%' OR title ILIKE '%recado%');
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_liturgy_participants ON event_participants;

CREATE TRIGGER trigger_sync_liturgy_participants
AFTER INSERT OR UPDATE OF person_id OR DELETE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION sync_event_participant_to_liturgy();
