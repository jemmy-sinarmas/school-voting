import { AdminRole, AdminStatus, ListStatus } from "@school-voting/shared";

export interface Admin {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
}

export interface ElectionYear {
  id: string;
  year: number;
}

export interface CandidateList {
  id: string;
  electionYearId: string;
  name: string;
  status: ListStatus;
  votingStartAt: string | null;
  votingEndAt: string | null;
  activatedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  electionYear?: ElectionYear;
  _count?: { candidates: number };
}

export interface Candidate {
  id: string;
  candidateListId: string;
  fullName: string;
  email: string;
  photoPath: string | null;
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
  isDeleted: boolean;
}

export interface TallyRow {
  candidateId: string;
  fullName: string;
  voteCount: number;
}
