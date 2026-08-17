import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { StudentJwtAuthGuard } from "../auth/student/student-jwt-auth.guard";
import { CurrentStudent } from "../auth/student/current-student.decorator";
import { StudentJwtPayload } from "../auth/student/student-jwt.strategy";
import { VotesService } from "./votes.service";
import { VoteDto } from "./dto/vote.dto";

@Controller("votes")
@UseGuards(StudentJwtAuthGuard)
export class VotesController {
  constructor(private readonly service: VotesService) {}

  @Get("mine")
  async mine(@CurrentStudent() student: StudentJwtPayload, @Query("listId") listId: string) {
    const candidateIds = await this.service.myVotes(student.sub, listId);
    return { candidateIds };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  vote(@CurrentStudent() student: StudentJwtPayload, @Body() dto: VoteDto) {
    return this.service.vote(student.sub, dto.candidateId);
  }

  @Delete(":candidateId")
  @HttpCode(HttpStatus.NO_CONTENT)
  unvote(@CurrentStudent() student: StudentJwtPayload, @Param("candidateId") candidateId: string) {
    return this.service.unvote(student.sub, candidateId);
  }
}
