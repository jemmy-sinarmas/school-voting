import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ListStatus, StudentStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

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
    const roleId = candidate.roleId;

    await this.prisma.$transaction(async (tx) => {
      // Serializes all vote/unvote attempts for this (student, list) pair so
      // two concurrent requests can't both pass the checks below. Keyed on the
      // list (not the role) so a student's actions across the whole list stay
      // mutually ordered.
      await this.acquireLock(tx, studentId, listId);

      await this.assertStudentActive(tx, studentId);
      await this.assertVotingOpen(tx, listId);

      // Core rule: at most one vote per role. Surfaced as a friendly error
      // before the @@unique([studentId, roleId]) constraint would fire.
      const existingForRole = await tx.vote.findFirst({ where: { studentId, roleId } });
      if (existingForRole) {
        if (existingForRole.candidateId === candidateId) {
          throw new ConflictException("You have already voted for this candidate");
        }
        throw new ConflictException("You have already voted for another candidate in this role");
      }

      try {
        await tx.vote.create({ data: { studentId, candidateId, candidateListId: listId, roleId } });
      } catch (error) {
        // Backstop for a race the pre-check can't catch: the DB uniques
        // (studentId+candidateId, studentId+roleId) are the source of truth.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("You have already voted in this role");
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
      await this.assertStudentActive(tx, studentId);
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

  private async assertStudentActive(tx: Prisma.TransactionClient, studentId: string): Promise<void> {
    const student = await tx.student.findUnique({ where: { id: studentId }, select: { status: true } });
    if (!student || student.status !== StudentStatus.ACTIVE) {
      // Rechecked at vote time (not just at login) so an admin disabling a
      // student takes effect immediately, even if the student still holds a
      // valid, unexpired access token.
      throw new ForbiddenException("Your account is not active and cannot vote");
    }
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
