import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Appbar, Avatar, Button, Card, Snackbar, Text } from "react-native-paper";
import { StudentProfile } from "@school-voting/shared";
import { AppStackParamList } from "../navigation/types";
import { browsingApi, authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;
type ActiveListInfo = { name: string; votingEndAt: string | null } | null;

export function HomeScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [activeList, setActiveList] = useState<ActiveListInfo>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [profileResponse, activeResponse] = await Promise.all([authApi.me(), browsingApi.activeList()]);
      setProfile(profileResponse);
      setActiveList(activeResponse.list ? { name: activeResponse.list.name, votingEndAt: activeResponse.list.votingEndAt } : null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("home.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: colors.appBar }}>
        <Appbar.Content title={t("login.title")} titleStyle={styles.appbarTitle} />
        <Appbar.Action icon="logout" onPress={logout} color="#3a2a00" />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        >
          {profile && (
            <Card style={styles.card} elevation={0}>
              <Card.Content style={styles.profileRow}>
                <Avatar.Text size={48} label={profile.fullName.charAt(0)} style={{ backgroundColor: colors.primary }} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.greeting}>
                    {t("home.greeting", { name: profile.fullName })}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {t("home.studentId")}: {profile.studentNumber}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {t("home.email")}: {profile.email}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.card} elevation={0}>
            <Card.Content>
              {activeList ? (
                <>
                  <Text variant="titleMedium" style={styles.sessionTitle}>
                    {t("home.electionOpenTitle", { name: activeList.name })}
                  </Text>
                  {activeList.votingEndAt && (
                    <Text variant="bodySmall" style={styles.muted}>
                      {t("home.electionOpenSubtitle", { date: new Date(activeList.votingEndAt).toLocaleString() })}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text variant="titleMedium" style={styles.sessionTitle}>
                    {t("home.noElectionTitle")}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {t("home.noElectionSubtitle")}
                  </Text>
                </>
              )}
              <Button mode="contained" style={styles.menuButton} onPress={() => navigation.navigate("Vote")}>
                {t("home.goToVote")}
              </Button>
            </Card.Content>
          </Card>

          <Button mode="outlined" icon="trophy-outline" style={styles.menuButton} onPress={() => navigation.navigate("Winners")}>
            {t("home.viewResults")}
          </Button>
          <Button mode="outlined" icon="cog-outline" style={styles.menuButton} onPress={() => navigation.navigate("Settings")}>
            {t("home.settings")}
          </Button>
        </ScrollView>
      )}

      <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  appbarTitle: { fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 12 },
  card: { marginBottom: 12, backgroundColor: colors.surface },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontWeight: "700" },
  muted: { color: colors.textMuted, marginTop: 2 },
  sessionTitle: { fontWeight: "700", marginBottom: 4 },
  menuButton: { marginTop: 12 },
});
