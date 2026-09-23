import { useState, useCallback, useMemo } from 'react';
import { Keyboard } from 'react-native';
import type { BRTSStop } from '@/types/transit';
import { searchChigariStops } from '@/data/chigariStops';

export function useStopSearch(initialStop?: BRTSStop | null) {
  const [query, setQuery] = useState(initialStop ? initialStop.name : '');
  const [selectedStop, setSelectedStop] = useState<BRTSStop | null>(initialStop ?? null);
  const [isOpen, setIsOpen] = useState(false);

  // Suggestions computed dynamically based on current query
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    // If the query exactly matches the currently selected stop name, don't show dropdown
    if (selectedStop && selectedStop.name.toLowerCase() === query.trim().toLowerCase()) {
      return [];
    }
    return searchChigariStops(query);
  }, [query, selectedStop]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setSelectedStop(null);
    setIsOpen(text.trim().length > 0);
  }, []);

  const selectStop = useCallback((stop: BRTSStop) => {
    setSelectedStop(stop);
    setQuery(stop.name);
    setIsOpen(false);
    Keyboard.dismiss();
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setSelectedStop(null);
    setIsOpen(false);
  }, []);

  const setExplicitStop = useCallback((stop: BRTSStop | null) => {
    setSelectedStop(stop);
    setQuery(stop ? stop.name : '');
    setIsOpen(false);
  }, []);

  return {
    query,
    selectedStop,
    suggestions,
    isOpen: isOpen && suggestions.length > 0,
    setIsOpen,
    handleQueryChange,
    selectStop,
    clear,
    setExplicitStop,
  };
}
