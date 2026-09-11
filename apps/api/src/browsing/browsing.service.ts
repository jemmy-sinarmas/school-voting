import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BrowsingService {
  constructor(private readonly prisma: PrismaService) {}

  async activeList() {
    const list = await this.prisma.candidateList.findFirst({
      where: { status: ListStatus.ACTIVE },
      include: { electionYear: true },
    });
    if (!list) {
      return { list: null, reason: "no_active_list" as const };
    }
    return { list: this.toSummary(list) };
  }

  async candidatesForList(listId: string) {
    const list = await this.assertVisible(listId);
    const candidates = await this.prisma.candidate.findMany({
      where: { candidateListId: list.id, isDeleted: false },
      orderBy: { fullName: "asc" },
    });
    return candidates.map((c) => this.toCandidateSummary(c));
  }

  /**
   * The list's roles, each with the candidates standing for it — the shape the
   * voting UI renders (one selection per role). Ordered by the admin-defined
   * display order. Only roles that have at least one (non-deleted) candidate
   * are returned, so empty roles don't show as blank sections.
   */
  async rolesForList(listId: string) {
    const list = await this.assertVisible(listId);
    const roles = await this.prisma.role.findMany({
      where: { candidateListId: list.id },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        candidates: {
          where: { isDeleted: false },
          orderBy: { fullName: "asc" },
        },
      },
    });
    return roles
      .map((role) => ({
        role: { id: role.id, name: role.name, displayOrder: role.displayOrder },
        candidates: role.candidates.map((c) => this.toCandidateSummary(c)),
      }))
      .filter((group) => group.candidates.length > 0);
  }

  private toCandidateSummary(c: {
    id: string;
    candidateListId: string;
    roleId: string;
    fullName: string;
    photoPath: string | null;
    programme: string | null;
    semester: string | null;
  }) {
    return {
      id: c.id,
      candidateListId: c.candidateListId,
      roleId: c.roleId,
      fullName: c.fullName,
      photoPath: c.photoPath,
      programme: c.programme,
      semester: c.semester,
    };
  }

  async candidateDetail(candidateId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, isDeleted: false },
    });
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    await this.assertVisible(candidate.candidateListId);
    return candidate;
  }

  async currentWinners() {
    const latestYearWithWinners = await this.prisma.winner.findFirst({
      where: { isPublished: true },
      orderBy: { electionYear: { year: "desc" } },
      select: { electionYearId: true },
    });
    if (!latestYearWithWinners) {
      return { year: null, winners: [] };
    }

    const winners = await this.prisma.winner.findMany({
      where: { electionYearId: latestYearWithWinners.electionYearId, isPublished: true },
      include: { candidate: true, candidateList: true, electionYear: true },
      orderBy: { candidate: { fullName: "asc" } },
    });

    return {
      year: winners[0]?.electionYear.year ?? null,
      winners: winners.map((w) => ({
        candidateId: w.candidateId,
        fullName: w.candidate.fullName,
        candidateListName: w.candidateList.name,
        electionYear: w.electionYear.year,
      })),
    };
  }

  /** A list's candidates/detail are visible to students while it's active, or once closed if it has published winners. */
  private async assertVisible(listId: string) {
    const list = await this.prisma.candidateList.findUnique({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    if (list.status === ListStatus.ACTIVE) {
      return list;
    }
    if (list.status === ListStatus.CLOSED) {
      const hasPublishedWinners = await this.prisma.winner.findFirst({
        where: { candidateListId: listId, isPublished: true },
      });
      if (hasPublishedWinners) {
        return list;
      }
    }
    throw new ForbiddenException("This list is not currently visible");
  }

  private toSummary(list: { id: string; name: string; status: string; votingStartAt: Date | null; votingEndAt: Date | null; electionYear: { year: number } }) {
    return {
      id: list.id,
      name: list.name,
      electionYear: list.electionYear.year,
      status: list.status,
      votingStartAt: list.votingStartAt?.toISOString() ?? null,
      votingEndAt: list.votingEndAt?.toISOString() ?? null,
    };
  }
}
