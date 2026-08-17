import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { CandidateListsController } from "./candidate-lists.controller";
import { CandidateListsService } from "./candidate-lists.service";
import { VotingWindowSweeperService } from "./voting-window-sweeper.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [CandidateListsController],
  providers: [CandidateListsService, VotingWindowSweeperService],
  exports: [CandidateListsService],
})
export class CandidateListsModule {}
