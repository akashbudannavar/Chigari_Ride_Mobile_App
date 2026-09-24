/*
# CHIGARI RIDE — Stage 2B Tracking Database Foundation

## Overview
Establishes the backend database foundation for physical bus tracking and anonymous,
privacy-preserving passenger-assisted observation telemetry.

## Schema Modifications:

1. `buses`:
   - Adds `fleet_number` (text UNIQUE) for unique physical vehicle identification (e.g. 'CR-BUS-001').
   - Adds `is_active` (boolean, DEFAULT true) for vehicle operational state.

2. `live_positions`:
   - Adds `service_number` (text) denormalized route indicator ('200A', '201B', etc.).
   - Adds `tracking_source` (observed/predicted).
   - Adds `movement_state` (moving/stopped/at_station/offline).
   - Adds `confidence_tier` (LIVE/RECENT/ESTIMATED/STALE/OFFLINE).
   - Adds `last_observation_at` (timestamptz).
   - Adds `first_established_at` (timestamptz).
   - Adds `active_contributors` (int).
   - Enforces `UNIQUE(bus_id)` so each physical bus has exactly one active live position row.

3. `passenger_observations` (NEW TABLE):
   - Anonymous, short-lived crowdsourced telemetry ingestion table.
   - Strictly NO user_id, NO foreign key to auth.users, NO passenger identity.
   - `session_id` is an ephemeral UUID generated on device per trip.
   - RLS: INSERT allowed for anon + authenticated. Zero client SELECT/UPDATE/DELETE.

4. `purge_expired_passenger_observations()`:
   - Routine to purge observations older than 10 minutes (TTL enforcement).
   - SECURITY DEFINER with search_path = public.

5. Development Seeding:
   - Seeds the 7 development physical bus identities (CR-BUS-001 through CR-BUS-007)
     safely using ON CONFLICT (fleet_number) DO NOTHING and dynamic route lookup.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. EXTEND BUSES TABLE (Physical Vehicle Identity)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS fleet_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. EXTEND LIVE_POSITIONS TABLE (Tracking Telemetry & State)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.live_positions
  ADD COLUMN IF NOT EXISTS service_number text,
  ADD COLUMN IF NOT EXISTS tracking_source text NOT NULL DEFAULT 'observed'
    CHECK (tracking_source IN ('observed', 'predicted')),
  ADD COLUMN IF NOT EXISTS movement_state text NOT NULL DEFAULT 'moving'
    CHECK (movement_state IN ('moving', 'stopped', 'at_station', 'offline')),
  ADD COLUMN IF NOT EXISTS confidence_tier text NOT NULL DEFAULT 'LIVE'
    CHECK (confidence_tier IN ('LIVE', 'RECENT', 'ESTIMATED', 'STALE', 'OFFLINE')),
  ADD COLUMN IF NOT EXISTS last_observation_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS first_established_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS active_contributors int NOT NULL DEFAULT 1;

-- Enforce 1:1 uniqueness constraint between bus and live_positions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_positions_bus_id_key'
  ) THEN
    ALTER TABLE public.live_positions ADD CONSTRAINT live_positions_bus_id_key UNIQUE (bus_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CREATE PASSENGER_OBSERVATIONS TABLE (Anonymous Telemetry Ingestion)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.passenger_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,                    -- Anonymous ephemeral session token
  service_number text NOT NULL,                -- '200A', '201B', '100D', '202C'
  lat numeric NOT NULL,                        -- WGS84 Latitude
  lng numeric NOT NULL,                        -- WGS84 Longitude
  accuracy numeric NOT NULL,                   -- Horizontal GPS accuracy in meters
  speed numeric,                               -- Speed in km/h (nullable)
  heading numeric,                             -- Bearing in degrees (nullable)
  reported_fleet_number text,                  -- Optional passenger-reported fleet number
  observed_at timestamptz NOT NULL,            -- Timestamp of device GPS fix
  created_at timestamptz NOT NULL DEFAULT now()-- Ingestion timestamp
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS) FOR PASSENGER OBSERVATIONS
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.passenger_observations ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated passengers to insert telemetry breadcrumbs
DROP POLICY IF EXISTS "anon_insert_passenger_observations" ON public.passenger_observations;
CREATE POLICY "anon_insert_passenger_observations" ON public.passenger_observations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- NOTE: Client SELECT, UPDATE, and DELETE are strictly disallowed.
-- Only server-side workers / service_role can read and aggregate observations.

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PERFORMANCE & CLUSTERING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_passenger_obs_clustering
  ON public.passenger_observations (service_number, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_passenger_obs_ttl
  ON public.passenger_observations (created_at);

CREATE INDEX IF NOT EXISTS idx_live_positions_service
  ON public.live_positions (service_number);

CREATE INDEX IF NOT EXISTS idx_live_positions_confidence
  ON public.live_positions (confidence_tier);

CREATE INDEX IF NOT EXISTS idx_buses_fleet_number
  ON public.buses (fleet_number);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. OBSERVATION TTL RETENTION CLEANUP FUNCTION (10-Minute Rolling TTL)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purge_expired_passenger_observations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.passenger_observations
  WHERE created_at < (now() - interval '10 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public roles to ensure this remains a backend maintenance routine
REVOKE EXECUTE ON FUNCTION public.purge_expired_passenger_observations() FROM public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. PHYSICAL BUS SEEDING (Representative Development Records)
-- ═══════════════════════════════════════════════════════════════════════════
-- Seeds the 7 development physical bus identities from Stage 1 safely.
-- Uses dynamic route lookups and ON CONFLICT (fleet_number) DO NOTHING to preserve existing records.
INSERT INTO public.buses (plate, fleet_number, route_id, capacity, type, is_active)
VALUES
  ('KA-25-F-1001', 'CR-BUS-001', (SELECT id FROM public.routes WHERE route_number = '200A' LIMIT 1), 50, 'ordinary', true),
  ('KA-25-F-1002', 'CR-BUS-002', (SELECT id FROM public.routes WHERE route_number = '200A' LIMIT 1), 50, 'ordinary', true),
  ('KA-25-F-1003', 'CR-BUS-003', (SELECT id FROM public.routes WHERE route_number = '200A' LIMIT 1), 50, 'ordinary', true),
  ('KA-25-F-1004', 'CR-BUS-004', (SELECT id FROM public.routes WHERE route_number = '201B' LIMIT 1), 50, 'express', true),
  ('KA-25-F-1005', 'CR-BUS-005', (SELECT id FROM public.routes WHERE route_number = '201B' LIMIT 1), 50, 'express', true),
  ('KA-25-F-1006', 'CR-BUS-006', (SELECT id FROM public.routes WHERE route_number = '100D' LIMIT 1), 50, 'ordinary', true),
  ('KA-25-F-1007', 'CR-BUS-007', (SELECT id FROM public.routes WHERE route_number = '202C' LIMIT 1), 50, 'ordinary', true)
ON CONFLICT (fleet_number) DO NOTHING;
