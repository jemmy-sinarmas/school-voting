import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PromoteWinnersDto } from "./dto/promote-winners.dto";

@Injectable()
export class WinnersService {
  constructor(private readonly prisma: PrismaService) {}

  async tally(candidateListId: string) {
    const candidates = await this.prisma.candidate.findMany({
      where: { candidateListId, isDeleted: false },
      include: { _count: { select: { votes: true } }, role: true },
    });

    return candidates
      .map((c) => ({
        candidateId: c.id,
        fullName: c.fullName,
        voteCount: c._count.votes,
        roleId: c.roleId,
        roleName: c.role.name,
      }))
      // Group visually by role (role display order, then name), then by votes
      // within a role so each position's leader is on top.
      .sort((a, b) => {
        if (a.roleName !== b.roleName) return a.roleName.localeCompare(b.roleName);
        return b.voteCount - a.voteCount;
      });
  }

  async promote(dto: PromoteWinnersDto, promotedByAdminId: string) {
    const list = await this.prisma.candidateList.findUnique({ where: { id: dto.candidateListId } });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    if (list.status !== ListStatus.CLOSED) {
      throw new ConflictException("Winners can only be promoted after the list is closed");
    }

    const candidates = await this.prisma.candidate.findMany({
      where: { id: { in: dto.candidateIds }, candidateListId: dto.candidateListId },
    });
    if (candidates.length !== dto.candidateIds.length) {
      throw new BadRequestException("One or more candidates do not belong to this list");
    }

    return this.prisma.$transaction(
      dto.candidateIds.map((candidateId) =>
        this.prisma.winner.upsert({
          where: { electionYearId_candidateId: { electionYearId: list.electionYearId, candidateId } },
          update: { isPublished: true, promotedByAdminId, promotedAt: new Date() },
          create: {
            electionYearId: list.electionYearId,
            candidateId,
            candidateListId: list.id,
            promotedByAdminId,
          },
        }),
      ),
    );
  }

  async unpublish(winnerId: string): Promise<void> {
    const winner = await this.prisma.winner.findUnique({ where: { id: winnerId } });
    if (!winner) {
      throw new NotFoundException("Winner entry not found");
    }
    await this.prisma.winner.update({ where: { id: winnerId }, data: { isPublished: false } });
  }
}
