import { MD3LightTheme } from "react-native-paper";

// UniKL MIIT E-Voting prototype palette: amber/orange accents on a warm cream background.
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#f5941f",
    secondary: "#ffc107",
    error: "#c0392b",
    background: "#fdf6e3",
    surface: "#ffffff",
  },
};

// Kept for any spots that still want a flat color reference outside the theme.
export const colors = {
  bg: theme.colors.background,
  surface: theme.colors.surface,
  primary: theme.colors.primary,
  appBar: theme.colors.secondary,
  danger: theme.colors.error,
  success: "#1f9d55",
  textMuted: "#5f6570",
  link: "#e0533d",
};
