-- Observation events table — stores all live observation events from
-- the admin's ObservationPopup component. Mirrors the LocalStorage shape
-- saved at key `mazy_observations_v1:{participantId}:{condition}`.
--
-- Run this once in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS observation_events (
  id             BIGSERIAL PRIMARY KEY,
  event_id       TEXT        NOT NULL,         -- e.g. 'EV-001'
  participant_id TEXT        NOT NULL,         -- display_name from users
  condition      TEXT        NOT NULL,         -- 'Mazy' | 'Legacy'
  session_time   TEXT        NOT NULL,         -- 'MM:SS' since session start
  timestamp      TIMESTAMPTZ NOT NULL,         -- ISO when event was logged
  event_type     TEXT        NOT NULL,         -- hesitation | misclick | frustration | positive | behavioral | vocal
  screen         TEXT,                         -- intro | goals | concept | animation | lab | practice | hint | quiz | results
  duration_sec   INT,                          -- seconds (hesitation duration etc.)
  severity       INT,                          -- 1-5 researcher rating
  verbatim       TEXT,                         -- vocal cue quote
  notes          TEXT,                         -- free-form observer notes
  uploaded_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (participant_id, condition, event_id)
);

CREATE INDEX IF NOT EXISTS obs_events_participant_idx
  ON observation_events (participant_id, condition);

CREATE INDEX IF NOT EXISTS obs_events_type_idx
  ON observation_events (event_type);

-- RLS: admin dashboard uses the anon key, so allow full access from anon.
-- Tighten this if you later move admin behind authenticated sessions.
ALTER TABLE observation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_full" ON observation_events;
CREATE POLICY "anon_full"
  ON observation_events
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
