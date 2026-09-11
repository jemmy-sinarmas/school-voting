import { NavLink, Outlet } from "react-router-dom";
import { AppBar, Avatar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { useAuth } from "../auth/AuthContext";

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? "#2f5fe0" : "#5f6570",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
});

export function Layout() {
  const { admin, logout } = useAuth();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="inherit">
        <Toolbar sx={{ gap: 3 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <HowToVoteIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              School Voting
            </Typography>
          </Stack>
          <Stack direction="row" gap={3} sx={{ flex: 1 }}>
            <NavLink to="/lists" style={navLinkStyle}>
              Lists
            </NavLink>
            <NavLink to="/students" style={navLinkStyle}>
              Students
            </NavLink>
            <NavLink to="/admins" style={navLinkStyle}>
              Admins
            </NavLink>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 14, bgcolor: "primary.main" }}>
              {admin?.email.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {admin?.email}
            </Typography>
            <Button size="small" onClick={logout} color="inherit" variant="outlined">
              Log out
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
