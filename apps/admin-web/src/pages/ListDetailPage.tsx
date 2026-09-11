import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
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
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ImageIcon from "@mui/icons-material/Image";
import EditIcon from "@mui/icons-material/Edit";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { useSnackbar } from "notistack";
import { ListStatus } from "@school-voting/shared";
import { candidatesApi, listsApi, rolesApi, winnersApi } from "../api/endpoints";
import { Candidate, CandidateList, Role, TallyRow, TurnoutSummary } from "../api/types";
import { ApiError } from "../api/client";
import { useConfirm } from "../components/ConfirmProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [list, setList] = useState<CandidateList | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showActivate, setShowActivate] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [listData, candidatesData, rolesData] = await Promise.all([
        listsApi.get(id),
        candidatesApi.listForList(id),
        rolesApi.listForList(id),
      ]);
      setList(listData);
      setCandidates(candidatesData);
      setRoles(rolesData);
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load list", { variant: "error" });
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [roles],
  );

  if (!list || !id) {
    return null;
  }

  const isDraft = list.status === ListStatus.DRAFT;

  async function handleClose() {
    const ok = await confirm({
      title: "Close voting?",
      description: "Students will no longer be able to vote or change their votes for this list. This cannot be undone.",
      confirmLabel: "Close voting",
      destructive: true,
      confirmText: list!.name,
    });
    if (!ok) return;
    try {
      await listsApi.close(id!);
      enqueueSnackbar("Voting closed", { variant: "success" });
      await refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to close list", { variant: "error" });
    }
  }

  async function handleDeleteList() {
    const ok = await confirm({
      title: `Delete "${list!.name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await listsApi.remove(id!);
      navigate("/lists");
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to delete list", { variant: "error" });
    }
  }

  async function handleDeleteCandidate(candidate: Candidate) {
    const ok = await confirm({
      title: `Remove ${candidate.fullName}?`,
      description: "They'll be removed from this list.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      await candidatesApi.remove(candidate.id);
      await refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to remove candidate", { variant: "error" });
    }
  }

  // Candidates grouped under their role, in role display order. Candidates
  // whose role is missing (shouldn't happen) fall into an "Unassigned" bucket.
  const groupedByRole = sortedRoles.map((role) => ({
    role,
    candidates: candidates.filter((c) => c.roleId === role.id),
  }));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h1">{list.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {list.electionYear?.year} · {list.status}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          {isDraft && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={roles.length === 0}
                onClick={() => setShowAddCandidate(true)}
              >
                Add candidate
              </Button>
              <Button variant="contained" disabled={candidates.length === 0} onClick={() => setShowActivate(true)}>
                Activate
              </Button>
              <Button variant="outlined" color="error" onClick={handleDeleteList}>
                Delete list
              </Button>
            </>
          )}
          {list.status === ListStatus.ACTIVE && (
            <Button variant="outlined" color="error" onClick={handleClose}>
              Close voting
            </Button>
          )}
        </Stack>
      </Stack>

      {isDraft && <RolesPanel listId={id} roles={sortedRoles} onChanged={refresh} />}

      {roles.length === 0 ? (
        <Paper elevation={0} sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {isDraft
              ? "Add at least one role (e.g. President) before adding candidates. Each candidate stands for one role, and students vote for one candidate per role."
              : "This list has no roles."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={4}>
          {groupedByRole.map(({ role, candidates: roleCandidates }) => (
            <Box key={role.id}>
              <Typography variant="h2" sx={{ mb: 1.5 }}>
                {role.name}
              </Typography>
              {roleCandidates.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No candidates for this role yet.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {roleCandidates.map((candidate) => (
                    <Grid key={candidate.id} item xs={12} sm={6} md={4} lg={3}>
                      <CandidateCard
                        candidate={candidate}
                        roles={sortedRoles}
                        editable={isDraft}
                        onDelete={() => handleDeleteCandidate(candidate)}
                        onUpdated={refresh}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {(list.status === ListStatus.ACTIVE || list.status === ListStatus.CLOSED) && (
        <>
          <TurnoutPanel candidateListId={id} live={list.status === ListStatus.ACTIVE} />
          <TallyPanel
            candidateListId={id}
            rolesById={rolesById}
            live={list.status === ListStatus.ACTIVE}
            closed={list.status === ListStatus.CLOSED}
            onPromoted={refresh}
          />
        </>
      )}

      <AddCandidateDialog
        open={showAddCandidate}
        candidateListId={id}
        roles={sortedRoles}
        onClose={() => setShowAddCandidate(false)}
        onCreated={() => {
          setShowAddCandidate(false);
          refresh();
        }}
      />

      <ActivateDialog
        open={showActivate}
        onClose={() => setShowActivate(false)}
        onActivate={async (start, end) => {
          try {
            await listsApi.activate(id!, start, end);
            setShowActivate(false);
            enqueueSnackbar("List activated", { variant: "success" });
            await refresh();
          } catch (err) {
            enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to activate list", { variant: "error" });
          }
        }}
      />
    </Box>
  );
}

function RolesPanel({ listId, roles, onChanged }: { listId: string; roles: Role[]; onChanged: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addRole(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await rolesApi.create(listId, { name: newName.trim(), displayOrder: roles.length });
      setNewName("");
      onChanged();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to add role", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRole(role: Role) {
    const ok = await confirm({
      title: `Delete role "${role.name}"?`,
      description: "The role must have no candidates. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await rolesApi.remove(role.id);
      onChanged();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to delete role", { variant: "error" });
    }
  }

  return (
    <Card elevation={0} sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h2" sx={{ mb: 1 }}>
          Roles / positions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Students vote for one candidate per role. Roles can only be changed while the list is a draft.
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {roles.map((role) => (
            <Chip key={role.id} label={role.name} onDelete={() => removeRole(role)} variant="outlined" />
          ))}
          {roles.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No roles yet.
            </Typography>
          )}
        </Stack>
        <Box component="form" onSubmit={addRole}>
          <Stack direction="row" gap={1.5} alignItems="center">
            <TextField
              size="small"
              label="New role name"
              placeholder="e.g. President"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <Button type="submit" variant="outlined" startIcon={<AddIcon />} disabled={submitting || !newName.trim()}>
              Add role
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

function ActivateDialog({
  open,
  onClose,
  onActivate,
}: {
  open: boolean;
  onClose: () => void;
  onActivate: (startIso: string, endIso: string) => void;
}) {
  const confirm = useConfirm();
  const [start, setStart] = useState<Date | null>(new Date());
  const [end, setEnd] = useState<Date | null>(new Date(Date.now() + 24 * 60 * 60 * 1000));

  async function handleActivate() {
    if (!start || !end) return;
    const ok = await confirm({
      title: "Activate this list?",
      description:
        "Voting opens at the scheduled start time. No other list can be activated until this one is closed, and closing it is permanent — it can't be reactivated.",
      confirmLabel: "Activate",
    });
    if (!ok) return;
    onActivate(start.toISOString(), end.toISOString());
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Activate this list</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Set the voting window. Only one list may be active at a time.
          </Typography>
          <DateTimePicker label="Voting starts" value={start} onChange={setStart} />
          <DateTimePicker label="Voting ends" value={end} onChange={setEnd} minDateTime={start ?? undefined} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={!start || !end} onClick={handleActivate}>
          Activate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CandidateCard({
  candidate,
  roles,
  editable,
  onDelete,
  onUpdated,
}: {
  candidate: Candidate;
  roles: Role[];
  editable: boolean;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [showEdit, setShowEdit] = useState(false);

  async function upload(field: "photo" | "poster", file: File | undefined) {
    if (!file) return;
    try {
      await candidatesApi.uploadMedia(candidate.id, field, file);
      onUpdated();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Upload failed", { variant: "error" });
    }
  }

  return (
    <Card elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {candidate.photoPath ? (
        <Box component="img" src={`${API_BASE}${candidate.photoPath}`} alt={candidate.fullName} sx={{ aspectRatio: "1", objectFit: "cover" }} />
      ) : (
        <Box sx={{ aspectRatio: "1", bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: "grey.300" }}>{candidate.fullName.charAt(0)}</Avatar>
        </Box>
      )}
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {candidate.fullName}
        </Typography>
        {(candidate.programme || candidate.semester) && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: editable ? 1.5 : 0 }}>
            {[candidate.programme, candidate.semester].filter(Boolean).join(" · ")}
          </Typography>
        )}
        {editable && (
          <Stack direction="row" gap={0.5} sx={{ mt: 1 }}>
            <Tooltip title="Upload photo">
              <IconButton component="label" size="small">
                <PhotoCameraIcon fontSize="small" />
                <input hidden type="file" accept="image/*" onChange={(e) => upload("photo", e.target.files?.[0])} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload poster">
              <IconButton component="label" size="small">
                <ImageIcon fontSize="small" />
                <input hidden type="file" accept="image/*" onChange={(e) => upload("poster", e.target.files?.[0])} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit details">
              <IconButton size="small" onClick={() => setShowEdit(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Remove candidate">
              <IconButton size="small" color="error" onClick={onDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </CardContent>
      <EditCandidateDialog
        open={showEdit}
        candidate={candidate}
        roles={roles}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          onUpdated();
        }}
      />
    </Card>
  );
}

const EDIT_FIELDS: { key: keyof Candidate; label: string; multiline?: boolean }[] = [
  { key: "programme", label: "Programme / course" },
  { key: "semester", label: "Semester" },
  { key: "instagram", label: "Instagram handle" },
  { key: "phoneNumber", label: "Phone number" },
  { key: "videoUrl", label: "YouTube video link" },
  { key: "executiveSummary", label: "Summary", multiline: true },
  { key: "vision", label: "Vision", multiline: true },
  { key: "mission", label: "Mission", multiline: true },
  { key: "whyVoteForMe", label: "Why vote for me", multiline: true },
];

function EditCandidateDialog({
  open,
  candidate,
  roles,
  onClose,
  onSaved,
}: {
  open: boolean;
  candidate: Candidate;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [values, setValues] = useState<Record<string, string>>({});
  const [roleId, setRoleId] = useState<string>(candidate.roleId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const field of EDIT_FIELDS) {
      initial[field.key] = (candidate[field.key] as string | null) ?? "";
    }
    setValues(initial);
    setRoleId(candidate.roleId);
  }, [open, candidate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await candidatesApi.update(candidate.id, { ...(values as Partial<Candidate>), roleId });
      onSaved();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to save candidate details", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth component="form" onSubmit={onSubmit}>
      <DialogTitle>Edit {candidate.fullName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} fullWidth>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
          {EDIT_FIELDS.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              multiline={field.multiline}
              minRows={field.multiline ? 2 : undefined}
              fullWidth
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddCandidateDialog({
  open,
  candidateListId,
  roles,
  onClose,
  onCreated,
}: {
  open: boolean;
  candidateListId: string;
  roles: Role[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRoleId(roles[0]?.id ?? "");
    }
  }, [open, roles]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roleId) {
      setError("Select a role for this candidate");
      return;
    }
    setSubmitting(true);
    try {
      await candidatesApi.create({ candidateListId, roleId, fullName, email });
      setFullName("");
      setEmail("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add candidate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth component="form" onSubmit={onSubmit}>
      <DialogTitle>Add candidate</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField select label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function TurnoutPanel({ candidateListId, live }: { candidateListId: string; live: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const [turnout, setTurnout] = useState<TurnoutSummary | null>(null);

  const load = useCallback(async () => {
    try {
      setTurnout(await listsApi.turnout(candidateListId));
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load turnout", { variant: "error" });
    }
  }, [candidateListId, enqueueSnackbar]);

  useEffect(() => {
    load();
    if (!live) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load, live]);

  if (!turnout) return null;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h2" sx={{ mb: 1.5 }}>
        Turnout
      </Typography>
      <Card elevation={0}>
        <CardContent>
          <Stack direction="row" flexWrap="wrap" gap={4} sx={{ mb: 2 }}>
            <Stat label="Voted" value={`${turnout.votedStudents}`} />
            <Stat label="Not voted" value={`${turnout.notVotedStudents}`} />
            <Stat label="Eligible students" value={`${turnout.eligibleStudents}`} />
            <Stat label="Turnout" value={`${turnout.turnoutPercent}%`} />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(turnout.turnoutPercent, 100)}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {turnout.votedStudents} of {turnout.eligibleStudents} eligible (active) students have voted.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="h2" sx={{ lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function TallyPanel({
  candidateListId,
  rolesById,
  live,
  closed,
  onPromoted,
}: {
  candidateListId: string;
  rolesById: Map<string, Role>;
  live: boolean;
  closed: boolean;
  onPromoted: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [rows, setRows] = useState<TallyRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setRows(await winnersApi.tally(candidateListId));
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load tally", { variant: "error" });
    }
  }, [candidateListId, enqueueSnackbar]);

  useEffect(() => {
    load();
    if (!live) return;
    const interval = setInterval(load, 7000);
    return () => clearInterval(interval);
  }, [load, live]);

  function toggle(candidateId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }

  async function promote() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Promote ${selected.size} candidate(s)?`,
      description: "They'll be published as winners and become visible to students.",
      confirmLabel: "Promote",
    });
    if (!ok) return;
    try {
      await winnersApi.promote(candidateListId, [...selected]);
      setSelected(new Set());
      enqueueSnackbar("Winners promoted", { variant: "success" });
      onPromoted();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to promote winners", { variant: "error" });
    }
  }

  const maxVotes = Math.max(1, ...rows.map((r) => r.voteCount));

  // Preserve the API's role-grouped ordering (roleName, then votes desc) while
  // rendering a subheader row whenever the role changes.
  const orderedRoleIds: string[] = [];
  for (const row of rows) {
    if (!orderedRoleIds.includes(row.roleId)) orderedRoleIds.push(row.roleId);
  }

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h2" sx={{ mb: 1.5 }}>
        {live ? "Live Tally" : "Final Tally"}
      </Typography>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              {closed && <TableCell padding="checkbox"></TableCell>}
              <TableCell>Candidate</TableCell>
              <TableCell>Votes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderedRoleIds.map((roleId) => {
              const roleRows = rows.filter((r) => r.roleId === roleId);
              const roleName = rolesById.get(roleId)?.name ?? roleRows[0]?.roleName ?? "Role";
              return (
                <>
                  <TableRow key={`role-${roleId}`}>
                    <TableCell colSpan={closed ? 3 : 2} sx={{ bgcolor: "grey.50" }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {roleName}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {roleRows.map((row) => (
                    <TableRow key={row.candidateId} hover>
                      {closed && (
                        <TableCell padding="checkbox">
                          <Checkbox checked={selected.has(row.candidateId)} onChange={() => toggle(row.candidateId)} />
                        </TableCell>
                      )}
                      <TableCell>{row.fullName}</TableCell>
                      <TableCell sx={{ width: "50%" }}>
                        <Stack direction="row" alignItems="center" gap={1.5}>
                          <Box sx={{ flex: 1, height: 8, bgcolor: "grey.100", borderRadius: 4, overflow: "hidden" }}>
                            <Box
                              sx={{
                                width: `${(row.voteCount / maxVotes) * 100}%`,
                                height: "100%",
                                bgcolor: "primary.main",
                                transition: "width 0.3s",
                              }}
                            />
                          </Box>
                          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 24, textAlign: "right" }}>
                            {row.voteCount}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {closed && (
        <Button
          sx={{ mt: 2 }}
          variant="contained"
          startIcon={<EmojiEventsIcon />}
          disabled={selected.size === 0}
          onClick={promote}
        >
          Promote selected to winners
        </Button>
      )}
    </Box>
  );
}
