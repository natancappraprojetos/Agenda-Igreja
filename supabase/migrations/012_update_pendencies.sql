-- ============================================================
-- 012_update_pendencies.sql
-- Atualiza a view de pendências para usar event_participants e novas roles
-- ============================================================

CREATE OR REPLACE VIEW event_pendencies AS
SELECT
    e.id AS event_id,
    e.title,
    e.date,
    e.start_time,
    et.name AS event_type,
    
    -- Pregador
    EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name ILIKE '%Pregador%'
    ) AS has_preacher,
    
    -- Louvor (Cantor Congregacional ou Cantor Solo)
    EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name ILIKE '%Cantor%'
    ) AS has_worship_leader,
    
    -- Sonoplastia
    (NOT e.needs_sound OR EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name ILIKE '%Sonoplasta%'
    )) AS has_sound,
    
    -- Diaconato
    (NOT e.needs_deaconry OR EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name ILIKE '%Diácono%'
    )) AS has_deaconry,
    
    e.responsible_person_id IS NOT NULL AS has_responsible,
    e.location_id IS NOT NULL AS has_location,
    
    CASE
        WHEN EXISTS(
                SELECT 1 FROM event_participants ep
                JOIN roles r ON r.id = ep.role_id
                WHERE ep.event_id = e.id AND r.name ILIKE '%Pregador%'
             )
             AND EXISTS(
                SELECT 1 FROM event_participants ep
                JOIN roles r ON r.id = ep.role_id
                WHERE ep.event_id = e.id AND r.name ILIKE '%Cantor%'
             )
             AND (NOT e.needs_sound OR EXISTS(
                SELECT 1 FROM event_participants ep
                JOIN roles r ON r.id = ep.role_id
                WHERE ep.event_id = e.id AND r.name ILIKE '%Sonoplasta%'
             ))
             AND (NOT e.needs_deaconry OR EXISTS(
                SELECT 1 FROM event_participants ep
                JOIN roles r ON r.id = ep.role_id
                WHERE ep.event_id = e.id AND r.name ILIKE '%Diácono%'
             ))
             AND e.responsible_person_id IS NOT NULL
             AND e.location_id IS NOT NULL
        THEN 'complete'
        ELSE 'pending'
    END AS pendency_status,
    e.status AS event_status
FROM events e
LEFT JOIN event_types et ON et.id = e.event_type_id;
