import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Controller("admin")
@UseGuards(AdminJwtAuthGuard)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get("lists/:listId/roles")
  list(@Param("listId") listId: string) {
    return this.service.listForList(listId);
  }

  @Post("lists/:listId/roles")
  create(@Param("listId") listId: string, @Body() dto: CreateRoleDto) {
    return this.service.create(listId, dto);
  }

  @Patch("roles/:roleId")
  update(@Param("roleId") roleId: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(roleId, dto);
  }

  @Delete("roles/:roleId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("roleId") roleId: string) {
    return this.service.remove(roleId);
  }
}
