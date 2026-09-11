import { useCallback, useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Avatar, Button, Divider, Icon, Snackbar, Text } from "react-native-paper";
import { CandidateDetail } from "@school-voting/shared";
import { AppStackParamList } from "../navigation/types";
import { browsingApi, votesApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useConfirm } from "../components/ConfirmProvider";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

type Props = NativeStackScreenProps<AppStackParamList, "CandidateDetail">;

export function CandidateDetailScreen({ route }: Props) {
  const { candidateId, listId } = route.params;
  const confirm = useConfirm();
  const { t } = useLanguage();
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  // If the student already voted for a DIFFERENT candidate in this same role,
  // we offer a "switch vote" action instead of a plain vote (one vote per role).
  const [otherVotedInRole, setOtherVotedInRole] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posterExpanded, setPosterExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, myVotes, roleGroups] = await Promise.all([
        browsingApi.candidateDetail(candidateId),
        votesApi.mine(listId),
        browsingApi.rolesForList(listId),
      ]);
      setCandidate(detail);
      const votedSet = new Set(myVotes.candidateIds);
      setHasVoted(votedSet.has(candidateId));

      // Find a candidate in the same role that the student already voted for.
      const roleGroup = roleGroups.find((g) => g.role.id === detail.roleId);
      const other = roleGroup?.candidates.find((c) => c.id !== candidateId && votedSet.has(c.id));
      setOtherVotedInRole(other ? { id: other.id, name: other.fullName } : null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("candidateDetail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [candidateId, listId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onVotePress() {
    if (!candidate) return;
    const ok = await confirm({
      title: t("candidateDetail.voteConfirmTitle"),
      description: t("candidateDetail.voteConfirmDesc", { name: candidate.fullName }),
      confirmLabel: t("candidateDetail.voteConfirmLabel"),
    });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await votesApi.vote(candidateId);
      setHasVoted(true);
      setOtherVotedInRole(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("candidateDetail.voteError"));
    } finally {
      setSubmitting(false);
    }
  }

  // Switch the student's vote within this role: remove the existing vote for
  // the other candidate, then vote for this one. Both calls are per-role safe
  // on the server; doing it client-side keeps the flow simple (KISS).
  async function onSwitchVotePress() {
    if (!candidate || !otherVotedInRole) return;
    const ok = await confirm({
      title: t("candidateDetail.switchConfirmTitle"),
      description: t("candidateDetail.switchConfirmDesc", { current: otherVotedInRole.name, name: candidate.fullName }),
      confirmLabel: t("candidateDetail.switchConfirmLabel"),
    });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await votesApi.unvote(otherVotedInRole.id);
      await votesApi.vote(candidateId);
      setHasVoted(true);
      setOtherVotedInRole(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("candidateDetail.voteError"));
      // Refresh so the UI reflects the true server state if the switch half-failed.
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onUnvotePress() {
    if (!candidate) return;
    const ok = await confirm({
      title: t("candidateDetail.unvoteConfirmTitle"),
      description: t("candidateDetail.unvoteConfirmDesc", { name: candidate.fullName }),
      confirmLabel: t("candidateDetail.unvoteConfirmLabel"),
      destructive: true,
    });
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await votesApi.unvote(candidateId);
      setHasVoted(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("candidateDetail.unvoteError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !candidate) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const posterUri = candidate.posterPath ? `${API_BASE}${candidate.posterPath}` : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {candidate.photoPath ? (
          <Avatar.Image size={140} source={{ uri: `${API_BASE}${candidate.photoPath}` }} style={styles.hero} />
        ) : (
          <Avatar.Text size={140} label={candidate.fullName.charAt(0)} style={[styles.hero, { backgroundColor: colors.primary }]} color="#fff" />
        )}

        <Text variant="headlineSmall" style={styles.name}>
          {candidate.fullName}
        </Text>

        {(candidate.programme || candidate.semester) && (
          <View style={styles.infoBlock}>
            {candidate.programme && <InfoRow label={t("candidateDetail.course")} value={candidate.programme} />}
            {candidate.semester && <InfoRow label={t("candidateDetail.semester")} value={candidate.semester} />}
          </View>
        )}

        {(candidate.instagram || candidate.phoneNumber || posterUri) && (
          <View style={styles.contactRow}>
            {candidate.instagram && (
              <Pressable
                style={styles.contactChip}
                onPress={() => Linking.openURL(`https://instagram.com/${candidate.instagram!.replace(/^@/, "")}`)}
              >
                <Icon source="instagram" size={16} color={colors.primary} />
                <Text style={styles.contactChipText}>{candidate.instagram}</Text>
              </Pressable>
            )}
            {candidate.phoneNumber && (
              <Pressable style={styles.contactChip} onPress={() => Linking.openURL(`tel:${candidate.phoneNumber}`)}>
                <Icon source="phone" size={16} color={colors.primary} />
                <Text style={styles.contactChipText}>{candidate.phoneNumber}</Text>
              </Pressable>
            )}
            {posterUri && (
              <Pressable style={styles.posterThumbWrap} onPress={() => setPosterExpanded(true)}>
                <Image source={{ uri: posterUri }} style={styles.posterThumb} resizeMode="cover" />
                <View style={styles.posterThumbBadge}>
                  <Icon source="arrow-expand" size={12} color="#fff" />
                </View>
              </Pressable>
            )}
          </View>
        )}
        {posterUri && (
          <Text variant="bodySmall" style={styles.posterCaption}>
            {t("candidateDetail.tapToExpand")}
          </Text>
        )}

        {candidate.videoUrl && (
          <Button
            mode="outlined"
            icon="youtube"
            onPress={() => Linking.openURL(candidate.videoUrl!)}
            style={styles.videoButton}
          >
            {t("candidateDetail.watchYoutube")}
          </Button>
        )}

        <Section title={t("candidateDetail.summary")} content={candidate.executiveSummary} />
        <Section title={t("candidateDetail.whyVoteForMe")} content={candidate.whyVoteForMe} />
        <Section title={t("candidateDetail.vision")} content={candidate.vision} />
        <Section title={t("candidateDetail.mission")} content={candidate.mission} />
        <Section title={t("candidateDetail.about")} content={candidate.description} />
      </ScrollView>

      <View style={styles.actions}>
        {hasVoted ? (
          <Button mode="contained-tonal" icon="close-circle-outline" onPress={onUnvotePress} loading={submitting} disabled={submitting}>
            {t("candidateDetail.unvote")}
          </Button>
        ) : otherVotedInRole ? (
          <>
            <Text variant="bodySmall" style={styles.roleNotice}>
              {t("candidateDetail.alreadyVotedRole")}
            </Text>
            <Button mode="contained" icon="swap-horizontal" onPress={onSwitchVotePress} loading={submitting} disabled={submitting}>
              {t("candidateDetail.switchVote")}
            </Button>
          </>
        ) : (
          <Button mode="contained" icon="check-circle-outline" onPress={onVotePress} loading={submitting} disabled={submitting}>
            {t("candidateDetail.vote")}
          </Button>
        )}
      </View>

      <Modal visible={posterExpanded} transparent animationType="fade" onRequestClose={() => setPosterExpanded(false)}>
        <Pressable style={styles.lightbox} onPress={() => setPosterExpanded(false)}>
          {posterUri && <Image source={{ uri: posterUri }} style={styles.lightboxImage} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={4000}>
        {error}
      </Snackbar>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content) return null;
  return (
    <View style={styles.section}>
      <Divider style={styles.divider} />
      <Text variant="labelLarge" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Text>
      <Text variant="bodyMedium" style={styles.sectionBody}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 24, alignItems: "center" },
  hero: { marginBottom: 16 },
  name: { fontWeight: "700", marginBottom: 12 },
  infoBlock: { alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8, marginBottom: 12 },
  infoRow: { flexDirection: "row", gap: 8 },
  infoLabel: { color: colors.primary, fontWeight: "700", width: 80 },
  infoValue: { flex: 1, color: "#1a1d21" },
  contactRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, alignSelf: "stretch", marginBottom: 4 },
  contactChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  contactChipText: { fontSize: 13, color: "#1a1d21" },
  posterThumbWrap: { width: 44, height: 44, borderRadius: 8, overflow: "hidden" },
  posterThumb: { width: "100%", height: "100%" },
  posterThumbBadge: { position: "absolute", right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", borderTopLeftRadius: 6, padding: 2 },
  posterCaption: { alignSelf: "flex-end", color: colors.textMuted, marginBottom: 12 },
  videoButton: { marginBottom: 12, alignSelf: "stretch" },
  section: { alignSelf: "stretch", marginTop: 10 },
  divider: { marginBottom: 12 },
  sectionTitle: { color: colors.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  sectionBody: { lineHeight: 21 },
  actions: { padding: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: colors.surface, gap: 8 },
  roleNotice: { color: colors.textMuted, textAlign: "center" },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  lightboxImage: { width: "100%", height: "80%" },
});
