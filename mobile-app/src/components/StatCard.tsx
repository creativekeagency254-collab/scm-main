import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

export function StatCard({
  label,
  value,
  accent = "#2563EB",
  soft = "#DBEAFE"
}: {
  label: string;
  value: string;
  accent?: string;
  soft?: string;
}) {
  return (
    <LinearGradient
      colors={["#FFFFFF", "#F8FAFC", soft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 96
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginBottom: 8
  },
  label: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  value: {
    marginTop: 8,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3
  }
});
