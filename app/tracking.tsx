import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Top-level /tracking route alias.
 * Ensures that any navigation targeting `/tracking` (from URLs, deep links, or legacy calls)
 * seamlessly redirects to the canonical `/(tabs)/live` Tracking screen with all query parameters preserved,
 * permanently preventing Expo Router's +not-found ("Page Not Found") error.
 */
export default function TrackingRoute() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/(tabs)/live', params }} />;
}
