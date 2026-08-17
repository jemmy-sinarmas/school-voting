import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { WinnersService } from "./winners.service";

@Controller("admin/lists")
@UseGuards(AdminJwtAuthGuard)
export class TallyController {
  constructor(private readonly service: WinnersService) {}

  @Get(":id/tally")
  tally(@Param("id") id: string) {
    return this.service.tally(id);
  }
}
