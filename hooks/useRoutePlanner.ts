import { useState, useEffect, useCallback } from 'react';
import { Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BRTSStop } from '@/types/transit';
import {
  CHIGARI_STOPS,
  PlannedRoute,
  calculateCorridorRoute,
  findStopById,
  findStopByName,
} from '@/data/chigariStops';
import { useStopSearch } from './useStopSearch';

const STORAGE_KEY_LAST_ROUTE = '@chigari_last_route';

export function useRoutePlanner() {
  // Default demo stops: Hubballi CBT -> Dharwad BRTS Terminal
  const fromSearch = useStopSearch(CHIGARI_STOPS[0]); // Hubballi CBT
  const toSearch = useStopSearch(CHIGARI_STOPS[20]);  // Dharwad BRTS Terminal

  const [lastRoute, setLastRoute] = useState<PlannedRoute | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingLastRoute, setIsLoadingLastRoute] = useState(true);

  // Load persisted Last Route from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    async function loadLastRoute() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_LAST_ROUTE);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          const from = findStopById(parsed.fromStopId) || findStopByName(parsed.fromStopName);
          const to = findStopById(parsed.toStopId) || findStopByName(parsed.toStopName);

          if (from && to && from.id !== to.id) {
            const calculated = calculateCorridorRoute(from, to);
            setLastRoute(calculated);
          }
        }
      } catch (err) {
        console.log('[useRoutePlanner] Failed to load last route:', err);
      } finally {
        if (isMounted) setIsLoadingLastRoute(false);
      }
    }

    loadLastRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  // Swap From and To stops
  const swapStops = useCallback(() => {
    setErrorMessage(null);
    const prevFromStop = fromSearch.selectedStop;
    const prevToStop = toSearch.selectedStop;
    const prevFromQuery = fromSearch.query;
    const prevToQuery = toSearch.query;

    if (prevToStop) {
      fromSearch.setExplicitStop(prevToStop);
    } else {
      fromSearch.handleQueryChange(prevToQuery);
    }

    if (prevFromStop) {
      toSearch.setExplicitStop(prevFromStop);
    } else {
      toSearch.handleQueryChange(prevFromQuery);
    }
  }, [fromSearch, toSearch]);

  // Execute Route Search with full validation
  const searchRoute = useCallback(async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    // Resolve From stop (either from selectedStop or exact name match in query)
    const resolvedFrom =
      fromSearch.selectedStop ||
      findStopByName(fromSearch.query);

    // Resolve To stop
    const resolvedTo =
      toSearch.selectedStop ||
      findStopByName(toSearch.query);

    // Validation 1: From is empty
    if (!resolvedFrom) {
      setErrorMessage('Please select a starting stop');
      return null;
    }

    // Validation 2: To is empty
    if (!resolvedTo) {
      setErrorMessage('Please select a destination');
      return null;
    }

    // Validation 3: From and To are identical
    if (resolvedFrom.id === resolvedTo.id) {
      setErrorMessage('Please select different stops');
      return null;
    }

    // Update input fields to canonical stop names
    fromSearch.setExplicitStop(resolvedFrom);
    toSearch.setExplicitStop(resolvedTo);

    // Calculate real road-following route segment
    const calculated = calculateCorridorRoute(resolvedFrom, resolvedTo);
    setLastRoute(calculated);

    // Persist to AsyncStorage
    try {
      const payload = {
        fromStopId: resolvedFrom.id,
        fromStopName: resolvedFrom.name,
        toStopId: resolvedTo.id,
        toStopName: resolvedTo.name,
        distanceMeters: calculated.distanceMeters,
        durationMinutes: calculated.durationMinutes,
        fare: calculated.fare,
        searchedAt: calculated.searchedAt,
      };
      await AsyncStorage.setItem(STORAGE_KEY_LAST_ROUTE, JSON.stringify(payload));
    } catch (err) {
      console.log('[useRoutePlanner] Failed to save last route:', err);
    }

    return calculated;
  }, [fromSearch, toSearch]);

  return {
    fromSearch,
    toSearch,
    lastRoute,
    errorMessage,
    clearError: () => setErrorMessage(null),
    swapStops,
    searchRoute,
    isLoadingLastRoute,
  };
}
