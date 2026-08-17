import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/auth/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ConfirmProvider } from "./src/components/ConfirmProvider";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { theme } from "./src/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <LanguageProvider>
          <ConfirmProvider>
            <AuthProvider>
              <RootNavigator />
              <StatusBar style="auto" />
            </AuthProvider>
          </ConfirmProvider>
        </LanguageProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
