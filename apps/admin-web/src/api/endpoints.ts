import { apiRequest } from "./client";
import { Admin, Candidate, CandidateList, Role, Student, TallyRow, TurnoutSummary } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string }>("/auth/admin/login", { method: "POST", body: { email, password } }),
};

export const adminsApi = {
  list: () => apiRequest<Admin[]>("/admin/admins"),
  create: (data: { email: string; fullName: string; temporaryPassword: string }) =>
    apiRequest<Admin>("/admin/admins", { method: "POST", body: data }),
  update: (id: string, data: Partial<{ email: string; fullName: string; status: string }>) =>
    apiRequest<Admin>(`/admin/admins/${id}`, { method: "PATCH", body: data }),
  remove: (id: string) => apiRequest<void>(`/admin/admins/${id}`, { method: "DELETE" }),
  resetPassword: (id: string, newPassword: string) =>
    apiRequest<void>(`/admin/admins/${id}/reset-password`, { method: "PATCH", body: { newPassword } }),
};

export const listsApi = {
  list: (year?: number) => apiRequest<CandidateList[]>(`/admin/lists${year ? `?year=${year}` : ""}`),
  get: (id: string) => apiRequest<CandidateList>(`/admin/lists/${id}`),
  create: (data: { electionYear: number; name: string }) =>
    apiRequest<CandidateList>("/admin/lists", { method: "POST", body: data }),
  update: (id: string, data: { name: string }) =>
    apiRequest<CandidateList>(`/admin/lists/${id}`, { method: "PATCH", body: data }),
  remove: (id: string) => apiRequest<void>(`/admin/lists/${id}`, { method: "DELETE" }),
  activate: (id: string, votingStartAt: string, votingEndAt: string) =>
    apiRequest<CandidateList>(`/admin/lists/${id}/activate`, { method: "POST", body: { votingStartAt, votingEndAt } }),
  close: (id: string) => apiRequest<CandidateList>(`/admin/lists/${id}/close`, { method: "POST" }),
  turnout: (id: string) => apiRequest<TurnoutSummary>(`/admin/lists/${id}/turnout`),
};

export const rolesApi = {
  listForList: (listId: string) => apiRequest<Role[]>(`/admin/lists/${listId}/roles`),
  create: (listId: string, data: { name: string; displayOrder?: number }) =>
    apiRequest<Role>(`/admin/lists/${listId}/roles`, { method: "POST", body: data }),
  update: (roleId: string, data: { name?: string; displayOrder?: number }) =>
    apiRequest<Role>(`/admin/roles/${roleId}`, { method: "PATCH", body: data }),
  remove: (roleId: string) => apiRequest<void>(`/admin/roles/${roleId}`, { method: "DELETE" }),
};

export const studentsApi = {
  list: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return apiRequest<Student[]>(`/admin/students${qs ? `?${qs}` : ""}`);
  },
  setStatus: (id: string, status: string) =>
    apiRequest<Student>(`/admin/students/${id}/status`, { method: "PATCH", body: { status } }),
};

export const candidatesApi = {
  listForList: (listId: string) => apiRequest<Candidate[]>(`/admin/candidates?listId=${listId}`),
  create: (data: {
    candidateListId: string;
    roleId: string;
    fullName: string;
    email: string;
    programme?: string;
    semester?: string;
    instagram?: string;
    phoneNumber?: string;
    videoUrl?: string;
    executiveSummary?: string;
    whyVoteForMe?: string;
    vision?: string;
    mission?: string;
    description?: string;
  }) => apiRequest<Candidate>("/admin/candidates", { method: "POST", body: data }),
  update: (id: string, data: Partial<Omit<Candidate, "id" | "candidateListId" | "isDeleted">>) =>
    apiRequest<Candidate>(`/admin/candidates/${id}`, { method: "PATCH", body: data }),
  remove: (id: string) => apiRequest<void>(`/admin/candidates/${id}`, { method: "DELETE" }),
  uploadMedia: (id: string, field: "photo" | "poster", file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<Candidate>(`/admin/candidates/${id}/media/${field}`, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },
};

export const winnersApi = {
  tally: (listId: string) => apiRequest<TallyRow[]>(`/admin/lists/${listId}/tally`),
  promote: (candidateListId: string, candidateIds: string[]) =>
    apiRequest<void>("/admin/winners/promote", { method: "POST", body: { candidateListId, candidateIds } }),
  unpublish: (winnerId: string) => apiRequest<void>(`/admin/winners/${winnerId}`, { method: "DELETE" }),
};
