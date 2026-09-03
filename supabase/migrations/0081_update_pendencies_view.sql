-- Migration: 008_update_pendencies_view
-- Modifica a view event_pendencies para exigir papéis (pregador, louvor, etc) apenas em Cultos.

DROP VIEW IF EXISTS event_pendencies;

CREATE OR REPLACE VIEW event_pendencies AS
SELECT
    e.id AS event_id,
    e.title,
    e.date,
    e.start_time,
    et.name AS event_type,
    
    -- Culto exige pregador; outros não.
    CASE WHEN et.name ILIKE '%culto%' THEN e.preacher_id IS NOT NULL ELSE true END AS has_preacher,
    CASE WHEN et.name ILIKE '%culto%' THEN e.worship_leader_id IS NOT NULL ELSE true END AS has_worship_leader,
    
    (NOT e.needs_sound OR e.sound_person_id IS NOT NULL) AS has_sound,
    (NOT e.needs_deaconry OR EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name = 'Diácono'
    )) AS has_deaconry,
    e.responsible_person_id IS NOT NULL AS has_responsible,
    e.location_id IS NOT NULL AS has_location,
    
    CASE
        WHEN (CASE WHEN et.name ILIKE '%culto%' THEN e.preacher_id IS NOT NULL ELSE true END)
             AND (CASE WHEN et.name ILIKE '%culto%' THEN e.worship_leader_id IS NOT NULL ELSE true END)
             AND (NOT e.needs_sound OR e.sound_person_id IS NOT NULL)
             AND (NOT e.needs_deaconry OR EXISTS(
                 SELECT 1 FROM event_participants ep
                 JOIN roles r ON r.id = ep.role_id
                 WHERE ep.event_id = e.id AND r.name = 'Diácono'
             ))
             AND e.responsible_person_id IS NOT NULL
             AND e.location_id IS NOT NULL
        THEN 'complete'
        ELSE 'pending'
    END AS pendency_status,
    
    e.status AS event_status -- Trazemos o status para poder aprovar
FROM events e
JOIN event_types et ON et.id = e.event_type_id
WHERE e.status != 'cancelled'
  AND e.date >= CURRENT_DATE;
