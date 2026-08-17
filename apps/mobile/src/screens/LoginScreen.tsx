import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button as PaperButton, Snackbar, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/types";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logoBox}>
            <Image source={require("../../assets/unikl-seal.png")} style={styles.seal} resizeMode="contain" />
            <Image source={require("../../assets/unikl-wordmark.png")} style={styles.wordmark} resizeMode="contain" />
          </View>

          <Text variant="titleLarge" style={styles.title}>
            {t("login.title")}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("login.subtitle")}
          </Text>

          <Text style={styles.fieldLabel}>{t("login.emailLabel")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("login.emailPlaceholder")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>{t("login.passwordLabel")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
          />

          <Pressable onPress={onSubmit} disabled={submitting} style={styles.buttonWrap}>
            <LinearGradient
              colors={[colors.primary, "#2f5fe0"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.gradient}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("login.submit")}</Text>}
            </LinearGradient>
          </Pressable>

          <PaperButton mode="text" textColor={colors.link} onPress={() => navigation.navigate("ForgotPassword")}>
            {t("login.forgotPassword")}
          </PaperButton>
          <PaperButton mode="text" onPress={() => navigation.navigate("Register")}>
            {t("login.createAccount")}
          </PaperButton>
        </View>
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  logoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  seal: { width: 44, height: 48 },
  wordmark: { width: 88, height: 26 },
  title: { fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", color: colors.textMuted, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#3a3a3a", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e2e2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: "#1a1d21",
  },
  buttonWrap: { marginTop: 20, borderRadius: 10, overflow: "hidden" },
  gradient: { paddingVertical: 13, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
