import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Route, Stop, RouteStop, Bus, LivePosition, Schedule, Fare, Ticket, Transaction, Profile } from '@/types/database';

export const FALLBACK_ROUTES: Route[] = [
  {
    id: 'route-brts-1',
    route_number: 'BRTS-1',
    name: 'CBT Hubballi ⇄ CBT Dharwad',
    origin: 'CBT Hubballi',
    destination: 'CBT Dharwad',
    type: 'brts',
    color: '#1565C0',
    duration_mins: 38,
    frequency_mins: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'route-brts-2',
    route_number: 'BRTS-2',
    name: 'Hubballi Rly Station ⇄ Dharwad New Bus Stand',
    origin: 'Hubballi Rly Station',
    destination: 'Dharwad New Bus Stand',
    type: 'brts',
    color: '#2E7D32',
    duration_mins: 42,
    frequency_mins: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'route-ac-1',
    route_number: 'AC-1',
    name: 'Airport ⇄ High Court Express',
    origin: 'Hubballi Airport',
    destination: 'High Court Dharwad',
    type: 'ac',
    color: '#0288D1',
    duration_mins: 45,
    frequency_mins: 15,
    created_at: new Date().toISOString(),
  },
  {
    id: 'route-exp-10',
    route_number: 'EXP-10',
    name: 'Old Bus Stand ⇄ Navanagar Circle',
    origin: 'Old Bus Stand Hubballi',
    destination: 'Navanagar Circle',
    type: 'express',
    color: '#E65100',
    duration_mins: 22,
    frequency_mins: 10,
    created_at: new Date().toISOString(),
  },
];

export const FALLBACK_POSITIONS: LivePosition[] = [
  {
    id: 'pos-1',
    bus_id: 'bus-1',
    lat: 15.3645,
    lng: 75.1298,
    heading: 325,
    speed: 38,
    occupancy: 'medium',
    updated_at: new Date().toISOString(),
    bus: {
      id: 'bus-1',
      plate: '200A',
      route_id: 'route-brts-1',
      capacity: 54,
      type: 'brts',
      created_at: new Date().toISOString(),
      route: FALLBACK_ROUTES[0],
    },
  },
  {
    id: 'pos-2',
    bus_id: 'bus-2',
    lat: 15.3582,
    lng: 75.1342,
    heading: 145,
    speed: 32,
    occupancy: 'low',
    updated_at: new Date().toISOString(),
    bus: {
      id: 'bus-2',
      plate: '201B',
      route_id: 'route-brts-2',
      capacity: 54,
      type: 'brts',
      created_at: new Date().toISOString(),
      route: FALLBACK_ROUTES[1],
    },
  },
];

// ─── Routes ──────────────────────────────────────────────────────────────────

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .order('route_number');
        if (error || !data || data.length === 0) {
          setRoutes(FALLBACK_ROUTES);
        } else {
          setRoutes(data);
        }
      } catch {
        setRoutes(FALLBACK_ROUTES);
      }
      setLoading(false);
    })();
  }, []);

  return { routes, loading, error };
}

// ─── Route Stops (ordered) ───────────────────────────────────────────────────

export function useRouteStops(routeId: string | null) {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeId) { setStops([]); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('route_stops')
          .select('*, stop:stops(*)')
          .eq('route_id', routeId)
          .order('sequence');
        setStops(data ?? []);
      } catch {
        setStops([]);
      }
      setLoading(false);
    })();
  }, [routeId]);

  return { stops, loading };
}

// ─── Live Positions ──────────────────────────────────────────────────────────

export function useLivePositions() {
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('live_positions')
          .select('*, bus:buses(*, route:routes(*))')
          .order('updated_at', { ascending: false });
        if (data && data.length > 0) {
          setPositions(data);
        } else {
          setPositions(FALLBACK_POSITIONS);
        }
      } catch {
        setPositions(FALLBACK_POSITIONS);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel('live_positions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_positions' }, () => {
        (async () => {
          try {
            const { data } = await supabase
              .from('live_positions')
              .select('*, bus:buses(*, route:routes(*))')
              .order('updated_at', { ascending: false });
            if (data && data.length > 0) setPositions(data);
          } catch {}
        })();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { positions, loading };
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useTickets(userId: string | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setTickets([]); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('tickets')
          .select('*, route:routes(*), from_stop:stops!from_stop_id(*), to_stop:stops!to_stop_id(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        setTickets(data ?? []);
      } catch {
        setTickets([]);
      }
      setLoading(false);
    })();
  }, [userId]);

  return { tickets, loading };
}

// ─── Transactions ────────────────────────────────────────────────────────────

export function useTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setTransactions([]); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        setTransactions(data ?? []);
      } catch {
        setTransactions([]);
      }
      setLoading(false);
    })();
  }, [userId]);

  return { transactions, loading };
}

// ─── Fares ───────────────────────────────────────────────────────────────────

export function useFares(routeId: string | null) {
  const [fares, setFares] = useState<Fare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeId) { setFares([]); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('fares')
          .select('*, from_stop:stops!from_stop_id(*), to_stop:stops!to_stop_id(*)')
          .eq('route_id', routeId);
        setFares(data ?? []);
      } catch {
        setFares([]);
      }
      setLoading(false);
    })();
  }, [routeId]);

  return { fares, loading };
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export function useSchedules(routeId: string | null) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeId) { setSchedules([]); setLoading(false); return; }

    (async () => {
      try {
        const { data } = await supabase
          .from('schedules')
          .select('*, stop:stops(*)')
          .eq('route_id', routeId)
          .order('arrival_time');
        setSchedules(data ?? []);
      } catch {
        setSchedules([]);
      }
      setLoading(false);
    })();
  }, [routeId]);

  return { schedules, loading };
}
