import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { StudentStatus } from "@school-voting/shared";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { StudentsService } from "./students.service";
import { UpdateStudentStatusDto } from "./dto/update-student-status.dto";

@Controller("admin/students")
@UseGuards(AdminJwtAuthGuard)
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  list(@Query("status") status?: string, @Query("search") search?: string) {
    const validStatus =
      status === StudentStatus.ACTIVE || status === StudentStatus.DISABLED || status === StudentStatus.PENDING_VERIFICATION
        ? (status as StudentStatus)
        : undefined;
    return this.service.list({ status: validStatus, search });
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body() dto: UpdateStudentStatusDto) {
    return this.service.setStatus(id, dto.status);
  }
}
