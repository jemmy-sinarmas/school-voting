import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Appbar, Button, Divider, List, Snackbar, Text } from "react-native-paper";
import { StudentProfile } from "@school-voting/shared";
import { AppTextInput as TextInput } from "../components/AppTextInput";
import { AppStackParamList } from "../navigation/types";
import { authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.me();
      setProfile(result);
      setFullName(result.fullName);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onSave() {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const result = await authApi.updateMe(fullName);
      setProfile(result);
      setInfo(t("settings.profileUpdated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("settings.profileUpdateError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: colors.appBar }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#3a2a00" />
        <Appbar.Content title={t("settings.title")} titleStyle={styles.appbarTitle} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text variant="labelLarge" style={styles.sectionHeading}>
            {t("settings.profileSection")}
          </Text>
          <TextInput mode="outlined" label={t("settings.fullNameLabel")} value={fullName} onChangeText={setFullName} style={styles.field} />
          <TextInput mode="outlined" label={t("login.emailLabel")} value={profile?.email ?? ""} editable={false} style={styles.field} />
          <TextInput mode="outlined" label={t("home.studentId")} value={profile?.studentNumber ?? ""} editable={false} style={styles.field} />
          <Button mode="contained" onPress={onSave} loading={saving} disabled={saving || fullName === profile?.fullName} style={styles.saveButton}>
            {t("settings.saveChanges")}
          </Button>

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.sectionHeading}>
            {t("settings.help")}
          </Text>
          <List.Item
            title={t("settings.howToVote")}
            left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate("Tutorial")}
          />

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.sectionHeading}>
            {t("settings.security")}
          </Text>
          <List.Item
            title={t("settings.changePassword")}
            left={(props) => <List.Icon {...props} icon="lock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate("ChangePassword")}
          />

          <Divider style={styles.divider} />

          <Text variant="labelLarge" style={styles.sectionHeading}>
            {t("settings.language")}
          </Text>
          <List.Item
            title={t("settings.english")}
            left={(props) => <List.Icon {...props} icon={language === "en" ? "radiobox-marked" : "radiobox-blank"} />}
            onPress={() => setLanguage("en")}
          />
          <List.Item
            title={t("settings.bahasaMelayu")}
            left={(props) => <List.Icon {...props} icon={language === "bm" ? "radiobox-marked" : "radiobox-blank"} />}
            onPress={() => setLanguage("bm")}
          />
        </ScrollView>
      )}

      <Snackbar visible={!!error || !!info} onDismiss={() => { setError(null); setInfo(null); }} duration={3000}>
        {error ?? info}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appbarTitle: { fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16 },
  sectionHeading: { color: colors.textMuted, marginBottom: 8 },
  field: { marginBottom: 12 },
  saveButton: { marginTop: 4 },
  divider: { marginVertical: 20 },
});
