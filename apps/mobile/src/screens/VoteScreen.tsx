import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Appbar, Avatar, Button, Divider, Icon, List, Snackbar, Text } from "react-native-paper";
import { CandidateSummary, ListStatus } from "@school-voting/shared";
import { AppStackParamList } from "../navigation/types";
import { browsingApi, votesApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Props = NativeStackScreenProps<AppStackParamList, "Vote">;
type ActiveListInfo = { id: string; name: string; electionYear: number; status: ListStatus };

export function VoteScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<ActiveListInfo | null>(null);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [myVoteIds, setMyVoteIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const activeResponse = await browsingApi.activeList();
      if (!activeResponse.list) {
        setActiveList(null);
        setCandidates([]);
        setMyVoteIds(new Set());
        return;
      }
      setActiveList(activeResponse.list);
      const [candidatesResponse, myVotes] = await Promise.all([
        browsingApi.candidatesForList(activeResponse.list.id),
        votesApi.mine(activeResponse.list.id),
      ]);
      setCandidates(candidatesResponse);
      setMyVoteIds(new Set(myVotes.candidateIds));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("vote.loadError"));
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

  const isVotingOpen = activeList?.status === ListStatus.ACTIVE;

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: colors.appBar }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#3a2a00" />
        <Appbar.Content
          title={activeList ? activeList.name : t("vote.title")}
          subtitle={activeList ? `${activeList.electionYear} · ${myVoteIds.size}/2 selected` : undefined}
          titleStyle={styles.appbarTitle}
        />
      </Appbar.Header>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !activeList ? (
        <View style={styles.emptyState}>
          <Avatar.Icon icon="vote-outline" size={72} style={{ backgroundColor: "#f0e2c0" }} color={colors.primary} />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {t("vote.noElectionTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            {t("vote.noElectionSubtitle")}
          </Text>
          <Button mode="contained" onPress={() => navigation.navigate("Winners")}>
            {t("vote.viewLastResults")}
          </Button>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={Divider}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            <Text variant="labelLarge" style={styles.listHeading}>
              {t("vote.candidatesListHeading")}
            </Text>
          }
          ListFooterComponent={
            !isVotingOpen ? (
              <Text variant="bodySmall" style={styles.closedNotice}>
                {t("vote.votingClosedNotice")}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.fullName}
              titleNumberOfLines={1}
              description={[item.programme, item.semester].filter(Boolean).join(" · ") || undefined}
              descriptionNumberOfLines={1}
              onPress={() => navigation.navigate("CandidateDetail", { candidateId: item.id, listId: activeList.id })}
              left={() =>
                item.photoPath ? (
                  <Avatar.Image size={44} source={{ uri: `${API_BASE}${item.photoPath}` }} style={styles.avatar} />
                ) : (
                  <Avatar.Text size={44} label={item.fullName.charAt(0)} style={styles.avatar} color="#fff" />
                )
              }
              right={() => (
                <View style={styles.trailing}>
                  {/* Always rendered so every row reserves the same width — only the color changes with vote state, never the layout. */}
                  <Icon source="check-circle" size={18} color={myVoteIds.has(item.id) ? colors.success : "transparent"} />
                  <Icon source="chevron-right" size={22} color={colors.textMuted} />
                </View>
              )}
            />
          )}
        />
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
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontWeight: "700", marginTop: 8, textAlign: "center" },
  emptySubtitle: { color: colors.textMuted, textAlign: "center", marginBottom: 12 },
  list: { backgroundColor: colors.surface },
  listHeading: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, color: colors.textMuted },
  avatar: { backgroundColor: colors.primary },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  closedNotice: { textAlign: "center", color: colors.textMuted, marginTop: 8, marginBottom: 16 },
});
