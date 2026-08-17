import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import { useSnackbar } from "notistack";
import { ListStatus } from "@school-voting/shared";
import { listsApi } from "../api/endpoints";
import { CandidateList } from "../api/types";
import { ApiError } from "../api/client";

const STATUS_COLOR: Record<ListStatus, "default" | "success" | "warning"> = {
  [ListStatus.DRAFT]: "default",
  [ListStatus.ACTIVE]: "success",
  [ListStatus.CLOSED]: "warning",
};

const STATUS_LABEL: Record<ListStatus, string> = {
  [ListStatus.DRAFT]: "Draft",
  [ListStatus.ACTIVE]: "Active",
  [ListStatus.CLOSED]: "Closed",
};

export function ListsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [lists, setLists] = useState<CandidateList[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  async function refresh() {
    try {
      setLists(await listsApi.list());
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load lists", { variant: "error" });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const byYear = new Map<number, CandidateList[]>();
  for (const list of lists) {
    const year = list.electionYear?.year ?? 0;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(list);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h1">Candidate Lists</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
          New list
        </Button>
      </Stack>

      {years.map((year) => (
        <Box key={year} sx={{ mb: 4 }}>
          <Typography variant="h2" color="text.secondary" sx={{ mb: 1.5 }}>
            {year}
          </Typography>
          <Grid container spacing={2}>
            {byYear.get(year)!.map((list) => (
              <Grid key={list.id} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                <Card elevation={0} sx={{ width: "100%", height: "100%" }}>
                  <CardActionArea onClick={() => navigate(`/lists/${list.id}`)} sx={{ height: "100%", alignItems: "flex-start" }}>
                    <CardContent sx={{ width: "100%" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {list.name}
                        </Typography>
                        <Chip label={STATUS_LABEL[list.status]} size="small" color={STATUS_COLOR[list.status]} />
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.5} color="text.secondary">
                        <GroupsIcon fontSize="inherit" />
                        <Typography variant="body2">{list._count?.candidates ?? 0} candidates</Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
      {years.length === 0 && (
        <Typography color="text.secondary">No candidate lists yet.</Typography>
      )}

      <CreateListDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          enqueueSnackbar("List created", { variant: "success" });
          refresh();
        }}
      />
    </Box>
  );
}

function CreateListDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [electionYear, setElectionYear] = useState(new Date().getFullYear());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await listsApi.create({ electionYear, name });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create list");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth component="form" onSubmit={onSubmit}>
      <DialogTitle>New candidate list</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <TextField
            label="Election year"
            type="number"
            value={electionYear}
            onChange={(e) => setElectionYear(Number(e.target.value))}
            required
            autoFocus
          />
          <TextField label="List name" value={name} onChange={(e) => setName(e.target.value)} placeholder="List A" required />
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
