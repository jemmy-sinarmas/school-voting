import { ListStatus } from "./enums";

export interface StudentRegisterRequest {
  email: string;
  studentNumber: string;
  fullName: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface CandidateListSummary {
  id: string;
  name: string;
  electionYear: number;
  status: ListStatus;
  votingStartAt: string | null;
  votingEndAt: string | null;
}

export interface ActiveListResponse {
  list: CandidateListSummary | null;
  reason?: "no_active_list";
}

export interface RoleSummary {
  id: string;
  name: string;
  displayOrder: number;
}

export interface CandidateSummary {
  id: string;
  candidateListId: string;
  roleId: string;
  fullName: string;
  photoPath: string | null;
  programme: string | null;
  semester: string | null;
}

/** A role together with the candidates standing for it — the unit the voting UI renders. */
export interface RoleWithCandidates {
  role: RoleSummary;
  candidates: CandidateSummary[];
}

export interface CandidateDetail extends CandidateSummary {
  email: string;
  videoUrl: string | null;
  posterPath: string | null;
  programme: string | null;
  semester: string | null;
  instagram: string | null;
  phoneNumber: string | null;
  executiveSummary: string | null;
  whyVoteForMe: string | null;
  vision: string | null;
  mission: string | null;
  description: string | null;
}

export interface StudentProfile {
  email: string;
  fullName: string;
  studentNumber: string;
}

export interface MyVotesResponse {
  candidateIds: string[];
}

export interface VoteRequest {
  candidateId: string;
}

export interface TallyRow {
  candidateId: string;
  fullName: string;
  voteCount: number;
  roleId: string;
  roleName: string;
}

/** Turnout for a single election list, school-wide (feature E1). */
export interface TurnoutSummary {
  listId: string;
  eligibleStudents: number;
  votedStudents: number;
  notVotedStudents: number;
  turnoutPercent: number;
}

export interface WinnerEntry {
  candidateId: string;
  fullName: string;
  candidateListName: string;
  electionYear: number;
}
