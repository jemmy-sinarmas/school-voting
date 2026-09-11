import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Chip,
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
  Button,
  Typography,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useSnackbar } from "notistack";
import { StudentStatus } from "@school-voting/shared";
import { studentsApi } from "../api/endpoints";
import { Student } from "../api/types";
import { ApiError } from "../api/client";
import { useConfirm } from "../components/ConfirmProvider";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: StudentStatus.ACTIVE, label: "Active" },
  { value: StudentStatus.DISABLED, label: "Disabled" },
  { value: StudentStatus.PENDING_VERIFICATION, label: "Pending verification" },
];

function statusChipColor(status: StudentStatus): "success" | "error" | "warning" | "default" {
  if (status === StudentStatus.ACTIVE) return "success";
  if (status === StudentStatus.DISABLED) return "error";
  if (status === StudentStatus.PENDING_VERIFICATION) return "warning";
  return "default";
}

export function StudentsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const confirm = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const params: { status?: string; search?: string } = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      setStudents(await studentsApi.list(params));
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to load students", { variant: "error" });
    }
  }, [statusFilter, search, enqueueSnackbar]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleStatus(student: Student) {
    const disabling = student.status === StudentStatus.ACTIVE;
    const nextStatus = disabling ? StudentStatus.DISABLED : StudentStatus.ACTIVE;
    const ok = await confirm({
      title: disabling ? `Disable ${student.fullName}?` : `Enable ${student.fullName}?`,
      description: disabling
        ? "They will no longer be able to log in or vote. Existing votes are kept."
        : "They will be able to log in and vote again.",
      confirmLabel: disabling ? "Disable" : "Enable",
      destructive: disabling,
    });
    if (!ok) return;
    try {
      await studentsApi.setStatus(student.id, nextStatus);
      enqueueSnackbar(disabling ? "Student disabled" : "Student enabled", { variant: "success" });
      await refresh();
    } catch (err) {
      enqueueSnackbar(err instanceof ApiError ? err.message : "Failed to update student", { variant: "error" });
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }} flexWrap="wrap" gap={2}>
        <Typography variant="h1">Students</Typography>
        <Stack direction="row" gap={1.5}>
          <TextField
            size="small"
            label="Search"
            placeholder="Name, email or student no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {STATUS_FILTERS.map((f) => (
              <MenuItem key={f.value} value={f.value}>
                {f.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Student number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: "primary.light" }}>
                      {student.fullName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {student.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{student.studentNumber}</TableCell>
                <TableCell>
                  <Chip
                    label={student.status.replace(/_/g, " ")}
                    size="small"
                    color={statusChipColor(student.status)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {student.status === StudentStatus.ACTIVE && (
                    <Button size="small" color="error" startIcon={<BlockIcon />} onClick={() => toggleStatus(student)}>
                      Disable
                    </Button>
                  )}
                  {student.status === StudentStatus.DISABLED && (
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => toggleStatus(student)}
                    >
                      Enable
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    No students match this filter.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
