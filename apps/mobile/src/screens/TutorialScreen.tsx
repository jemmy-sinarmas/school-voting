import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Avatar, Button, Text } from "react-native-paper";
import { AppStackParamList } from "../navigation/types";
import { useLanguage } from "../i18n/LanguageContext";
import { markVotingTutorialSeen } from "../tutorialStore";
import { colors } from "../theme";
import { TranslationKey } from "../i18n/strings";

type Props = NativeStackScreenProps<AppStackParamList, "Tutorial">;

interface Step {
  icon: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const STEPS: Step[] = [
  { icon: "hand-wave-outline", titleKey: "tutorial.step1Title", bodyKey: "tutorial.step1Body" },
  { icon: "account-group-outline", titleKey: "tutorial.step2Title", bodyKey: "tutorial.step2Body" },
  { icon: "gesture-tap", titleKey: "tutorial.step3Title", bodyKey: "tutorial.step3Body" },
  { icon: "trophy-outline", titleKey: "tutorial.step4Title", bodyKey: "tutorial.step4Body" },
];

export function TutorialScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  async function finish() {
    await markVotingTutorialSeen();
    // Replace so pressing back doesn't return to the tutorial.
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Button compact onPress={finish} textColor={colors.textMuted}>
          {t("tutorial.skip")}
        </Button>
      </View>

      <View style={styles.content}>
        <Avatar.Icon icon={step.icon} size={96} style={styles.icon} color="#fff" />
        <Text variant="headlineSmall" style={styles.title}>
          {t(step.titleKey)}
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          {t(step.bodyKey)}
        </Text>
      </View>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          mode="text"
          disabled={index === 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
          textColor={colors.textMuted}
        >
          {t("tutorial.back")}
        </Button>
        {isLast ? (
          <Button mode="contained" onPress={finish}>
            {t("tutorial.done")}
          </Button>
        ) : (
          <Button mode="contained" onPress={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}>
            {t("tutorial.next")}
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  topBar: { flexDirection: "row", justifyContent: "flex-end" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  icon: { backgroundColor: colors.primary },
  title: { fontWeight: "700", textAlign: "center" },
  body: { textAlign: "center", color: "#1a1d21", lineHeight: 22, paddingHorizontal: 8 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#d8d2c0" },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
