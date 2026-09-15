import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Route, Stop, RouteStop, Bus, LivePosition, Schedule, Fare, Ticket, Transaction, Profile } from '@/types/database';

// ─── Routes ──────────────────────────────────────────────────────────────────

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('route_number');
      if (error) setError(error.message);
      else setRoutes(data ?? []);
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
      const { data } = await supabase
        .from('route_stops')
        .select('*, stop:stops(*)')
        .eq('route_id', routeId)
        .order('sequence');
      setStops(data ?? []);
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
      const { data } = await supabase
        .from('live_positions')
        .select('*, bus:buses(*, route:routes(*))')
        .order('updated_at', { ascending: false });
      setPositions(data ?? []);
      setLoading(false);
    })();

    const channel = supabase
      .channel('live_positions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_positions' }, () => {
        (async () => {
          const { data } = await supabase
            .from('live_positions')
            .select('*, bus:buses(*, route:routes(*))')
            .order('updated_at', { ascending: false });
          if (data) setPositions(data);
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
      const { data } = await supabase
        .from('tickets')
        .select('*, route:routes(*), from_stop:stops!from_stop_id(*), to_stop:stops!to_stop_id(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setTickets(data ?? []);
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
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setTransactions(data ?? []);
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
      const { data } = await supabase
        .from('fares')
        .select('*, from_stop:stops!from_stop_id(*), to_stop:stops!to_stop_id(*)')
        .eq('route_id', routeId);
      setFares(data ?? []);
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
      const { data } = await supabase
        .from('schedules')
        .select('*, stop:stops(*)')
        .eq('route_id', routeId)
        .order('arrival_time');
      setSchedules(data ?? []);
      setLoading(false);
    })();
  }, [routeId]);

  return { schedules, loading };
}
