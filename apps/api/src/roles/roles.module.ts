import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RoleManagementModule {}
