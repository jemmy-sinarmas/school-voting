import { Module } from "@nestjs/common";
import { StudentAuthModule } from "../auth/student/student-auth.module";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

@Module({
  imports: [StudentAuthModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
