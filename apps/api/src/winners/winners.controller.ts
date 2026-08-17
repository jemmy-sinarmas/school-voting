import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { CurrentAdmin } from "../auth/admin/current-admin.decorator";
import { AdminJwtPayload } from "../auth/admin/admin-jwt.strategy";
import { WinnersService } from "./winners.service";
import { PromoteWinnersDto } from "./dto/promote-winners.dto";

@Controller("admin/winners")
@UseGuards(AdminJwtAuthGuard)
export class WinnersController {
  constructor(private readonly service: WinnersService) {}

  @Post("promote")
  promote(@CurrentAdmin() admin: AdminJwtPayload, @Body() dto: PromoteWinnersDto) {
    return this.service.promote(dto, admin.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  unpublish(@Param("id") id: string) {
    return this.service.unpublish(id);
  }
}
