import {
  ActiveListResponse,
  CandidateDetail,
  CandidateSummary,
  MyVotesResponse,
  StudentProfile,
  WinnerEntry,
} from "@school-voting/shared";
import { apiRequest } from "./client";

export const authApi = {
  register: (email: string, studentNumber: string, fullName: string, password: string) =>
    apiRequest<void>("/auth/student/register", {
      method: "POST",
      body: { email, studentNumber, fullName, password },
      skipAuth: true,
    }),
  me: () => apiRequest<StudentProfile>("/auth/student/me"),
  updateMe: (fullName: string) => apiRequest<StudentProfile>("/auth/student/me", { method: "PATCH", body: { fullName } }),
  verifyOtp: (email: string, code: string) =>
    apiRequest<void>("/auth/student/verify-otp", { method: "POST", body: { email, code }, skipAuth: true }),
  resendOtp: (email: string) =>
    apiRequest<void>("/auth/student/resend-otp", { method: "POST", body: { email }, skipAuth: true }),
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string }>("/auth/student/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    }),
  forgotPassword: (email: string) =>
    apiRequest<void>("/auth/student/forgot-password", { method: "POST", body: { email }, skipAuth: true }),
  verifyResetOtp: (email: string, code: string) =>
    apiRequest<{ resetToken: string }>("/auth/student/verify-reset-otp", {
      method: "POST",
      body: { email, code },
      skipAuth: true,
    }),
  resetPassword: (resetToken: string, newPassword: string) =>
    apiRequest<void>("/auth/student/reset-password", {
      method: "POST",
      body: { resetToken, newPassword },
      skipAuth: true,
    }),
};

export const browsingApi = {
  activeList: () => apiRequest<ActiveListResponse>("/lists/active"),
  candidatesForList: (listId: string) => apiRequest<CandidateSummary[]>(`/lists/${listId}/candidates`),
  candidateDetail: (id: string) => apiRequest<CandidateDetail>(`/candidates/${id}`),
  currentWinners: () => apiRequest<{ year: number | null; winners: WinnerEntry[] }>("/public/winners/current"),
};

export const votesApi = {
  mine: (listId: string) => apiRequest<MyVotesResponse>(`/votes/mine?listId=${listId}`),
  vote: (candidateId: string) => apiRequest<void>("/votes", { method: "POST", body: { candidateId } }),
  unvote: (candidateId: string) => apiRequest<void>(`/votes/${candidateId}`, { method: "DELETE" }),
};
