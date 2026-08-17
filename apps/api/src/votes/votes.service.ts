import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

const MAX_VOTES_PER_LIST = 2;

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  async myVotes(studentId: string, candidateListId: string): Promise<string[]> {
    const votes = await this.prisma.vote.findMany({
      where: { studentId, candidateListId },
      select: { candidateId: true },
    });
    return votes.map((v) => v.candidateId);
  }

  async vote(studentId: string, candidateId: string): Promise<void> {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate || candidate.isDeleted) {
      throw new NotFoundException("Candidate not found");
    }
    const listId = candidate.candidateListId;

    await this.prisma.$transaction(async (tx) => {
      // Serializes all vote/unvote attempts for this (student, list) pair so
      // two concurrent "first vote" requests can't both pass the count check
      // below and push the student past the cap — see plan §Vote Integrity.
      await this.acquireLock(tx, studentId, listId);

      await this.assertVotingOpen(tx, listId);

      const existingCount = await tx.vote.count({ where: { studentId, candidateListId: listId } });
      if (existingCount >= MAX_VOTES_PER_LIST) {
        throw new ConflictException(`You may only vote for up to ${MAX_VOTES_PER_LIST} candidates in this list`);
      }

      try {
        await tx.vote.create({ data: { studentId, candidateId, candidateListId: listId } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("You have already voted for this candidate");
        }
        throw error;
      }
    });
  }

  async unvote(studentId: string, candidateId: string): Promise<void> {
    const candidate = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      throw new NotFoundException("Candidate not found");
    }
    const listId = candidate.candidateListId;

    await this.prisma.$transaction(async (tx) => {
      await this.acquireLock(tx, studentId, listId);
      await this.assertVotingOpen(tx, listId);

      const result = await tx.vote.deleteMany({ where: { studentId, candidateId, candidateListId: listId } });
      if (result.count === 0) {
        throw new NotFoundException("You haven't voted for this candidate");
      }
    });
  }

  private async acquireLock(tx: Prisma.TransactionClient, studentId: string, listId: string): Promise<void> {
    const lockKey = `${studentId}:${listId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  }

  private async assertVotingOpen(tx: Prisma.TransactionClient, listId: string): Promise<void> {
    const list = await tx.candidateList.findUnique({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException("Candidate list not found");
    }
    const now = new Date();
    const withinWindow =
      list.status === ListStatus.ACTIVE &&
      list.votingStartAt !== null &&
      list.votingEndAt !== null &&
      now >= list.votingStartAt &&
      now <= list.votingEndAt;

    if (!withinWindow) {
      throw new ForbiddenException("Voting is not currently open for this list");
    }
  }
}
