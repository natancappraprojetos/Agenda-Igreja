-- Add parent_event_id to events table for sub-events (e.g. Batismo linked to Culto)
ALTER TABLE events ADD COLUMN parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Create an index to quickly find sub-events for an event
CREATE INDEX idx_events_parent_event_id ON events(parent_event_id);
