// App.tsx - CIPHERX AI boot: gateway init, then navigation.
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootNavigator } from './src/nav/RootNavigator';
import { initGateway } from './src/api/client';
import { COLORS } from './src/theme';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initGateway().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <RootNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  boot: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
});
