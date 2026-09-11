import { useCallback, useMemo, useState } from "react";
import { RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Appbar, Avatar, Button, Divider, Icon, List, Snackbar, Text } from "react-native-paper";
import { CandidateSummary, ListStatus, RoleWithCandidates } from "@school-voting/shared";
import { AppStackParamList } from "../navigation/types";
import { browsingApi, votesApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Props = NativeStackScreenProps<AppStackParamList, "Vote">;
type ActiveListInfo = { id: string; name: string; electionYear: number; status: ListStatus };
type RoleSection = { roleId: string; title: string; data: CandidateSummary[] };

export function VoteScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<ActiveListInfo | null>(null);
  const [roleGroups, setRoleGroups] = useState<RoleWithCandidates[]>([]);
  const [myVoteIds, setMyVoteIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const activeResponse = await browsingApi.activeList();
        if (!activeResponse.list) {
          setActiveList(null);
          setRoleGroups([]);
          setMyVoteIds(new Set());
          return;
        }
        setActiveList(activeResponse.list);
        const [roles, myVotes] = await Promise.all([
          browsingApi.rolesForList(activeResponse.list.id),
          votesApi.mine(activeResponse.list.id),
        ]);
        setRoleGroups(roles);
        setMyVoteIds(new Set(myVotes.candidateIds));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t("vote.loadError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isVotingOpen = activeList?.status === ListStatus.ACTIVE;

  const sections = useMemo<RoleSection[]>(
    () =>
      roleGroups.map((group) => ({
        roleId: group.role.id,
        title: group.role.name,
        data: group.candidates,
      })),
    [roleGroups],
  );

  // How many roles the student has cast a vote in (a role counts as "voted"
  // if any of its candidates is in myVoteIds).
  const rolesVotedCount = useMemo(
    () => roleGroups.filter((group) => group.candidates.some((c) => myVoteIds.has(c.id))).length,
    [roleGroups, myVoteIds],
  );

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={{ backgroundColor: colors.appBar }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="#3a2a00" />
        <Appbar.Content
          title={activeList ? activeList.name : t("vote.title")}
          subtitle={
            activeList
              ? `${activeList.electionYear} · ${t("vote.rolesVoted", { voted: rolesVotedCount, total: roleGroups.length })}`
              : undefined
          }
          titleStyle={styles.appbarTitle}
        />
        <Appbar.Action icon="help-circle-outline" onPress={() => navigation.navigate("Tutorial")} color="#3a2a00" />
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            <Text variant="bodySmall" style={styles.instructions}>
              {t("vote.oneCandidatePerRole")}
            </Text>
          }
          renderSectionHeader={({ section }) => {
            const votedInRole = section.data.some((c) => myVoteIds.has(c.id));
            return (
              <View style={styles.sectionHeader}>
                <Text variant="labelLarge" style={styles.sectionTitle}>
                  {section.title}
                </Text>
                {votedInRole && (
                  <View style={styles.votedBadge}>
                    <Icon source="check-circle" size={14} color={colors.success} />
                    <Text style={styles.votedBadgeText}>{t("vote.roleVotedBadge")}</Text>
                  </View>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <List.Item
              title={item.fullName}
              titleNumberOfLines={1}
              description={[item.programme, item.semester].filter(Boolean).join(" · ") || undefined}
              descriptionNumberOfLines={1}
              onPress={() =>
                navigation.navigate("CandidateDetail", { candidateId: item.id, listId: activeList.id, roleId: item.roleId })
              }
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
          ListFooterComponent={
            !isVotingOpen ? (
              <Text variant="bodySmall" style={styles.closedNotice}>
                {t("vote.votingClosedNotice")}
              </Text>
            ) : null
          }
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
  list: { backgroundColor: colors.surface, paddingBottom: 16 },
  instructions: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, color: colors.textMuted },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
    backgroundColor: colors.bg,
  },
  sectionTitle: { color: "#1a1d21", fontWeight: "700" },
  votedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  votedBadgeText: { color: colors.success, fontSize: 12, fontWeight: "600" },
  avatar: { backgroundColor: colors.primary },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  closedNotice: { textAlign: "center", color: colors.textMuted, marginTop: 8, marginBottom: 16 },
});
