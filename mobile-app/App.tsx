import "react-native-gesture-handler";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ReconnectingBanner } from "./src/components/ReconnectingBanner";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";

function BootScreen() {
  return (
    <View style={styles.bootRoot}>
      <ActivityIndicator size="large" color="#93C5FD" />
      <Text style={styles.bootText}>Connecting to live services...</Text>
    </View>
  );
}

function AppShell() {
  const { loading } = useAuth();
  const { reconnecting } = useNetworkStatus();

  if (loading) return <BootScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" />
      <ReconnectingBanner show={reconnecting} />
      <View style={styles.main}>
        <AppNavigator />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  main: { flex: 1 },
  bootRoot: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  bootText: { color: "#E2E8F0", fontSize: 13, fontWeight: "700" }
});
