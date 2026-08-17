import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AdminJwtAuthGuard } from "../auth/admin/admin-jwt-auth.guard";
import { CandidatesService, MediaField } from "./candidates.service";
import { CreateCandidateDto } from "./dto/create-candidate.dto";
import { UpdateCandidateDto } from "./dto/update-candidate.dto";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // video cap; per-field limits enforced in the service

@Controller("admin/candidates")
@UseGuards(AdminJwtAuthGuard)
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}

  @Get()
  list(@Query("listId") listId: string) {
    return this.service.listForList(listId);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.service.getOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/media/:field")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } }))
  uploadMedia(@Param("id") id: string, @Param("field") field: MediaField, @UploadedFile() file: Express.Multer.File) {
    return this.service.uploadMedia(id, field, file);
  }
}
