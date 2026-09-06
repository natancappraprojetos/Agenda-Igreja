-- Fix event_pendencies - drop and recreate to avoid column order conflicts
DROP VIEW IF EXISTS event_pendencies;

CREATE VIEW event_pendencies AS
SELECT 
    e.id AS event_id,
    e.title,
    e.date,
    e.start_time,
    e.needs_sound,
    e.needs_worship,
    e.needs_deaconry,
    et.name AS event_type,
    
    -- Pregador (Exigido apenas em cultos, checa dados do evento, participantes e liturgia)
    (
        NOT et.name ILIKE '%culto%'
        OR e.preacher_id IS NOT NULL 
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND r.name ILIKE '%Pregador%'
        )
        OR EXISTS(
            SELECT 1 FROM liturgy_items li
            JOIN liturgies l ON l.id = li.liturgy_id
            WHERE l.event_id = e.id AND li.responsible_person_id IS NOT NULL AND (li.title ILIKE '%sermão%' OR li.title ILIKE '%pregação%')
        )
    ) AS has_preacher,
    
    -- Louvor (Checa dados do evento, participantes e liturgia)
    (
        (
            NOT e.needs_worship 
            AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND (ent.name ILIKE '%Louvor%' OR ent.name ILIKE '%Música%'))
        )
        OR e.worship_leader_id IS NOT NULL
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND r.category = 'musical'
        )
        OR EXISTS(
            SELECT 1 FROM liturgy_items li
            JOIN liturgies l ON l.id = li.liturgy_id
            WHERE l.event_id = e.id AND li.responsible_person_id IS NOT NULL AND (li.title ILIKE '%louvor%' OR li.title ILIKE '%música%' OR li.title ILIKE '%cântico%')
        )
    ) AS has_worship_leader,
    
    -- Sonoplastia
    (
        (
            NOT e.needs_sound 
            AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Sonoplastia%')
        )
        OR e.sound_person_id IS NOT NULL
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND (r.name ILIKE '%Sonoplastia%' OR r.name ILIKE '%Áudio%' OR r.name ILIKE '%Som%')
        )
    ) AS has_sound,
    
    -- Diaconato
    (
        (
            NOT e.needs_deaconry 
            AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Diaconato%')
        )
        OR EXISTS(
            SELECT 1 FROM event_participants ep
            JOIN roles r ON r.id = ep.role_id
            WHERE ep.event_id = e.id AND r.name ILIKE '%Diácono%'
        )
    ) AS has_deaconry,
    
    e.responsible_person_id IS NOT NULL AS has_responsible,
    e.location_id IS NOT NULL AS has_location,

    CASE
        WHEN 
            (
                NOT et.name ILIKE '%culto%' OR e.preacher_id IS NOT NULL 
                OR EXISTS(SELECT 1 FROM event_participants ep JOIN roles r ON r.id = ep.role_id WHERE ep.event_id = e.id AND r.name ILIKE '%Pregador%')
                OR EXISTS(SELECT 1 FROM liturgy_items li JOIN liturgies l ON l.id = li.liturgy_id WHERE l.event_id = e.id AND li.responsible_person_id IS NOT NULL AND (li.title ILIKE '%sermão%' OR li.title ILIKE '%pregação%'))
            )
            AND (
                (NOT e.needs_worship AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND (ent.name ILIKE '%Louvor%' OR ent.name ILIKE '%Música%')))
                OR e.worship_leader_id IS NOT NULL
                OR EXISTS(SELECT 1 FROM event_participants ep JOIN roles r ON r.id = ep.role_id WHERE ep.event_id = e.id AND r.category = 'musical')
                OR EXISTS(SELECT 1 FROM liturgy_items li JOIN liturgies l ON l.id = li.liturgy_id WHERE l.event_id = e.id AND li.responsible_person_id IS NOT NULL AND (li.title ILIKE '%louvor%' OR li.title ILIKE '%música%' OR li.title ILIKE '%cântico%'))
            )
            AND (
                (NOT e.needs_sound AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Sonoplastia%'))
                OR e.sound_person_id IS NOT NULL
                OR EXISTS(SELECT 1 FROM event_participants ep JOIN roles r ON r.id = ep.role_id WHERE ep.event_id = e.id AND (r.name ILIKE '%Sonoplastia%' OR r.name ILIKE '%Áudio%' OR r.name ILIKE '%Som%'))
            )
            AND (
                (NOT e.needs_deaconry AND NOT EXISTS(SELECT 1 FROM event_needs en JOIN event_needs_types ent ON ent.id = en.need_type_id WHERE en.event_id = e.id AND ent.name ILIKE '%Diaconato%'))
                OR EXISTS(SELECT 1 FROM event_participants ep JOIN roles r ON r.id = ep.role_id WHERE ep.event_id = e.id AND r.name ILIKE '%Diácono%')
            )
            AND e.responsible_person_id IS NOT NULL
            AND e.location_id IS NOT NULL
        THEN 'complete'
        ELSE 'pending'
    END AS pendency_status,
    e.status AS event_status

FROM events e
JOIN event_types et ON et.id = e.event_type_id
WHERE e.status IN ('scheduled', 'confirmed');
