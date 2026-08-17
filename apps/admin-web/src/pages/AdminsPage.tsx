import { FormEvent, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockResetIcon from "@mui/icons-material/LockReset";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { useSnackbar } from "notistack";
import { AdminRole } from "@school-voting/shared";
import { useAuth } from "../auth/AuthContext";
import { adminsApi } from "../api/endpoints";
import { Admin } from "../api/types";
import { ApiError } from "../api/client";
import { useConfirm } from "../components/ConfirmProvider";

export function AdminsPage() {
  const { isSuperAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);

  async function refresh() {
    try {
      setAdmins(await adminsApi.list());
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load admins", { variant: "error" });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(admin: Admin) {
    const ok = await confirm({
      title: `Delete ${admin.fullName}?`,
      description: `This removes ${admin.email} immediately and cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminsApi.remove(admin.id);
      enqueueSnackbar("Admin deleted", { variant: "success" });
      await refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to delete admin", { variant: "error" });
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h1">Admins</Typography>
        {isSuperAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
            Add admin
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Admin</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              {isSuperAdmin && <TableCell align="right"></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: "primary.light" }}>
                      {admin.fullName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {admin.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {admin.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  {admin.role === AdminRole.SUPER_ADMIN ? (
                    <Chip icon={<VerifiedUserIcon />} label="Super Admin" size="small" color="secondary" variant="outlined" />
                  ) : (
                    <Chip label="Admin" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={admin.status} size="small" color={admin.status === "active" ? "success" : "default"} variant="outlined" />
                </TableCell>
                {isSuperAdmin && (
                  <TableCell align="right">
                    <Tooltip title="Reset password">
                      <IconButton onClick={() => setResetTarget(admin)}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {admin.role !== AdminRole.SUPER_ADMIN && (
                      <Tooltip title="Delete admin">
                        <IconButton color="error" onClick={() => handleDelete(admin)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CreateAdminDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          enqueueSnackbar("Admin created", { variant: "success" });
          refresh();
        }}
      />

      <ResetPasswordDialog
        admin={resetTarget}
        onClose={() => setResetTarget(null)}
        onReset={() => {
          setResetTarget(null);
          enqueueSnackbar("Password reset", { variant: "success" });
        }}
      />
    </Box>
  );
}

function ResetPasswordDialog({
  admin,
  onClose,
  onReset,
}: {
  admin: Admin | null;
  onClose: () => void;
  onReset: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (admin) {
      setNewPassword("");
      setError(null);
    }
  }, [admin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!admin) return;
    setError(null);
    setSubmitting(true);
    try {
      await adminsApi.resetPassword(admin.id, newPassword);
      onReset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!admin} onClose={onClose} maxWidth="xs" fullWidth component="form" onSubmit={onSubmit}>
      <DialogTitle>Reset password for {admin?.fullName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoFocus
            helperText={`${admin?.fullName} should change this on next login.`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          Reset
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateAdminDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminsApi.create({ email, fullName, temporaryPassword });
      setEmail("");
      setFullName("");
      setTemporaryPassword("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth component="form" onSubmit={onSubmit}>
      <DialogTitle>Add admin</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <TextField
            label="Temporary password"
            type="password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            required
            helperText="The new admin should change this on first login."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
