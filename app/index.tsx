import React from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return <View style={styles.container} />;
  }

  // Strictly route: valid user/guest session ➔ /(tabs), otherwise ➔ /welcome
  if (user || isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
