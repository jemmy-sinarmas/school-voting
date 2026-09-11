import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
