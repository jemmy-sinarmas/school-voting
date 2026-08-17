import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, ProgressBar, Snackbar, Text } from "react-native-paper";
import { AppTextInput as TextInput } from "../components/AppTextInput";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/types";
import { authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;
type Step = "request" | "verify" | "reset" | "done";
const STEP_PROGRESS: Record<Step, number> = { request: 0.25, verify: 0.5, reset: 0.75, done: 1 };

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function requestOtp() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("forgotPassword.requestError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setSubmitting(true);
    try {
      const { resetToken } = await authApi.verifyResetOtp(email, code);
      setResetToken(resetToken);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("forgotPassword.verifyError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("forgotPassword.resetError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t("forgotPassword.title")}
      </Text>
      <ProgressBar progress={STEP_PROGRESS[step]} style={styles.progress} />

      {step === "request" && (
        <>
          <TextInput mode="outlined" label={t("forgotPassword.emailLabel")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.field} />
          <Button mode="contained" onPress={requestOtp} loading={submitting} disabled={submitting} style={styles.button}>
            {t("forgotPassword.sendCode")}
          </Button>
        </>
      )}

      {step === "verify" && (
        <>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("forgotPassword.verifySubtitle", { email })}
          </Text>
          <TextInput mode="outlined" label={t("forgotPassword.codeLabel")} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={styles.field} />
          <Button mode="contained" onPress={verifyOtp} loading={submitting} disabled={submitting} style={styles.button}>
            {t("forgotPassword.verify")}
          </Button>
        </>
      )}

      {step === "reset" && (
        <>
          <TextInput mode="outlined" label={t("forgotPassword.newPasswordLabel")} value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.field} />
          <Button mode="contained" onPress={resetPassword} loading={submitting} disabled={submitting} style={styles.button}>
            {t("forgotPassword.setNewPassword")}
          </Button>
        </>
      )}

      {step === "done" && (
        <>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t("forgotPassword.done")}
          </Text>
          <Button mode="contained" onPress={() => navigation.replace("Login")} style={styles.button}>
            {t("forgotPassword.goToLogin")}
          </Button>
        </>
      )}

      <Button mode="text" onPress={() => navigation.replace("Login")}>
        {t("forgotPassword.backToLogin")}
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6f8", padding: 24, justifyContent: "center" },
  title: { fontWeight: "700", marginBottom: 16, textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: 16, color: "#5f6570" },
  progress: { marginBottom: 24, height: 6, borderRadius: 3 },
  field: { marginBottom: 14 },
  button: { marginVertical: 8, paddingVertical: 4 },
});
