import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { CandidateListsService } from "./candidate-lists.service";
import { CreateListDto } from "./dto/create-list.dto";
import { UpdateListDto } from "./dto/update-list.dto";
import { ActivateListDto } from "./dto/activate-list.dto";

@Controller("admin/lists")
@UseGuards(AdminJwtAuthGuard)
export class CandidateListsController {
  constructor(private readonly service: CandidateListsService) {}

  @Get()
  list(@Query("year") year?: string) {
    return this.service.listByYear(year ? parseInt(year, 10) : undefined);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.getOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateListDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string, @Body() dto: ActivateListDto) {
    return this.service.activate(id, dto);
  }

  @Post(":id/close")
  close(@Param("id") id: string) {
    return this.service.close(id);
  }

  @Get(":id/turnout")
  turnout(@Param("id") id: string) {
    return this.service.turnout(id);
  }
}
