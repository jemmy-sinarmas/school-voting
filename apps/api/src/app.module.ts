import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppConfigModule } from "./config/app-config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { StudentAuthModule } from "./auth/student/student-auth.module";
import { AdminAuthModule } from "./auth/admin/admin-auth.module";
import { AdminsModule } from "./admins/admins.module";
import { CandidateListsModule } from "./candidate-lists/candidate-lists.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { RoleManagementModule } from "./roles/roles.module";
import { StudentsModule } from "./students/students.module";
import { BrowsingModule } from "./browsing/browsing.module";
import { VotesModule } from "./votes/votes.module";
import { WinnersModule } from "./winners/winners.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    StudentAuthModule,
    AdminAuthModule,
    AdminsModule,
    CandidateListsModule,
    CandidatesModule,
    RoleManagementModule,
    StudentsModule,
    BrowsingModule,
    VotesModule,
    WinnersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
