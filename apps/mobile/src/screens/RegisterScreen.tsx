import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { AppTextInput as TextInput } from "../components/AppTextInput";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/types";
import { authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register(email, studentNumber, fullName, password);
      navigation.replace("VerifyOtp", { email });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("register.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("register.title")}
        </Text>
        <TextInput
          mode="outlined"
          label={t("register.emailLabel")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.field}
        />
        <TextInput
          mode="outlined"
          label={t("register.studentNumberLabel")}
          value={studentNumber}
          onChangeText={setStudentNumber}
          autoCapitalize="characters"
          style={styles.field}
        />
        <TextInput mode="outlined" label={t("register.fullNameLabel")} value={fullName} onChangeText={setFullName} style={styles.field} />
        <TextInput mode="outlined" label={t("register.passwordLabel")} value={password} onChangeText={setPassword} secureTextEntry style={styles.field} />
        <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting} style={styles.button}>
          {t("register.submit")}
        </Button>
      </ScrollView>
      <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6f8" },
  scroll: { padding: 24, paddingTop: 60 },
  title: { fontWeight: "700", marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 14 },
  button: { marginTop: 8, paddingVertical: 4 },
});
