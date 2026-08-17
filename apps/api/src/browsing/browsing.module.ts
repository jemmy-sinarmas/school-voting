import { Module } from "@nestjs/common";
import { StudentAuthModule } from "../auth/student/student-auth.module";
import { BrowsingController } from "./browsing.controller";
import { BrowsingService } from "./browsing.service";

@Module({
  imports: [StudentAuthModule],
  controllers: [BrowsingController],
  providers: [BrowsingService],
})
export class BrowsingModule {}
