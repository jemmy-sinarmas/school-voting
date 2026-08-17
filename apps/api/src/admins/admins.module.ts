import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../auth/admin/admin-auth.module";
import { AdminsController } from "./admins.controller";
import { AdminsService } from "./admins.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
