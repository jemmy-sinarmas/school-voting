import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { TallyController } from "./tally.controller";
import { WinnersController } from "./winners.controller";
import { WinnersService } from "./winners.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [TallyController, WinnersController],
  providers: [WinnersService],
})
export class WinnersModule {}
