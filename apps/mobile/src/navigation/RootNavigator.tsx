import { View } from "react-native";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator } from "react-native-paper";
import { AppStackParamList, AuthStackParamList } from "./types";
import { useAuth } from "../auth/AuthContext";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { VerifyOtpScreen } from "../screens/VerifyOtpScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { VoteScreen } from "../screens/VoteScreen";
import { CandidateDetailScreen } from "../screens/CandidateDetailScreen";
import { WinnersScreen } from "../screens/WinnersScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { useLanguage } from "../i18n/LanguageContext";
import { colors } from "../theme";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { t } = useLanguage();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.appBar },
        headerTintColor: "#3a2a00",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Vote" component={VoteScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="CandidateDetail" component={CandidateDetailScreen} options={{ title: t("candidateDetail.title") }} />
      <AppStack.Screen name="Winners" component={WinnersScreen} options={{ title: t("home.viewResults") }} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
    </AppStack.Navigator>
  );
}

export function RootNavigator() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>{student ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
}
