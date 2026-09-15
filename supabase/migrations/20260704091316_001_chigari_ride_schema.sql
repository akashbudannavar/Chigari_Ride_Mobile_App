/*
# CHIGARI RIDE — Core Transit Schema

## Overview
Creates the foundational database schema for the CHIGARI RIDE smart public
transportation app (NWKRTC Hubballi-Dharwad). The schema models routes, stops,
buses, live positions, schedules, fares, user profiles, tickets, and transactions.

## New Tables

### Public transit reference data (readable by everyone, including anon)
1. `routes` — Bus routes (e.g. "Route 7: Hubballi Bus Stand → Dharwad")
   - id (uuid PK), route_number (text, unique), name, origin, destination,
     type (ordinary/express/vajra/ac), color (hex for UI), duration_mins,
     frequency_mins, created_at
2. `stops` — Bus stops along routes
   - id (uuid PK), name, lat (numeric), lng (numeric), created_at
3. `route_stops` — Join table: ordered stops per route
   - id (uuid PK), route_id (FK routes), stop_id (FK stops),
     sequence (int), created_at
4. `buses` — Physical buses assigned to routes
   - id (uuid PK), plate (text, unique), route_id (FK routes),
     capacity (int), type, created_at
5. `live_positions` — Realtime GPS position of each bus
   - id (uuid PK), bus_id (FK buses), lat, lng, heading (numeric),
     speed (numeric), occupancy (low/medium/high/full), updated_at
6. `schedules` — Timetables: which bus arrives at which stop and when
   - id (uuid PK), route_id (FK routes), stop_id (FK stops),
     arrival_time (time), created_at
7. `fares` — Ticket fares between stop pairs on a route
   - id (uuid PK), route_id (FK routes), from_stop_id (FK stops),
     to_stop_id (FK stops), amount (numeric), created_at

### User-owned data (authenticated, owner-scoped)
8. `profiles` — Extended user profile (1:1 with auth.users)
   - id (uuid PK = auth.users.id), full_name, phone, wallet_balance
     (numeric, default 0), avatar_url, created_at, updated_at
9. `tickets` — Digital bus tickets purchased by users
   - id (uuid PK), user_id (uuid, DEFAULT auth.uid()),
     route_id (FK routes), from_stop_id (FK stops), to_stop_id (FK stops),
     amount (numeric), qr_data (text), status (active/used/expired/refunded),
     travel_date (date), created_at
10. `transactions` — Wallet & payment transaction history
    - id (uuid PK), user_id (uuid, DEFAULT auth.uid()),
      type (topup/ticket/refund), amount (numeric, positive = credit,
      negative = debit), reference (text), created_at

## Security (RLS)
- Public tables (routes, stops, route_stops, buses, live_positions,
  schedules, fares): SELECT only, TO anon + authenticated. No writes from
  the client (managed server-side or via seed data).
- User tables (profiles, tickets, transactions): full CRUD scoped to
  auth.uid() = user_id. Owner columns default to auth.uid() so inserts
  that omit user_id still satisfy WITH CHECK.

## Important Notes
1. All tables have RLS enabled.
2. Owner columns (user_id) use DEFAULT auth.uid() so client inserts work
   without explicitly passing user_id.
3. Public transit tables are read-only from the client — no INSERT/UPDATE/
   DELETE policies. They are managed via server-side tools or seed data.
4. The `profiles` table uses id = auth.users.id (1:1 relationship) rather
   than a separate user_id column, so policies check auth.uid() = id.
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- PUBLIC TRANSIT REFERENCE DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Routes
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_number text UNIQUE NOT NULL,
  name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  type text NOT NULL DEFAULT 'ordinary' CHECK (type IN ('ordinary', 'express', 'vajra', 'ac')),
  color text NOT NULL DEFAULT '#1565C0',
  duration_mins int NOT NULL DEFAULT 30,
  frequency_mins int NOT NULL DEFAULT 15,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_routes" ON routes;
CREATE POLICY "public_read_routes" ON routes FOR SELECT
  TO anon, authenticated USING (true);

-- Stops
CREATE TABLE IF NOT EXISTS stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_stops" ON stops;
CREATE POLICY "public_read_stops" ON stops FOR SELECT
  TO anon, authenticated USING (true);

-- Route-Stops join (ordered sequence)
CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, sequence),
  UNIQUE(route_id, stop_id)
);
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_route_stops" ON route_stops;
CREATE POLICY "public_read_route_stops" ON route_stops FOR SELECT
  TO anon, authenticated USING (true);

-- Buses
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text UNIQUE NOT NULL,
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  capacity int NOT NULL DEFAULT 50,
  type text NOT NULL DEFAULT 'ordinary' CHECK (type IN ('ordinary', 'express', 'vajra', 'ac')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_buses" ON buses;
CREATE POLICY "public_read_buses" ON buses FOR SELECT
  TO anon, authenticated USING (true);

-- Live Positions (realtime GPS)
CREATE TABLE IF NOT EXISTS live_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  heading numeric NOT NULL DEFAULT 0,
  speed numeric NOT NULL DEFAULT 0,
  occupancy text NOT NULL DEFAULT 'low' CHECK (occupancy IN ('low', 'medium', 'high', 'full')),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE live_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_live_positions" ON live_positions;
CREATE POLICY "public_read_live_positions" ON live_positions FOR SELECT
  TO anon, authenticated USING (true);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  arrival_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_schedules" ON schedules;
CREATE POLICY "public_read_schedules" ON schedules FOR SELECT
  TO anon, authenticated USING (true);

-- Fares
CREATE TABLE IF NOT EXISTS fares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  from_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  to_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, from_stop_id, to_stop_id)
);
ALTER TABLE fares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_fares" ON fares;
CREATE POLICY "public_read_fares" ON fares FOR SELECT
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- USER-OWNED DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  wallet_balance numeric NOT NULL DEFAULT 0,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  from_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  to_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  qr_data text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'refunded')),
  travel_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_tickets" ON tickets;
CREATE POLICY "select_own_tickets" ON tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tickets" ON tickets;
CREATE POLICY "insert_own_tickets" ON tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tickets" ON tickets;
CREATE POLICY "update_own_tickets" ON tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_tickets" ON tickets;
CREATE POLICY "delete_own_tickets" ON tickets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('topup', 'ticket', 'refund')),
  amount numeric NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop_id ON route_stops(stop_id);
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_live_positions_bus_id ON live_positions(bus_id);
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_stop_id ON schedules(stop_id);
CREATE INDEX IF NOT EXISTS idx_fares_route_id ON fares(route_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
