/**
 * Supabase Edge Function: aggregate-observations (Stage 5B)
 *
 * Server-side aggregator converting anonymous passenger observations
 * into authoritative physical-bus live positions.
 *
 * Invariants:
 * - Server-side only: never called directly by passenger mobile clients.
 * - Concurrency protection: PostgreSQL transaction advisory lock (7429184).
 * - Writes strictly to public.live_positions.
 * - Anonymity: never joins or exposes auth.users, profiles, tickets, or session IDs.
 */

// @ts-ignore: Deno types are provided in the Supabase Edge runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { runAggregationPipeline, RawObservation, PhysicalBusRecord, LivePositionRecord, ADVISORY_LOCK_ID } from './aggregatorCore';

// @ts-ignore: Deno global is available in Edge Runtime
Deno.serve(async (req: Request) => {
  // Only accept POST / GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Initialize Supabase Admin Client
    // @ts-ignore: Deno.env available in Edge Runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    // @ts-ignore: Deno.env available in Edge Runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 2. Concurrency Protection: Try acquiring PostgreSQL advisory lock
    const { data: lockResult, error: lockError } = await supabase.rpc('pg_try_advisory_xact_lock', {
      key: ADVISORY_LOCK_ID,
    });

    // If lock RPC is not defined or returns false, handle gracefully
    if (lockResult === false) {
      console.log('[Aggregator] Another aggregation instance is currently active. Skipping.');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'concurrency_lock_held' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = Date.now();
    const windowStart = new Date(now - 60 * 1000).toISOString();

    // 3. Query Recent Observations (Snapshot Read without Table Locking)
    const { data: observations, error: obsError } = await supabase
      .from('passenger_observations')
      .select('id, session_id, service_number, lat, lng, accuracy, speed, heading, reported_fleet_number, observed_at')
      .gte('observed_at', windowStart)
      .order('observed_at', { ascending: false });

    if (obsError) {
      throw new Error(`Failed to query observations: ${obsError.message}`);
    }

    if (!observations || observations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          clusters: 0,
          updated: 0,
          message: 'No recent passenger observations within the 60s window',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Query Active Physical Buses & Previous Live Positions
    const { data: buses, error: busError } = await supabase
      .from('buses')
      .select('id, fleet_number, is_active')
      .eq('is_active', true);

    if (busError) {
      throw new Error(`Failed to query active buses: ${busError.message}`);
    }

    const { data: livePositions, error: livePosError } = await supabase
      .from('live_positions')
      .select('*');

    if (livePosError) {
      throw new Error(`Failed to query live positions: ${livePosError.message}`);
    }

    const livePositionsMap: Record<string, LivePositionRecord> = {};
    if (livePositions) {
      for (const pos of livePositions) {
        livePositionsMap[pos.bus_id] = pos as LivePositionRecord;
      }
    }

    // 5. Run Aggregation Pipeline
    const output = runAggregationPipeline(
      observations as RawObservation[],
      (buses || []) as PhysicalBusRecord[],
      livePositionsMap,
      now
    );

    // 6. Atomic Upsert of Updated Live Positions
    if (output.livePositionUpdates.length > 0) {
      const { error: upsertError } = await supabase
        .from('live_positions')
        .upsert(output.livePositionUpdates, { onConflict: 'bus_id' });

      if (upsertError) {
        throw new Error(`Failed to upsert live positions: ${upsertError.message}`);
      }
    }

    // 7. Log Unmatched Clusters (Without Corrupting buses Table)
    for (const unmatched of output.unmatchedClusters) {
      console.warn(
        `[Aggregator] Unmatched cluster on service ${unmatched.serviceNumber} at s=${unmatched.corridorDistance}m (${unmatched.activeContributors} contributors): ${unmatched.reason}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedObservations: output.processedCount,
        validObservations: output.validCount,
        clustersFound: output.clusterCount,
        livePositionsUpdated: output.livePositionUpdates.length,
        unmatchedClustersCount: output.unmatchedClusters.length,
        timestamp: new Date(now).toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Aggregator Error]', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
