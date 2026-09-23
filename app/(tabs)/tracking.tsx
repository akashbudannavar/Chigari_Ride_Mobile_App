import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Nested `(tabs)/tracking` route alias.
 * Ensures that any navigation targeting `/(tabs)/tracking` seamlessly forwards
 * to the canonical `/(tabs)/live` Tracking screen with all query parameters preserved.
 */
export default function TabsTrackingRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/(tabs)/live', params }} />;
}
