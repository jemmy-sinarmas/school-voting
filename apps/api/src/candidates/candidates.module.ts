import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
})
export class CandidatesModule {}
