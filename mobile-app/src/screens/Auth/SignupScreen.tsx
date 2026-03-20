import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";

export function SignupScreen({ navigation }: { navigation: any }) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setError("");
    setInfo("");
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUp({
        fullName,
        phone,
        email: email.trim(),
        password
      });
      setInfo("Account created. Check email if verification is enabled.");
      setTimeout(() => navigation.navigate("Login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={["#030712", "#0B1220", "#1E3A8A"]} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrap}
      >
        <View style={styles.card}>
          <Text style={styles.kicker}>CREATE ACCOUNT</Text>
          <Text style={styles.title}>Sign Up</Text>
          <Text style={styles.sub}>Create your account to start live earnings tracking.</Text>

          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#94A3B8"
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="Phone (optional)"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable onPress={submit} style={styles.primary} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkBtn}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { flex: 1, justifyContent: "center", padding: 18 },
  card: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 20
  },
  kicker: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  title: {
    marginTop: 8,
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  sub: { marginTop: 6, color: "#64748B", fontSize: 13, fontWeight: "600" },
  input: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: 14
  },
  primary: {
    marginTop: 16,
    borderRadius: 11,
    backgroundColor: "#0B63F6",
    borderWidth: 2,
    borderColor: "#0A3FA5",
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  linkBtn: { marginTop: 12, alignItems: "center" },
  linkText: { color: "#1E40AF", fontSize: 12, fontWeight: "800" },
  error: { marginTop: 8, color: "#DC2626", fontSize: 12, fontWeight: "700" },
  info: { marginTop: 8, color: "#065F46", fontSize: 12, fontWeight: "700" }
});
