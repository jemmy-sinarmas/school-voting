import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { StudentJwtAuthGuard } from "../auth/student/student-jwt-auth.guard";
import { BrowsingService } from "./browsing.service";

@Controller()
@UseGuards(StudentJwtAuthGuard)
export class BrowsingController {
  constructor(private readonly service: BrowsingService) {}

  @Get("lists/active")
  activeList() {
    return this.service.activeList();
  }

  @Get("lists/:id/candidates")
  candidates(@Param("id") id: string) {
    return this.service.candidatesForList(id);
  }

  @Get("candidates/:id")
  candidateDetail(@Param("id") id: string) {
    return this.service.candidateDetail(id);
  }

  @Get("public/winners/current")
  currentWinners() {
    return this.service.currentWinners();
  }
}
