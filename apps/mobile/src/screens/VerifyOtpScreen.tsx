import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Snackbar, Text } from "react-native-paper";
import { AppTextInput as TextInput } from "../components/AppTextInput";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/types";
import { authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOtp">;

export function VerifyOtpScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onVerify() {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.verifyOtp(email, code);
      navigation.replace("Login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("verifyOtp.verifyError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    setError(null);
    try {
      await authApi.resendOtp(email);
      setInfo(t("verifyOtp.resendSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("verifyOtp.resendError"));
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t("verifyOtp.title")}
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        {t("verifyOtp.subtitle", { email })}
      </Text>
      <TextInput mode="outlined" label={t("verifyOtp.codeLabel")} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} style={styles.field} />
      <Button mode="contained" onPress={onVerify} loading={submitting} disabled={submitting} style={styles.button}>
        {t("verifyOtp.verify")}
      </Button>
      <Button mode="text" onPress={onResend}>
        {t("verifyOtp.resend")}
      </Button>
      <Snackbar visible={!!error || !!info} onDismiss={() => { setError(null); setInfo(null); }} duration={4000}>
        {error ?? info}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6f8", padding: 24, justifyContent: "center" },
  title: { fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { textAlign: "center", marginBottom: 24, color: "#5f6570" },
  field: { marginBottom: 14 },
  button: { marginVertical: 8, paddingVertical: 4 },
});
