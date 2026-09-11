import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ListStatus, StudentStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateListDto } from "./dto/create-list.dto";
import { UpdateListDto } from "./dto/update-list.dto";
import { ActivateListDto } from "./dto/activate-list.dto";

@Injectable()
export class CandidateListsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByYear(year?: number) {
    return this.prisma.candidateList.findMany({
      where: year ? { electionYear: { year } } : undefined,
      include: { electionYear: true, _count: { select: { candidates: true } } },
      orderBy: [{ electionYear: { year: "desc" } }, { createdAt: "asc" }],
    });
  }

  async getOrThrow(id: string) {
    const list = await this.prisma.candidateList.findUnique({
      where: { id },
      include: { electionYear: true },
    });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    return list;
  }

  async create(dto: CreateListDto) {
    const electionYear = await this.prisma.electionYear.upsert({
      where: { year: dto.electionYear },
      update: {},
      create: { year: dto.electionYear },
    });
    return this.prisma.candidateList.create({
      data: {
        electionYearId: electionYear.id,
        name: dto.name,
        status: ListStatus.DRAFT,
      },
    });
  }

  async update(id: string, dto: UpdateListDto) {
    await this.getOrThrow(id);
    return this.prisma.candidateList.update({ where: { id }, data: { name: dto.name } });
  }

  async remove(id: string): Promise<void> {
    const list = await this.getOrThrow(id);
    if (list.status !== ListStatus.DRAFT) {
      throw new ConflictException("Only draft lists can be deleted");
    }
    const candidateCount = await this.prisma.candidate.count({ where: { candidateListId: id } });
    if (candidateCount > 0) {
      throw new ConflictException("Remove all candidates from this list before deleting it");
    }
    await this.prisma.candidateList.delete({ where: { id } });
  }

  async activate(id: string, dto: ActivateListDto) {
    const list = await this.getOrThrow(id);
    if (list.status !== ListStatus.DRAFT) {
      throw new ConflictException("Only draft lists can be activated");
    }

    const votingStartAt = new Date(dto.votingStartAt);
    const votingEndAt = new Date(dto.votingEndAt);
    if (votingEndAt <= votingStartAt) {
      throw new ConflictException("votingEndAt must be after votingStartAt");
    }

    const currentlyActive = await this.prisma.candidateList.findFirst({ where: { status: ListStatus.ACTIVE } });
    if (currentlyActive) {
      throw new ConflictException(`List "${currentlyActive.name}" is currently active; close it before activating another`);
    }

    try {
      return await this.prisma.candidateList.update({
        where: { id },
        data: { status: ListStatus.ACTIVE, activatedAt: new Date(), votingStartAt, votingEndAt },
      });
    } catch (error) {
      // Backstop: the partial unique index (one_active_list_system_wide)
      // catches a race the pre-check above can't, e.g. two activation
      // requests arriving concurrently for different lists.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Another list was activated concurrently; only one list may be active at a time");
      }
      throw error;
    }
  }

  async close(id: string) {
    const list = await this.getOrThrow(id);
    if (list.status !== ListStatus.ACTIVE) {
      throw new ConflictException("Only an active list can be closed");
    }
    return this.prisma.candidateList.update({
      where: { id },
      data: { status: ListStatus.CLOSED, closedAt: new Date() },
    });
  }

  /**
   * School-wide turnout for a list (feature E1): how many eligible students
   * have voted at least once in this list vs. not.
   *  - eligible  = active students (the population allowed to vote)
   *  - voted     = distinct students with >= 1 vote in this list
   *  - not voted = eligible - voted, clamped at 0 so a student who voted and
   *                was later disabled can never push the number negative.
   */
  async turnout(id: string) {
    await this.getOrThrow(id);

    const [eligibleStudents, votedGroups] = await Promise.all([
      this.prisma.student.count({ where: { status: StudentStatus.ACTIVE } }),
      this.prisma.vote.findMany({
        where: { candidateListId: id },
        distinct: ["studentId"],
        select: { studentId: true },
      }),
    ]);

    const votedStudents = votedGroups.length;
    const notVotedStudents = Math.max(eligibleStudents - votedStudents, 0);
    const denominator = Math.max(eligibleStudents, votedStudents);
    const turnoutPercent = denominator === 0 ? 0 : Math.round((votedStudents / denominator) * 1000) / 10;

    return { listId: id, eligibleStudents, votedStudents, notVotedStudents, turnoutPercent };
  }
}
