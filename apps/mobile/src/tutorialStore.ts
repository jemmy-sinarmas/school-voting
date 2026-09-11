import AsyncStorage from "@react-native-async-storage/async-storage";

// Non-sensitive first-run flag for the voting tutorial. Kept out of the token
// store on purpose (secure storage is for secrets only).
const TUTORIAL_SEEN_KEY = "tutorial.voting.seen";

export async function hasSeenVotingTutorial(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
  return value === "1";
}

export async function markVotingTutorialSeen(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, "1");
}
