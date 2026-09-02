-- Fix event_pendencies to include event_needs table
CREATE OR REPLACE VIEW event_pendencies AS
SELECT 
    e.id,
    e.title,
    e.date,
    e.start_time,
    e.needs_sound,
    e.needs_worship,
    e.needs_deaconry,
    et.name AS event_type,
    
    -- Pregador
    EXISTS(
        SELECT 1 FROM event_participants ep
        JOIN roles r ON r.id = ep.role_id
        WHERE ep.event_id = e.id AND r.name ILIKE '%Pregador%'
    ) AS has_preacher,
    
    -- Louvor (Qualquer funcao musical)
    (
        NOT e.needs_worship 
        AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND (ent.name ILIKE '%Louvor%' OR ent.name ILIKE '%Música%'))
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND r.category = 'musical'
        )
    ) AS has_worship_leader,
    
    -- Sonoplastia
    (
        NOT e.needs_sound 
        AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Sonoplastia%')
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND (r.name ILIKE '%Sonoplastia%' OR r.name ILIKE '%Áudio%' OR r.name ILIKE '%Som%')
        )
    ) AS has_sound,
    
    -- Diaconato
    (
        NOT e.needs_deaconry 
        AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Diaconato%')
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND r.name ILIKE '%Diácono%'
        )
    ) AS has_deaconry

FROM events e
JOIN event_types et ON et.id = e.event_type_id
WHERE e.status = 'scheduled';
