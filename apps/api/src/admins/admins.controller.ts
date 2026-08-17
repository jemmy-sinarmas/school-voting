import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminRole } from "@school-voting/shared";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { RolesGuard } from "../auth/admin/roles.guard";
import { Roles } from "../auth/admin/roles.decorator";
import { AdminsService } from "./admins.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";

@Controller("admin/admins")
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly service: AdminsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  create(@Body() dto: CreateAdminDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles(AdminRole.SUPER_ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateAdminDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Patch(":id/reset-password")
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Param("id") id: string, @Body() dto: ResetAdminPasswordDto) {
    return this.service.resetPassword(id, dto.newPassword);
  }
}
