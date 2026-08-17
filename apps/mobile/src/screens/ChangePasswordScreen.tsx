import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, Button, ProgressBar, Snackbar, Text } from "react-native-paper";
import { AppTextInput as TextInput } from "../components/AppTextInput";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "../navigation/types";
import { authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "ChangePassword">;
type Step = "request" | "verify" | "reset" | "done";
const STEP_PROGRESS: Record<Step, number> = { request: 0.25, verify: 0.5, reset: 0.75, done: 1 };

export function ChangePasswordScreen({ navigation }: Props) {
  const { student } = useAuth();
  const { t } = useLanguage();
  const email = student?.email ?? "";
  const [step, setStep] = useState<Step>("request");
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
      setError(err instanceof ApiError ? err.message : t("changePassword.requestError"));
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
      setError(err instanceof ApiError ? err.message : t("changePassword.verifyError"));
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
      setError(err instanceof ApiError ? err.message : t("changePassword.resetError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: colors.appBar }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#3a2a00" />
        <Appbar.Content title={t("changePassword.title")} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      <View style={styles.content}>
        <ProgressBar progress={STEP_PROGRESS[step]} style={styles.progress} />

        {step === "request" && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t("changePassword.subtitle", { email })}
            </Text>
            <Button mode="contained" onPress={requestOtp} loading={submitting} disabled={submitting} style={styles.button}>
              {t("changePassword.sendCode")}
            </Button>
          </>
        )}

        {step === "verify" && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t("forgotPassword.verifySubtitle", { email })}
            </Text>
            <TextInput mode="outlined" label={t("changePassword.codeLabel")} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={styles.field} />
            <Button mode="contained" onPress={verifyOtp} loading={submitting} disabled={submitting} style={styles.button}>
              {t("changePassword.verify")}
            </Button>
          </>
        )}

        {step === "reset" && (
          <>
            <TextInput mode="outlined" label={t("changePassword.newPasswordLabel")} value={newPassword} onChangeText={setNewPassword} secureTextEntry style={styles.field} />
            <Button mode="contained" onPress={resetPassword} loading={submitting} disabled={submitting} style={styles.button}>
              {t("changePassword.setNewPassword")}
            </Button>
          </>
        )}

        {step === "done" && (
          <>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t("changePassword.done")}
            </Text>
            <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
              {t("changePassword.backToSettings")}
            </Button>
          </>
        )}

        <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
          {error}
        </Snackbar>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appbarTitle: { fontWeight: "700" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  subtitle: { textAlign: "center", marginBottom: 16, color: colors.textMuted },
  progress: { marginBottom: 24, height: 6, borderRadius: 3 },
  field: { marginBottom: 14 },
  button: { marginVertical: 8, paddingVertical: 4 },
});
