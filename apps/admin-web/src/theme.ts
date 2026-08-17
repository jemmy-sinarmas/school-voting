import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2f5fe0" },
    secondary: { main: "#7c4dff" },
    success: { main: "#1f9d55" },
    error: { main: "#c0392b" },
    background: { default: "#f5f6f8", paper: "#ffffff" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700 },
    h2: { fontSize: "1.25rem", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: "none", borderBottom: "1px solid #e5e7eb" } },
    },
    MuiCard: {
      styleOverrides: { root: { border: "1px solid #e5e7eb" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});
