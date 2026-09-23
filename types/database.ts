// ─── Database Entity Types ───────────────────────────────────────────────────

export type RouteType = 'ordinary' | 'express' | 'vajra' | 'ac' | 'brts';
export type OccupancyLevel = 'low' | 'medium' | 'high' | 'full';
export type TicketStatus = 'active' | 'used' | 'expired' | 'refunded';
export type TransactionType = 'topup' | 'ticket' | 'refund';

export interface Route {
  id: string;
  route_number: string;
  name: string;
  origin: string;
  destination: string;
  type: RouteType;
  color: string;
  duration_mins: number;
  frequency_mins: number;
  created_at: string;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  sequence: number;
  created_at: string;
  stop?: Stop;
  route?: Route;
}

export interface Bus {
  id: string;
  plate: string;
  route_id: string | null;
  capacity: number;
  type: RouteType;
  created_at: string;
  route?: Route;
}

export interface LivePosition {
  id: string;
  bus_id: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  occupancy: OccupancyLevel;
  updated_at: string;
  bus?: Bus;
}

export interface Schedule {
  id: string;
  route_id: string;
  stop_id: string;
  arrival_time: string;
  created_at: string;
  stop?: Stop;
  route?: Route;
}

export interface Fare {
  id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  amount: number;
  created_at: string;
  from_stop?: Stop;
  to_stop?: Stop;
  route?: Route;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  wallet_balance: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  route_id: string;
  from_stop_id: string;
  to_stop_id: string;
  amount: number;
  qr_data: string | null;
  status: TicketStatus;
  travel_date: string;
  created_at: string;
  route?: Route;
  from_stop?: Stop;
  to_stop?: Stop;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  reference: string | null;
  created_at: string;
}

// ─── Composite Types for Joined Queries ──────────────────────────────────────

export interface RouteWithStops extends Route {
  route_stops: RouteStop[];
}

export interface BusWithPosition extends Bus {
  live_positions: LivePosition[];
}

export interface TicketWithDetails extends Ticket {
  route: Route;
  from_stop: Stop;
  to_stop: Stop;
}

// ─── Database Type Map (for Supabase generic typing) ──────────────────────────

export interface Database {
  public: {
    Tables: {
      routes: {
        Row: Route;
        Insert: Partial<Route>;
        Update: Partial<Route>;
      };
      stops: {
        Row: Stop;
        Insert: Partial<Stop>;
        Update: Partial<Stop>;
      };
      route_stops: {
        Row: RouteStop;
        Insert: Partial<RouteStop>;
        Update: Partial<RouteStop>;
      };
      buses: {
        Row: Bus;
        Insert: Partial<Bus>;
        Update: Partial<Bus>;
      };
      live_positions: {
        Row: LivePosition;
        Insert: Partial<LivePosition>;
        Update: Partial<LivePosition>;
      };
      schedules: {
        Row: Schedule;
        Insert: Partial<Schedule>;
        Update: Partial<Schedule>;
      };
      fares: {
        Row: Fare;
        Insert: Partial<Fare>;
        Update: Partial<Fare>;
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      tickets: {
        Row: Ticket;
        Insert: Partial<Ticket>;
        Update: Partial<Ticket>;
      };
      transactions: {
        Row: Transaction;
        Insert: Partial<Transaction>;
        Update: Partial<Transaction>;
      };
    };
  };
}
