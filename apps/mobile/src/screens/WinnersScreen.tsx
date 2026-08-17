import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Avatar, Card, Snackbar, Text } from "react-native-paper";
import { WinnerEntry } from "@school-voting/shared";
import { browsingApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

export function WinnersScreen() {
  const { t } = useLanguage();
  const [year, setYear] = useState<number | null>(null);
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await browsingApi.currentWinners();
      setYear(result.year);
      setWinners(result.winners);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("winners.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {winners.length === 0 ? (
        <View style={styles.center}>
          <Avatar.Icon icon="trophy-outline" size={64} style={{ backgroundColor: "#e4e6ea" }} color="#5f6570" />
          <Text variant="bodyMedium" style={styles.emptyText}>
            {t("winners.noResults")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={winners}
          keyExtractor={(w) => w.candidateId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text variant="headlineSmall" style={styles.header}>
              {t("winners.header", { year: year ?? "" })}
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={styles.row} mode="outlined">
              <Card.Title
                title={item.fullName}
                subtitle={item.candidateListName}
                left={(props) => <Avatar.Icon {...props} icon="trophy" style={{ backgroundColor: "#fff3cd" }} color="#b8860b" />}
              />
            </Card>
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
  container: { flex: 1, backgroundColor: "#f5f6f8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  emptyText: { color: "#5f6570", marginTop: 8 },
  list: { padding: 20 },
  header: { fontWeight: "700", marginBottom: 16 },
  row: { marginBottom: 10 },
});
