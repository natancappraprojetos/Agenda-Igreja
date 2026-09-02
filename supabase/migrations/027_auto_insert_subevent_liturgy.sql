-- Trigger to automatically insert a liturgy item when a sub-event is created
-- If the parent event already has a liturgy, we append the sub-event to it.

CREATE OR REPLACE FUNCTION sync_subevent_to_liturgy()
RETURNS TRIGGER AS $$
DECLARE
  v_liturgy_id UUID;
  v_order_index INT;
  v_person_id UUID;
  v_title TEXT;
BEGIN
  -- Only care about sub-events
  IF NEW.parent_event_id IS NOT NULL THEN
    
    -- Check if the parent event has a liturgy
    SELECT id INTO v_liturgy_id FROM liturgies WHERE event_id = NEW.parent_event_id;
    
    IF v_liturgy_id IS NOT NULL THEN
      -- Get the max order_index to append it at the end (or we could try to be smart, but end is safest)
      SELECT COALESCE(MAX(order_index), 0) + 10 INTO v_order_index FROM liturgy_items WHERE liturgy_id = v_liturgy_id;
      
      -- Determine the person (responsible person of the sub-event)
      v_person_id := NEW.responsible_person_id;
      v_title := NEW.title;
      
      -- Insert into liturgy_items
      INSERT INTO liturgy_items (
        liturgy_id,
        title,
        duration_minutes,
        order_index,
        responsible_person_id
      ) VALUES (
        v_liturgy_id,
        'Evento: ' || v_title,
        10, -- Default duration
        v_order_index,
        v_person_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_subevent_to_liturgy ON events;
CREATE TRIGGER trigger_sync_subevent_to_liturgy
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION sync_subevent_to_liturgy();
