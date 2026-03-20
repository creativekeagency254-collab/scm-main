import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function ReconnectingBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color={colors.white} />
      <Text style={styles.text}>Reconnecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#1D4ED8",
    borderWidth: 1,
    borderColor: "#1E3A8A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  text: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3
  }
});
