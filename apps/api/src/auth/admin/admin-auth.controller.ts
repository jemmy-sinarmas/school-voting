import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";

// No self-service forgot-password here: admin passwords can only be reset
// by a super admin via /admin/admins/:id/reset-password.
@Controller("auth/admin")
@UseGuards(ThrottlerGuard)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.service.login(dto);
  }
}
