import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ListStatus } from "@school-voting/shared";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Proactively flips an active list to `closed` once its voting window has
 * passed, so GET /lists/active stops advertising it promptly. This is a
 * convenience only — the authoritative guard against voting past the
 * window is the in-transaction check in VotesService, which doesn't
 * depend on this sweep having already run.
 */
@Injectable()
export class VotingWindowSweeperService {
  private readonly logger = new Logger(VotingWindowSweeperService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredLists(): Promise<void> {
    const result = await this.prisma.candidateList.updateMany({
      where: { status: ListStatus.ACTIVE, votingEndAt: { lt: new Date() } },
      data: { status: ListStatus.CLOSED, closedAt: new Date() },
    });
    if (result.count > 0) {
      this.logger.log(`Auto-closed ${result.count} list(s) past their voting window`);
    }
  }
}
