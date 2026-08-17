import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/lists");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
      <Paper component="form" onSubmit={onSubmit} elevation={0} sx={{ width: 360, p: 4, border: "1px solid #e5e7eb" }}>
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <HowToVoteIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h1" sx={{ fontSize: 20 }}>
            Admin Login
          </Typography>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Forgot your password? Ask a super admin to reset it.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
